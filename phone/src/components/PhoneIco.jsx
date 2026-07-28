import { useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { IconButton, keyframes, useTheme } from '@mui/material'
import {
  DialerSip as IconDialerSip,
  PhoneDisabled as IconPhoneDisabled,
  SettingsPhone as IconSettingsPhone,
  RingVolume as IconRingVolume,
  PhoneEnabled as IconPhoneEnabled
} from '@mui/icons-material';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); transform: scale(1); }
  70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); transform: scale(1.08); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); transform: scale(1); }
`;

function PhoneIco({ phoneControlRdcr }) {
  const theme = useTheme()

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhoneIco MOUNT')
    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhoneIco UNMOUNT')
    }
  }, [])

  // Кэшируем вычисления стилей и иконки
  const cfg = useMemo(() => {
    const { incomeCallNow, outgoCallNow, incomeDisplay, connectStatus, regNow } = phoneControlRdcr

    // 1. Активный разговор
    if (incomeCallNow || outgoCallNow) {
      return { Icon: IconPhoneEnabled, bg: theme.palette.success.main, color: '#fff', pulse: false }
    }

    // 2. Входящий звонок
    if (incomeDisplay) {
      return { Icon: IconRingVolume, bg: theme.palette.error.main, color: '#fff', pulse: true }
    }

    // 3. Статусы подключения
    switch (connectStatus) {
      case 'Error':
        return { Icon: IconPhoneDisabled, bg: theme.palette.error.dark, color: '#fff', pulse: false }
      case 'Reconnect':
      case 'Request':
        return { Icon: IconSettingsPhone, bg: theme.palette.warning.main, color: 'rgba(0,0,0,0.87)', pulse: false }
      case 'Success':
        return { Icon: IconPhoneEnabled, bg: 'rgba(255, 255, 255, 0.2)', color: '#fff', pulse: false }
    }

    // 4. Регистрация по итогу
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
        width: 40,
        height: 40,
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
  phoneControlRdcr: PropTypes.object.isRequired,
}

export default PhoneIco
