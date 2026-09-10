import {
  DialerSip as IconDialerSip,
  Phone as IconPhone,
  PhoneDisabled as IconPhoneDisabled,
  PhoneInTalk as IconPhoneInTalk,
  SettingsPhone as IconSettingsPhone,
} from "@mui/icons-material";
import {
  Alert,
  AlertTitle,
  Badge,
  IconButton,
  keyframes,
  Snackbar,
  useTheme,
} from "@mui/material";
import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import {
  closeIncomingCallNotification,
  disposePhoneNotifications,
  initPhoneNotifications,
  showIncomingCallNotification,
} from "../services/phoneNotifications";

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); transform: scale(1); }
  70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); transform: scale(1.08); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); transform: scale(1); }
`;

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
    const calleePhoneNum =
      phoneControlRdcr?.calleePhoneNum || phoneControlRdcr?.callerNumber;

    if (phoneControlRdcr?.incomeDisplay) {
      showIncomingCallNotification(calleePhoneNum);
    } else {
      closeIncomingCallNotification();
    }
  }, [
    phoneControlRdcr?.incomeDisplay,
    phoneControlRdcr?.calleePhoneNum,
    phoneControlRdcr?.callerNumber,
  ]);

  // Кэшируем вычисления стилей и иконки
  const cfg = useMemo(() => {
    const {
      incomeCallNow,
      outgoCallNow,
      incomeDisplay,
      connectStatus,
      regNow,
    } = phoneControlRdcr;

    if (incomeCallNow || outgoCallNow) {
      return {
        Icon: IconPhoneInTalk,
        bg: theme.palette.success.main,
        color: "#fff",
        pulse: false,
      };
    }

    if (incomeDisplay) {
      return {
        Icon: IconPhoneInTalk,
        bg: theme.palette.success.main,
        color: "#fff",
        pulse: true,
      };
    }

    switch (connectStatus) {
      case "Error":
        return {
          Icon: IconPhoneDisabled,
          bg: theme.palette.error.dark,
          color: "#fff",
          pulse: false,
        };
      case "Reconnect":
      case "Request":
        return {
          Icon: IconSettingsPhone,
          bg: theme.palette.warning.main,
          color: "rgba(0,0,0,0.87)",
          pulse: false,
        };
      case "Success":
        return {
          Icon: IconPhone,
          bg: "rgba(255, 255, 255, 0.2)",
          color: "#fff",
          pulse: false,
        };
    }

    if (regNow) {
      return {
        Icon: IconPhone,
        bg: "rgba(255, 255, 255, 0.2)",
        color: "#fff",
        pulse: false,
      };
    }

    return {
      Icon: IconDialerSip,
      bg: "rgba(0, 0, 0, 0.2)",
      color: "rgba(0, 0, 0, 0.4)",
      pulse: false,
    };
  }, [phoneControlRdcr, theme]);

  const { Icon, bg, color, pulse: isSwelling } = cfg;
  const totalUnread =
    Number(phoneControlRdcr?.callUnread || 0) +
    Number(phoneControlRdcr?.chatUnread || 0);

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
            border: "1px solid rgba(255,255,255,0.3)",
            animation: isSwelling ? `${pulse} 1.5s infinite` : "none",
            transition: "all 0.2s ease-in-out",
            "&:hover": {
              backgroundColor: bg,
              filter: "brightness(1.1)",
              transform: "translateY(-1px)",
            },
            "& .MuiSvgIcon-root": {
              fontSize: "1.6rem",
            },
          }}
        >
          <Icon />
        </IconButton>
      </Badge>

      <Snackbar
        open={toast.open}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Alert
          onClose={handleCloseToast}
          severity={toast.severity}
          sx={{ width: "100%" }}
        >
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
    regNow: PropTypes.bool,
    callerName: PropTypes.string,
    callerNumber: PropTypes.string,
    calleePhoneNum: PropTypes.string,
    callUnread: PropTypes.number,
    chatUnread: PropTypes.number,
  }).isRequired,
};

export default PhoneIco;
