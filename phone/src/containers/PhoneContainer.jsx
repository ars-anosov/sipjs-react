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

  const commonProps = useMemo(() => ({ phoneControlRdcr, phoneControlActions }), [phoneControlRdcr, phoneControlActions])
  const authProps = useMemo(() => ({ authControlRdcr, authControlActions }), [authControlRdcr, authControlActions])

  const { displayAd } = authControlRdcr
  const { displayReg, displayPad, displayHistory, displayChat, errComponent } = phoneControlRdcr

  // Стили для оверлеев
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
    // Задаем minHeight и flex-центрирование для самого родителя
    <Box 
      sx={{ 
        position: 'relative', 
        width: '100%', 
        minHeight: '400px', // Гарантирует минимальную высоту, чтобы "центр" не схлопывался в 0
        display: 'flex',
        alignItems: 'center', // Центрирует содержимое, если оно меньше minHeight
        justifyContent: 'center'
      }}
    >
      
      {/* Центрирование AuthAd */}
      {displayAd && (
        <Box sx={centerOverlayStyle}>
          <AuthAd {...authProps} />
        </Box>
      )}

      {/* Центрирование PhoneReg */}
      {(displayReg || errComponent === 'PhoneReg') && (
        <Box sx={centerOverlayStyle}>
          <PhoneReg {...commonProps} />
        </Box>
      )}

      {/* Основная сетка интерфейса */}
      <Grid container spacing={2} sx={{ justifyContent: 'center', alignItems: 'center', width: '100%' }}>
        
        {/* Телефон*/}
        <Grid size={{ xs: 12, md: 'auto' }}>
          {(displayPad || errComponent === 'PhonePad') && (
            <PhonePad {...commonProps} showInput />
          )}
        </Grid>

        {/* История */}
        {(displayHistory || errComponent === 'PhoneHistory') && (
          <Grid size={{ xs: 12, md: 'auto' }}>
            <PhoneHistory {...commonProps} />
          </Grid>
        )}

        {/* Чат */}
        {(displayChat || errComponent === 'PhoneChat') && (
          <Grid size={{ xs: 12, md: 'auto' }}>
            <PhoneChat {...commonProps} />
          </Grid>
        )}
      </Grid>
    </Box>
  )
}

export default PhoneContainer
