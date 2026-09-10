const INCOMING_CALL_TAG = "incoming-call";
const INCOMING_CALL_ICON = "img/PhoneIcon.png";
const INCOMING_CALL_TITLE = "Входящий звонок";

let swRegistration = null;
let toastHandler = null;
let setupDone = false;

const emitToast = (toast) => {
  toastHandler?.(toast);
};

const registerServiceWorker = () => {
  navigator.serviceWorker
    .register("sw.js")
    .then((reg) => {
      swRegistration = reg;
      if (import.meta.env.DEV)
        console.log("Service Worker успешно зарегистрирован");
    })
    .catch((err) => {
      console.error(err);
      emitToast({
        severity: "error",
        title: "Ошибка Service Worker",
        message:
          "Не удалось запустить фоновый модуль. Попробуйте обновить страницу.",
      });
    });
};

const initPhoneNotifications = ({ onToast } = {}) => {
  toastHandler = onToast;

  if (setupDone) return;
  setupDone = true;

  const isSwSupported = "serviceWorker" in navigator;
  const isNotificationSupported = "Notification" in window;

  if (!window.isSecureContext) {
    emitToast({
      severity: "error",
      title: "Незащищенное соединение (HTTP)",
      message: "Для работы системных уведомлений о звонках обязателен HTTPS.",
    });
    return;
  }

  if (!isSwSupported || !isNotificationSupported) {
    emitToast({
      severity: "error",
      title: "Уведомления не поддерживаются",
      message:
        "Ваш браузер не поддерживает Service Worker или Notifications API.",
    });
    return;
  }

  if (Notification.permission === "denied") {
    emitToast({
      severity: "warning",
      title: "Уведомления заблокированы",
      message:
        "Нажмите на значок в начале адресной строки и разрешите «Уведомления».",
    });
    // Воркер всё равно регистрируем, чтобы он был готов, если пользователь вернет права
    registerServiceWorker();
  } else if (Notification.permission === "default") {
    // Запрашиваем права
    Notification.requestPermission().then((permission) => {
      if (permission === "denied") {
        emitToast({
          severity: "warning",
          title: "Уведомления отклонены",
          message:
            "Вы запретили уведомления. Звонки не будут отображаться в фоне.",
        });
      }
      // Независимо от выбора (разрешил или запретил) регистрируем воркер
      registerServiceWorker();
    });
  } else {
    // Если права уже были даны (Notification.permission === 'granted')
    registerServiceWorker();
  }
};

const disposePhoneNotifications = () => {
  toastHandler = null;
};

const showIncomingCallNotification = (calleePhoneNum) => {
  const options = {
    body: calleePhoneNum || "Неизвестный номер",
    tag: INCOMING_CALL_TAG,
    requireInteraction: true,
    silent: false,
    icon: INCOMING_CALL_ICON,
  };

  if (Notification.permission === "granted" && swRegistration) {
    swRegistration.showNotification(INCOMING_CALL_TITLE, options);
  }
};

const closeIncomingCallNotification = () => {
  // Используем .active, чтобы гарантировать отправку, пока идет claim()
  const activeWorker =
    swRegistration?.active || navigator.serviceWorker?.controller;

  if (activeWorker) {
    activeWorker.postMessage({
      action: "close-notification",
      tag: INCOMING_CALL_TAG,
    });
  }
};

export {
  closeIncomingCallNotification,
  disposePhoneNotifications,
  initPhoneNotifications,
  showIncomingCallNotification,
};
