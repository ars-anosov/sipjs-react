import { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { bindActionCreators } from 'redux'

import * as lkControlActions from '../actions/lkControlActions.js'
import LkToken from '../components/LkToken.jsx'

const LkContainer = () => {
  const dispatch = useDispatch()
  const lkControlRdcr = useSelector(state => state.lkControlRdcr)
  const lkControlActionCreators = useMemo(
    () => bindActionCreators(lkControlActions, dispatch),
    [dispatch]
  )

  return (
    (lkControlRdcr.displayLkToken) && (
      <LkToken
        lkControlRdcr={lkControlRdcr}
        lkControlActions={lkControlActionCreators}
      />
    )
  )
}

export default LkContainer
