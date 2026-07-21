import { useState, useEffect } from 'react'
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

function PhoneIco({ phoneControlRdcr }) {

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhoneIco MOUNT')

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhoneIco UNMOUNT')
    }
  }, [])

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

    // Статусы подключения
    switch (phoneControlRdcr.connectStatus) {
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
        return {
          icon: <IconPhoneEnabled />,
          bg: 'rgba(255, 255, 255, 0.2)',
          color: '#fff',
          pulse: false
        }
    }

    // Регистрация по итогу
    if (phoneControlRdcr.regNow) {
      return {
        icon: <IconPhoneEnabled />,
        bg: 'rgba(255, 255, 255, 0.2)',
        color: '#fff',
        pulse: false
      }
    }
    else {
      return { 
        icon: <IconDialerSip />, 
        bg: 'rgba(0, 0, 0, 0.2)',
        color: 'rgba(0, 0, 0, 0.4)',
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
        width: 40,
        height: 40,
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
          fontSize: '1.6rem',
        }
      }}
    >
      {cfg.icon}
    </IconButton>
  )
}

PhoneIco.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
}

export default PhoneIco
