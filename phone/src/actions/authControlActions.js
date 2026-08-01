import ky from 'ky'
import { getApiErrorMessage } from './utils/kyError'

import {
  AUTHCTL_SUBMIT_REQUEST,
  AUTHCTL_SUBMIT_SUCCESS,
  AUTHCTL_SUBMIT_ERROR,
  AUTHCTL_CLEAR,
  AUTHCTL_STORE_VALUE,
  
  PHONECTL_STORE_VALUE,
} from '../constants/redux'

import { handleClkRegister } from './phoneControlActions'

const handleAdRegister = function(formData = {}) {
  return async (dispatch, getState) => {
    const login = typeof formData.login === 'string' ? formData.login.trim() : ''
    const password = typeof formData.password === 'string' ? formData.password.trim() : ''
    const uriAdAuth = typeof formData.uriAdAuth === 'string' ? formData.uriAdAuth.trim() : ''

    if (!login || !password) {
      dispatch({
        type: AUTHCTL_SUBMIT_ERROR,
        payload: { message: 'Заполните логин и пароль.' },
      })
      return
    }

    if (!uriAdAuth) {
      dispatch({
        type: AUTHCTL_SUBMIT_ERROR,
        payload: { message: 'Не задан uriAdAuth.' },
      })
      return
    }
    localStorage.setItem('uriAdAuth', uriAdAuth)

    dispatch({ type: AUTHCTL_SUBMIT_REQUEST })

    try {
      const responseData = await ky.post(uriAdAuth, { 
        json: { login, password }, 
        timeout: 10000 
      }).json() // Сразу вызываем .json() для разбора тела ответа

      if (login) {
        localStorage.setItem('adLogin', login)
      }

      dispatch({
        type: AUTHCTL_SUBMIT_SUCCESS,
        payload: {
          message: 'Успешно',
          responseData: responseData,
        },
      })

      // Воздействие на компоненту PhoneReg
      dispatch({
        type: PHONECTL_STORE_VALUE,
        payload: { storeDataKey: 'callerUserNum', storeDataValue: responseData.sip_username },
      })
      dispatch({
        type: PHONECTL_STORE_VALUE,
        payload: { storeDataKey: 'regUserPass', storeDataValue: responseData.sip_secret },
      })
      dispatch({
        type: PHONECTL_STORE_VALUE,
        payload: { storeDataKey: 'displayDir', storeDataValue: true },
      })

      const state = getState()
      const formDataForSip = {
        callerUserNum: responseData.sip_username,
        regUserPass: responseData.sip_secret,
        uriWebRtc: state.phoneControlRdcr.uriWebRtc,
      }

      dispatch(handleClkRegister(formDataForSip, state.phoneControlRdcr))
      // END OF Воздействие на компоненту PhoneReg

    } catch (error) {
      const detailMessage = await getApiErrorMessage(error)
      
      dispatch({
        type: AUTHCTL_SUBMIT_ERROR,
        payload: { message: detailMessage },
      })
    }
  }
}

const handleAdAuthClear = function() {
  return (dispatch) => {
    localStorage.removeItem('adLogin')
    dispatch({ type: AUTHCTL_CLEAR })
  }
}

const handleChangeStore = function(storeDataKey, storeDataValue) {
  return (dispatch) => {
    dispatch({
      type: AUTHCTL_STORE_VALUE,
      payload: { 'storeDataKey': storeDataKey, 'storeDataValue': storeDataValue }
    })
  }
}

export {
  handleAdRegister,
  handleAdAuthClear,
  handleChangeStore
}
