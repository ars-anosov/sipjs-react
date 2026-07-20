import {
  AUTHCTL_SUBMIT_REQUEST,
  AUTHCTL_SUBMIT_SUCCESS,
  AUTHCTL_SUBMIT_ERROR,
  AUTHCTL_CLEAR,
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
        payload: {
          message: 'Заполните логин и пароль.',
        },
      })
      return
    }

    if (!uriAdAuth) {
      dispatch({
        type: AUTHCTL_SUBMIT_ERROR,
        payload: {
          message: 'Не задан uriAdAuth.',
        },
      })
      return
    }
    localStorage.setItem('uriAdAuth', formData.uriAdAuth)

    dispatch({ type: AUTHCTL_SUBMIT_REQUEST })

    try {
      const response = await fetch(uriAdAuth, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ login, password }),
      })

      let responseData = null
      const responseText = await response.text()

      if (responseText) {
        try {
          responseData = JSON.parse(responseText)
        } catch (error) {
          responseData = responseText
        }
      }

      if (!response.ok) {
        const detailMessage = responseData && typeof responseData === 'object'
          ? (responseData.message || responseData.error || responseData.detail || JSON.stringify(responseData))
          : String(responseData || response.statusText || 'Request failed')
        throw new Error(detailMessage)
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

      const state = getState()
      const formDataForSip = {
        callerUserNum: responseData.sip_username,
        regUserPass: responseData.sip_secret,
        uriHost: state.phoneControlRdcr.uriHost,
        wssPort: state.phoneControlRdcr.wssPort,
      }

      dispatch(handleClkRegister(formDataForSip, state.phoneControlRdcr))
      // END OF Воздействие на компоненту PhoneReg

    } catch (error) {
      dispatch({
        type: AUTHCTL_SUBMIT_ERROR,
        payload: {
          message: error && error.message ? error.message : 'Не удалось выполнить запрос.',
        },
      })
    }
  }
}

const handleAdAuthClear = function() {
  return (dispatch) => {
    dispatch({ type: AUTHCTL_CLEAR })
  }
}

export {
  handleAdRegister,
  handleAdAuthClear,
}
