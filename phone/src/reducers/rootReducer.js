import { combineReducers }  from 'redux'
import phoneControlRdcr     from './phoneControlRdcr'
import authControlRdcr      from './authControlRdcr'
import lkControlRdcr         from './lkControlRdcr'

export default combineReducers({
  phoneControlRdcr,
  authControlRdcr,
  lkControlRdcr,
})