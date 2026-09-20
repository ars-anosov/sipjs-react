import {
  DialerSip as IconDialerSip,
  Phone as IconPhone,
  PhoneDisabled as IconPhoneDisabled,
  PhoneInTalk as IconPhoneInTalk,
  SettingsPhone as IconSettingsPhone,
} from "@mui/icons-material";
import { Alert, AlertTitle, alpha, Badge, IconButton, keyframes, Snackbar, Tooltip, useTheme } from "@mui/material";
import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { closeIncomingCallNotification, disposePhoneNotifications, initPhoneNotifications, showIncomingCallNotification } from "../services/phoneNotifications";

// Пульс берёт цвет из --status-pulse, который задаёт сам индикатор — так свечение
// читается на белой шапке.
const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 var(--status-pulse); transform: scale(1); }
  70% { box-shadow: 0 0 0 8px rgba(0, 0, 0, 0); transform: scale(1.04); }
  100% { box-shadow: 0 0 0 0 rgba(0, 0, 0, 0); transform: scale(1); }
`;

// Индикатор состояния SIP: цвет иконки и подложки задаёт статус,
// подпись дублирует его в tooltip и aria-label.
function PhoneIco({ phoneControlRdcr }) {
  const theme = useTheme();

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "warning", // 'error', 'warning', 'info'
    title: "",
  });
  const handleCloseToast = (_event, reason) => {
    if (reason === "clickaway") return;
    setToast((prev) => ({ ...prev, open: false }));
  };

  // 1. Инициализация Service Worker и запрос прав на уведомления
  useEffect(() => {
    if (import.meta.env.DEV) console.log("PhoneIco MOUNT");

    initPhoneNotifications({
      onToast: (next) =>
        setToast({
          open: true,
          message: next.message,
          severity: next.severity,
          title: next.title,
        }),
    });

    return () => {
      if (import.meta.env.DEV) console.log("PhoneIco UNMOUNT");
      disposePhoneNotifications();
    };
  }, []);

  // 2. Отслеживание входящего звонка и показ/скрытие уведомлений
  useEffect(() => {
    const calleePhoneNum = phoneControlRdcr?.calleePhoneNum || phoneControlRdcr?.callerNumber;

    if (phoneControlRdcr?.incomeDisplay) {
      showIncomingCallNotification(calleePhoneNum);
    } else {
      closeIncomingCallNotification();
    }
  }, [phoneControlRdcr?.incomeDisplay, phoneControlRdcr?.calleePhoneNum, phoneControlRdcr?.callerNumber]);

  // Кэшируем вычисления стилей и иконки
  const cfg = useMemo(() => {
    const { incomeCallNow, outgoCallNow, incomeDisplay, connectStatus, regState } = phoneControlRdcr;

    if (incomeCallNow || outgoCallNow) {
      return {
        Icon: IconPhoneInTalk,
        color: theme.palette.success.main,
        pulse: false,
        label: "SIP: разговор идёт",
      };
    }

    if (incomeDisplay) {
      return {
        Icon: IconPhoneInTalk,
        color: theme.palette.success.main,
        pulse: true,
        label: "SIP: входящий вызов",
      };
    }

    switch (connectStatus) {
      case "Error":
        return {
          Icon: IconPhoneDisabled,
          color: theme.palette.error.main,
          pulse: false,
          label: "SIP: нет соединения",
        };
      case "Reconnect":
      case "Request":
        return {
          Icon: IconSettingsPhone,
          color: theme.palette.warning.dark,
          pulse: true,
          label: "SIP: подключение к серверу",
        };
      case "Success":
        return {
          Icon: IconPhone,
          color: theme.palette.success.main,
          pulse: false,
          label: "SIP: соединение установлено",
        };
    }

    if (regState === "ok") {
      return {
        Icon: IconPhone,
        color: theme.palette.success.main,
        pulse: false,
        label: "SIP: зарегистрирован",
      };
    }

    return {
      Icon: IconDialerSip,
      color: theme.palette.text.secondary,
      pulse: false,
      label: "SIP: не зарегистрирован",
    };
  }, [phoneControlRdcr, theme]);

  const { Icon, color, pulse: isSwelling, label } = cfg;
  const totalUnread = Number(phoneControlRdcr?.callUnread || 0) + Number(phoneControlRdcr?.chatUnread || 0);

  return (
    <>
      {/* Отступ до подписи держит Badge: IconButton внутри него — уже второй
          элемент стека, и его собственный ml складывался с margin от Stack
          spacing (16px вместо 8px, как у AuthIco). */}
      <Badge badgeContent={totalUnread} color="error" overlap="circular" invisible={!totalUnread} sx={{ ml: 1 }}>
        <Tooltip title={label}>
          <IconButton
            size="small"
            aria-label={label}
            sx={{
              width: 42,
              height: 42,
              "--status-pulse": alpha(color, 0.45),
              color,
              backgroundColor: alpha(color, 0.12),
              border: `1px solid ${alpha(color, 0.28)}`,
              animation: isSwelling ? `${pulse} 1.4s ease-out infinite` : "none",
              transition: theme.transitions.create(["background-color", "border-color", "transform"], {
                duration: theme.transitions.duration.short,
              }),
              "&:hover": {
                backgroundColor: alpha(color, 0.2),
                borderColor: alpha(color, 0.45),
                transform: "translateY(-1px)",
              },
              "& .MuiSvgIcon-root": {
                fontSize: "1.35rem",
              },
            }}
          >
            <Icon />
          </IconButton>
        </Tooltip>
      </Badge>

      <Snackbar open={toast.open} onClose={handleCloseToast} anchorOrigin={{ vertical: "bottom", horizontal: "left" }}>
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: "100%" }}>
          <AlertTitle sx={{ fontWeight: "bold" }}>{toast.title}</AlertTitle>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}

PhoneIco.propTypes = {
  phoneControlRdcr: PropTypes.shape({
    incomeCallNow: PropTypes.bool,
    outgoCallNow: PropTypes.bool,
    incomeDisplay: PropTypes.bool,
    connectStatus: PropTypes.string,
    regState: PropTypes.oneOf(["off", "ok", "fail"]),
    callerName: PropTypes.string,
    callerNumber: PropTypes.string,
    calleePhoneNum: PropTypes.string,
    callUnread: PropTypes.number,
    chatUnread: PropTypes.number,
  }).isRequired,
};

export default PhoneIco;
