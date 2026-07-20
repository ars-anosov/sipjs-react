import { combineReducers }  from 'redux'
import phoneControlRdcr     from './phoneControlRdcr'
import authControlRdcr      from './authControlRdcr'

export default combineReducers({
  phoneControlRdcr,
  authControlRdcr,
})