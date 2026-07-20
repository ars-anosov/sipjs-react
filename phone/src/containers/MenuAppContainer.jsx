import { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as phoneActions from '../actions/phoneControlActions.js'
import MenuAppBar from '../components/MenuAppBar.jsx'



const MenuAppContainer = () => {
  const dispatch = useDispatch()
  const phoneControlActions = useMemo(
    () => bindActionCreators(phoneActions, dispatch),
    [dispatch]
  )
  const phoneControlRdcr = useSelector((state) => state.phoneControlRdcr)
  const authControlRdcr = useSelector((state) => state.authControlRdcr)
  const commonProps = { phoneControlRdcr, phoneControlActions, authControlRdcr }

  return <MenuAppBar {...commonProps} />
}

export default MenuAppContainer
