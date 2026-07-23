import { useMemo }                  from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { bindActionCreators }       from 'redux'

import * as phoneActions            from '../actions/phoneControlActions.js'
import * as authActions             from '../actions/authControlActions.js'
import * as lkActions               from '../actions/lkControlActions.js'
import LkMeet                       from '../components/LkMeet.jsx'









const LkContainer = () => {
  const dispatch = useDispatch()

  const phoneControlActions = useMemo(
    () => bindActionCreators(phoneActions, dispatch),
    [dispatch]
  )
  const authControlActions = useMemo(
    () => bindActionCreators(authActions, dispatch),
    [dispatch]
  )
  const lkControlActions = useMemo(
    () => bindActionCreators(lkActions, dispatch),
    [dispatch]
  )

  const phoneControlRdcr = useSelector((state) => state.phoneControlRdcr)
  const authControlRdcr = useSelector((state) => state.authControlRdcr)
  const lkControlRdcr = useSelector((state) => state.lkControlRdcr)

  const commonProps = { phoneControlRdcr, phoneControlActions, authControlRdcr, authControlActions, lkControlRdcr, lkControlActions }

  return (
    <LkMeet {...commonProps}/>
  )
}



export default LkContainer
