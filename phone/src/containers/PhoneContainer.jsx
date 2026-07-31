import { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { bindActionCreators } from 'redux'
import { Grid, Box } from '@mui/material'

// Actions
import * as phoneActions from '../actions/phoneControlActions.js'
import * as authActions from '../actions/authControlActions.js'

// Components
import AuthAd from '../components/AuthAd.jsx'
import PhoneReg from '../components/PhoneReg.jsx'
import PhonePad from '../components/PhonePad.jsx'
import PhoneHistory from '../components/PhoneHistory.jsx'
import PhoneChat from '../components/PhoneChat.jsx'

const PhoneContainer = () => {
  const dispatch = useDispatch()

  const phoneControlRdcr = useSelector(state => state.phoneControlRdcr)
  const authControlRdcr = useSelector(state => state.authControlRdcr)

  const phoneControlActions = useMemo(() => bindActionCreators(phoneActions, dispatch), [dispatch])
  const authControlActions = useMemo(() => bindActionCreators(authActions, dispatch), [dispatch])

  const { displayAd } = authControlRdcr
  const { displayReg, displayPad, displayHistory, displayChat, errComponent } = phoneControlRdcr

  const isOverlayActive = displayAd || displayReg || errComponent === 'PhoneReg'

  // Стили для оверлеев вынесены из тела рендера для производительности
  const centerOverlayStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 10,
    width: 'auto',
    pointerEvents: 'auto'
  }

  return (
    <Box 
      sx={{ 
        position: 'relative', 
        width: '100%', 
        minHeight: isOverlayActive ? '400px' : 'auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      
      {/* Центрирование AuthAd */}
      {displayAd && (
        <Box sx={centerOverlayStyle}>
          <AuthAd authControlRdcr={authControlRdcr} authControlActions={authControlActions} />
        </Box>
      )}

      {/* Центрирование PhoneReg */}
      {(displayReg || errComponent === 'PhoneReg') && (
        <Box sx={centerOverlayStyle}>
          <PhoneReg phoneControlRdcr={phoneControlRdcr} phoneControlActions={phoneControlActions} />
        </Box>
      )}

      <Grid 
        container 
        spacing={2} 
        sx={{ 
          justifyContent: 'center', 
          alignItems: 'center', 
          width: '100%' 
        }}
      >
        
        {/* Телефон */}
        {(displayPad || errComponent === 'PhonePad') && (
          <Grid size={{ xs: 12, md: 'auto' }}>
            <PhonePad phoneControlRdcr={phoneControlRdcr} phoneControlActions={phoneControlActions} showInput />
          </Grid>
        )}

        {/* История */}
        {(displayHistory || errComponent === 'PhoneHistory') && (
          <Grid size={{ xs: 12, md: 'auto' }}>
            <PhoneHistory phoneControlRdcr={phoneControlRdcr} phoneControlActions={phoneControlActions} />
          </Grid>
        )}

        {/* Чат */}
        {(displayChat || errComponent === 'PhoneChat') && (
          <Grid size={{ xs: 12, md: 'auto' }}>
            <PhoneChat phoneControlRdcr={phoneControlRdcr} phoneControlActions={phoneControlActions} />
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default PhoneContainer
