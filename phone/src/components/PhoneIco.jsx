import { useEffect, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import {
  Badge,
  IconButton,
  keyframes,
  useTheme,
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
  const swRegistrationRef = useRef(null); // Ссылка на регистрацию воркера

  // 1. Регистрация Service Worker и запрос прав
  useEffect(() => {
    if (import.meta.env.DEV) console.log('PhoneIco MOUNT');

    // Регистрируем воркер, если он поддерживается браузером
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then((reg) => {
          swRegistrationRef.current = reg;
          if (import.meta.env.DEV) console.log('Service Worker успешно зарегистрирован');
        })
        .catch((err) => console.error('Ошибка регистрации Service Worker:', err));
    }

    // Запрашиваем права на уведомления
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      if (import.meta.env.DEV) console.log('PhoneIco UNMOUNT');
    };
  }, []);

  // 2. Отслеживание входящего звонка и показ уведомлений
  useEffect(() => {
    const incomeDisplay = phoneControlRdcr?.incomeDisplay;
    const calleePhoneNum = phoneControlRdcr?.calleePhoneNum || phoneControlRdcr?.callerNumber;

    const title = 'Входящий звонок';
    const options = {
      body: calleePhoneNum || 'Неизвестный номер',
      tag: 'incoming-call',       // Заменяет прошлые пуши, предотвращая дубликаты
      requireInteraction: true,   // Пуш не закроется сам, пока не кликнет юзер
      silent: false,              // false, чтобы Windows 11 вывела баннер на экран со звуком
      icon: 'img/PhoneIcon.png',
    };

    // Показываем уведомление, если есть входящий и права получены
    if (incomeDisplay && Notification.permission === 'granted' && swRegistrationRef.current) {
      swRegistrationRef.current.showNotification(title, options);
    }

    // Если звонок завершен/сброшен — даем команду воркеру закрыть пуш
    if (!incomeDisplay && navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({
        action: 'close-notification',
        tag: 'incoming-call'
      });
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
