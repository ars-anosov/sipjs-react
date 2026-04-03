import PropTypes from 'prop-types'
import { IconButton, keyframes, useTheme } from '@mui/material'

import IconDialerSip from '@mui/icons-material/DialerSip'
import IconPhoneDisabled from '@mui/icons-material/PhoneDisabled'
import IconSettingsPhone from '@mui/icons-material/SettingsPhone'
import IconRingVolume from '@mui/icons-material/RingVolume'
import IconPhoneEnabled from '@mui/icons-material/PhoneEnabled'

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); transform: scale(1); }
  70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); transform: scale(1.08); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); transform: scale(1); }
`;

function PhoneControlIco({ phoneControlRdcr }) {
  const theme = useTheme(); // Доступ к палитре темы

  const getStyle = () => {
    // Активный разговор
    if (phoneControlRdcr.incomeCallNow || phoneControlRdcr.outgoCallNow) {
      return { 
        icon: <IconPhoneEnabled />, 
        bg: theme.palette.success.main, 
        color: '#fff', 
        pulse: false 
      }
    }

    // Входящий звонок
    if (phoneControlRdcr.incomeDisplay) {
      return { 
        icon: <IconRingVolume />, 
        bg: theme.palette.error.main, 
        color: '#fff', 
        pulse: true 
      }
    }

    // Ошибки и статусы
    switch (phoneControlRdcr.status) {
      case 'Error':
        return {
          icon: <IconPhoneDisabled />,
          bg: theme.palette.error.dark,
          color: '#fff',
          pulse: false
        }
      case 'Reconnect':
      case 'Request':
        return {
          icon: <IconSettingsPhone />,
          bg: theme.palette.warning.main,
          color: 'rgba(0,0,0,0.87)',
          pulse: false
        }
      case 'Success':
      default:
        return {
          icon: <IconDialerSip />,
          bg: 'rgba(255, 255, 255, 0.2)',
          color: '#fff',
          pulse: false
        }
    }
  }

  const cfg = getStyle();

  return (
    <IconButton
      size="small"
      sx={{
        ml: 1,
        width: 36,
        height: 36,
        backgroundColor: cfg.bg,
        color: cfg.color,
        border: '1px solid rgba(255,255,255,0.3)',
        animation: cfg.pulse ? `${pulse} 1.5s infinite` : 'none',
        transition: 'all 0.2s ease-in-out',
        
        '&:hover': {
          backgroundColor: cfg.bg,
          filter: 'brightness(1.1)',
          transform: 'translateY(-1px)',
        },
        '& .MuiSvgIcon-root': {
          fontSize: '1.2rem',
        }
      }}
    >
      {cfg.icon}
    </IconButton>
  )
}

PhoneControlIco.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
}

export default PhoneControlIco
