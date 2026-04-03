import { useMemo }                  from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { bindActionCreators }       from 'redux'

// Actions
import * as phoneActions            from '../actions/phoneControlActions.js'

// Components
import { Box }                      from '@mui/material'
import MenuAppBar                   from '../components/MenuAppBar.jsx'
import PhoneReg                     from '../components/PhoneReg.jsx'
import PhonePad                     from '../components/PhonePad.jsx'
import PhoneHistory                 from '../components/PhoneHistory.jsx'



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
    <Box>

      <MenuAppBar {...commonProps} />

      {(phoneControlRdcr.displayReg || phoneControlRdcr.errComponent === 'PhoneReg') && (
        <PhoneReg {...commonProps} />
      )}

      {(phoneControlRdcr.displayPad || phoneControlRdcr.errComponent === 'PhonePad') && (
        <PhonePad {...commonProps} showInput={true} />
      )}

      {(phoneControlRdcr.displayHistory || phoneControlRdcr.errComponent === 'PhoneHistory') && (
        <PhoneHistory {...commonProps} />
      )}

    </Box>
  )
}

export default PhoneContainer
