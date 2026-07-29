import { useEffect, useMemo, useRef } from 'react'
import PropTypes from 'prop-types'
import {
  IconButton,
  keyframes,
  useTheme,
}                 from '@mui/material'
import {
  DialerSip as IconDialerSip,
  PhoneDisabled as IconPhoneDisabled,
  SettingsPhone as IconSettingsPhone,
  RingVolume as IconRingVolume,
  PhoneEnabled as IconPhoneEnabled,
}                 from '@mui/icons-material'

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); transform: scale(1); }
  70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); transform: scale(1.08); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); transform: scale(1); }
`;

function PhoneIco({ phoneControlRdcr }) {
  const theme = useTheme()
  const notificationRef = useRef(null) // Ссылка на текущее уведомление

  // 1. Запрос прав на уведомления при первом рендере
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhoneIco MOUNT')
    
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhoneIco UNMOUNT')
      // Закрываем уведомление, если компонент размонтировался
      if (notificationRef.current) notificationRef.current.close()
    }
  }, [])

  // 2. Отслеживание входящего звонка и показ уведомления
  useEffect(() => {
    const { incomeDisplay, calleePhoneNum } = phoneControlRdcr

    if (incomeDisplay && 'Notification' in window && Notification.permission === 'granted') {
      // Чтобы уведомления не плодились, закрываем предыдущее
      if (notificationRef.current) notificationRef.current.close()

      const title = 'Входящий звонок'
      const options = {
        body: calleePhoneNum || 'Неизвестный номер',
        tag: 'incoming-call', // Группирует уведомления, заменяя старые
        requireInteraction: true, // Уведомление не скроется само, пока пользователь не закроет его
        silent: true, // Отключаем стандартный системный звук (если у вас своя мелодия)
        icon: 'img/PhoneIcon.png',
      }

      notificationRef.current = new Notification(title, options)

      // При клике на уведомление переводим фокус на вкладку с приложением
      notificationRef.current.onclick = () => {
        window.focus()
        notificationRef.current.close()
      }
    }

    // Закрываем уведомление, если звонок прекратился (например, сбросили или ответили)
    if (!incomeDisplay && notificationRef.current) {
      notificationRef.current.close()
      notificationRef.current = null
    }
  }, [phoneControlRdcr.incomeDisplay, phoneControlRdcr.calleePhoneNum])

  // Кэшируем вычисления стилей и иконки
  const cfg = useMemo(() => {
    const { incomeCallNow, outgoCallNow, incomeDisplay, connectStatus, regNow } = phoneControlRdcr

    if (incomeCallNow || outgoCallNow) {
      return { Icon: IconPhoneEnabled, bg: theme.palette.success.main, color: '#fff', pulse: false }
    }

    if (incomeDisplay) {
      return { Icon: IconRingVolume, bg: theme.palette.error.main, color: '#fff', pulse: true }
    }

    switch (connectStatus) {
      case 'Error':
        return { Icon: IconPhoneDisabled, bg: theme.palette.error.dark, color: '#fff', pulse: false }
      case 'Reconnect':
      case 'Request':
        return { Icon: IconSettingsPhone, bg: theme.palette.warning.main, color: 'rgba(0,0,0,0.87)', pulse: false }
      case 'Success':
        return { Icon: IconPhoneEnabled, bg: 'rgba(255, 255, 255, 0.2)', color: '#fff', pulse: false }
    }

    if (regNow) {
      return { Icon: IconPhoneEnabled, bg: 'rgba(255, 255, 255, 0.2)', color: '#fff', pulse: false }
    }

    return { Icon: IconDialerSip, bg: 'rgba(0, 0, 0, 0.2)', color: 'rgba(0, 0, 0, 0.4)', pulse: false }
  }, [phoneControlRdcr, theme])

  const { Icon, bg, color, pulse: isSwelling } = cfg

  return (
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
  )
}

PhoneIco.propTypes = {
  phoneControlRdcr: PropTypes.shape({
    incomeCallNow: PropTypes.bool,
    outgoCallNow: PropTypes.bool,
    incomeDisplay: PropTypes.bool,
    connectStatus: PropTypes.string,
    regNow: PropTypes.bool,
    callerName: PropTypes.string,    // Добавлено для отображения имени
    callerNumber: PropTypes.string,  // Добавлено для отображения номера
  }).isRequired,
}

export default PhoneIco
