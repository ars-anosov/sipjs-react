import { useEffect, useState, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import {
  Badge,
  IconButton,
  keyframes,
  useTheme,
  Snackbar,
  Alert,
  AlertTitle,
}                 from '@mui/material'
import {
  DialerSip       as IconDialerSip,
  PhoneDisabled   as IconPhoneDisabled,
  SettingsPhone   as IconSettingsPhone,
  PhoneInTalk     as IconPhoneInTalk,
  Phone           as IconPhone,
}                 from '@mui/icons-material'

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); transform: scale(1); }
  70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); transform: scale(1.08); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); transform: scale(1); }
`;

function PhoneIco({ phoneControlRdcr }) {
  const theme = useTheme()
  const swRegistrationRef = useRef(null);

  const [toast, setToast] = useState({
    open: false,
    message: '',
    severity: 'warning', // 'error', 'warning', 'info'
    title: ''
  });
  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  // 1. Регистрация Service Worker и запрос прав
  useEffect(() => {
    if (import.meta.env.DEV) console.log('PhoneIco MOUNT');

    const isSwSupported = 'serviceWorker' in navigator;
    const isNotificationSupported = 'Notification' in window;

    // 1. Проверка поддержки браузером
    if (!isSwSupported || !isNotificationSupported) {
      setToast({
        open: true,
        title: 'Уведомления не поддерживаются',
        message: 'Ваш браузер слишком старый или запущен в режиме Инкогнито.',
        severity: 'error'
      });
      return; // Останавливаемся
    }

    // 2. Проверка HTTPS
    if (!window.isSecureContext) {
      setToast({
        open: true,
        title: 'Незащищенное соединение (HTTP)',
        message: 'Для работы системных уведомлений о звонках обязателен HTTPS.',
        severity: 'error'
      });
      return; // Останавливаемся
    }

    // Функция для регистрации воркера
    const registerSW = () => {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => {
          swRegistrationRef.current = reg;
          if (import.meta.env.DEV) console.log('Service Worker успешно зарегистрирован');
        })
        .catch((err) => {
          console.error(err);
          setToast({
            open: true,
            title: 'Ошибка Service Worker',
            message: 'Не удалось запустить фоновый модуль. Попробуйте обновить страницу.',
            severity: 'error'
          });
        });
    };

    // 3. Проверка и запрос прав + запуск регистрации
    if (Notification.permission === 'denied') {
      setToast({
        open: true,
        title: 'Уведомления заблокированы',
        message: 'Нажмите на значок в начале адресной строки и разрешите «Уведомления».',
        severity: 'warning'
      });
      // Воркер всё равно регистрируем, чтобы он был готов, если пользователь вернет права
      registerSW(); 
    } else if (Notification.permission === 'default') {
      // Запрашиваем права
      Notification.requestPermission().then((permission) => {
        if (permission === 'denied') {
          setToast({
            open: true,
            title: 'Уведомления отклонены',
            message: 'Вы запретили уведомления. Звонки не будут отображаться в фоне.',
            severity: 'warning'
          });
        }
        // Независимо от выбора (разрешил или запретил) регистрируем воркер
        registerSW();
      });
    } else {
      // Если права уже были даны (Notification.permission === 'granted')
      registerSW();
    }

    return () => {
      if (import.meta.env.DEV) console.log('PhoneIco UNMOUNT');
    };
  }, []);

  // 2. Отслеживание входящего звонка и показ/скрытие уведомлений
  useEffect(() => {
    const incomeDisplay = phoneControlRdcr?.incomeDisplay;
    const calleePhoneNum = phoneControlRdcr?.calleePhoneNum || phoneControlRdcr?.callerNumber;
    
    const title = 'Входящий звонок';
    const options = {
      body: calleePhoneNum || 'Неизвестный номер',
      tag: 'incoming-call',
      requireInteraction: true,
      silent: false,
      icon: 'img/PhoneIcon.png',
    };

    if (incomeDisplay) {
      if (Notification.permission === 'granted' && swRegistrationRef.current) {
        swRegistrationRef.current.showNotification(title, options);
      }
    } else {
      // Используем .active, чтобы гарантировать отправку, пока идет claim()
      const activeWorker = swRegistrationRef.current?.active || navigator.serviceWorker?.controller;
      
      if (activeWorker) {
        activeWorker.postMessage({ 
          action: 'close-notification', 
          tag: 'incoming-call' 
        });
      }
    }
  }, [phoneControlRdcr?.incomeDisplay, phoneControlRdcr?.calleePhoneNum, phoneControlRdcr?.callerNumber]);




  // Кэшируем вычисления стилей и иконки
  const cfg = useMemo(() => {
    const { incomeCallNow, outgoCallNow, incomeDisplay, connectStatus, regNow } = phoneControlRdcr

    if (incomeCallNow || outgoCallNow) {
      return { Icon: IconPhoneInTalk, bg: theme.palette.success.main, color: '#fff', pulse: false }
    }

    if (incomeDisplay) {
      return { Icon: IconPhoneInTalk, bg: theme.palette.success.main, color: '#fff', pulse: true }
    }

    switch (connectStatus) {
      case 'Error':
        return { Icon: IconPhoneDisabled, bg: theme.palette.error.dark, color: '#fff', pulse: false }
      case 'Reconnect':
      case 'Request':
        return { Icon: IconSettingsPhone, bg: theme.palette.warning.main, color: 'rgba(0,0,0,0.87)', pulse: false }
      case 'Success':
        return { Icon: IconPhone, bg: 'rgba(255, 255, 255, 0.2)', color: '#fff', pulse: false }
    }

    if (regNow) {
      return { Icon: IconPhone, bg: 'rgba(255, 255, 255, 0.2)', color: '#fff', pulse: false }
    }

    return { Icon: IconDialerSip, bg: 'rgba(0, 0, 0, 0.2)', color: 'rgba(0, 0, 0, 0.4)', pulse: false }
  }, [phoneControlRdcr, theme])

  const { Icon, bg, color, pulse: isSwelling } = cfg
  const totalUnread = Number(phoneControlRdcr?.callUnread || 0) + Number(phoneControlRdcr?.chatUnread || 0)

  return (
  <>
    <Badge
      badgeContent={totalUnread}
      color="error"
      overlap="circular"
      invisible={!totalUnread}
    >
      <IconButton
        size="small"
        sx={{
          ml: 1,
          width: 46,
          height: 46,
          backgroundColor: bg,
          color: color,
          border: '1px solid rgba(255,255,255,0.3)',
          animation: isSwelling ? `${pulse} 1.5s infinite` : 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: bg,
            filter: 'brightness(1.1)',
            transform: 'translateY(-1px)',
          },
          '& .MuiSvgIcon-root': {
            fontSize: '1.6rem',
          }
        }}
      >
        <Icon />
      </IconButton>
    </Badge>

    <Snackbar 
      open={toast.open} 
      onClose={handleCloseToast}
      anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
    >
      <Alert 
        onClose={handleCloseToast}
        severity={toast.severity}
        sx={{ width: '100%' }}
      >
        <AlertTitle sx={{ fontWeight: 'bold' }}>{toast.title}</AlertTitle>
        {toast.message}
      </Alert>
    </Snackbar>
  </>
  )
}

PhoneIco.propTypes = {
  phoneControlRdcr: PropTypes.shape({
    incomeCallNow: PropTypes.bool,
    outgoCallNow: PropTypes.bool,
    incomeDisplay: PropTypes.bool,
    connectStatus: PropTypes.string,
    regNow: PropTypes.bool,
    callerName: PropTypes.string,
    callerNumber: PropTypes.string,
    calleePhoneNum: PropTypes.string,
    callUnread: PropTypes.number,
    chatUnread: PropTypes.number,
  }).isRequired,
}

export default PhoneIco
