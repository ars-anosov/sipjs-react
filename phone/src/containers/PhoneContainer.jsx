import { useMemo }                  from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { bindActionCreators }       from 'redux'

// Actions
import * as phoneActions            from '../actions/phoneControlActions.js'

// Components
import {
  Box,
  Grid
}                      							from '@mui/material'
import PhoneReg                     from '../components/PhoneReg.jsx'
import PhonePad                     from '../components/PhonePad.jsx'
import PhoneHistory                 from '../components/PhoneHistory.jsx'
import PhoneChat                    from '../components/PhoneChat.jsx'



const PhoneContainer = () => {
  const dispatch = useDispatch()
  // const phoneControlActions = bindActionCreators(phoneActions, dispatch)
  // Кэшируем экшены, чтобы не пересоздавать их при каждом рендере
  const phoneControlActions = useMemo(
    () => bindActionCreators(phoneActions, dispatch),
    [dispatch]
  )
  const phoneControlRdcr = useSelector(state => state.phoneControlRdcr)
  const commonProps = { phoneControlRdcr, phoneControlActions }



  return (
    <Grid container spacing={2} sx={{ justifyContent: 'center', width: '100%' }}>
      <Grid size={{ xs: 12, md: 'auto' }}>
        {(phoneControlRdcr.displayReg || phoneControlRdcr.errComponent === 'PhoneReg') && (
          <PhoneReg {...commonProps} />
        )}
        {(phoneControlRdcr.displayPad || phoneControlRdcr.errComponent === 'PhonePad') && (
          <PhonePad {...commonProps} showInput={true} />
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 'auto' }}>
        {(phoneControlRdcr.displayChat || phoneControlRdcr.errComponent === 'PhoneChat') && (
          <PhoneChat {...commonProps} />
        )}
      </Grid>

      <Grid size={{ xs: 12, md: 'auto' }}>
        {(phoneControlRdcr.displayHistory || phoneControlRdcr.errComponent === 'PhoneHistory') && (
          <PhoneHistory {...commonProps} />
        )}
      </Grid>
    </Grid>
  )
}

export default PhoneContainer
