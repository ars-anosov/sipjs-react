import { useEffect } from 'react'
import PropTypes from 'prop-types'
import { IconButton, keyframes, useTheme } from '@mui/material'

import IconAccountCircle from '@mui/icons-material/AccountCircle'
import IconHowToReg from '@mui/icons-material/HowToReg'
import IconAccountBox from '@mui/icons-material/AccountBox'
import IconPending from '@mui/icons-material/Pending'

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3); transform: scale(1); }
  70% { box-shadow: 0 0 0 8px rgba(255, 255, 255, 0); transform: scale(1.05); }
  100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); transform: scale(1); }
`

function AdIco({ authControlRdcr }) {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('AdIco MOUNT')

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('AdIco UNMOUNT')
    }
  }, [])

  const theme = useTheme()

  const getStyle = () => {
    switch (authControlRdcr?.status) {
      case 'loading':
        return {
          icon: <IconPending />,
          bg: theme.palette.info.main,
          color: '#fff',
          pulse: true,
        }
      case 'success':
        return {
          icon: <IconHowToReg />,
          bg: theme.palette.success.main,
          color: '#fff',
          pulse: false,
        }
      case 'error':
        return {
          icon: <IconAccountBox />,
          bg: theme.palette.error.main,
          color: '#fff',
          pulse: false,
        }
      case 'idle':
      default:
        return {
          icon: <IconAccountCircle />,
          bg: 'rgba(255, 255, 255, 0.2)',
          color: '#fff',
          pulse: false,
        }
    }
  }

  const cfg = getStyle()

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
        animation: cfg.pulse ? `${pulse} 1.2s infinite` : 'none',
        transition: 'all 0.2s ease-in-out',

        '&:hover': {
          backgroundColor: cfg.bg,
          filter: 'brightness(1.1)',
          transform: 'translateY(-1px)',
        },
        '& .MuiSvgIcon-root': {
          fontSize: '1.6rem',
        },
      }}
    >
      {cfg.icon}
    </IconButton>
  )
}

AdIco.propTypes = {
  authControlRdcr: PropTypes.object.isRequired,
}

export default AdIco
