import axios from 'axios' // Импортируем Axios

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
      // Отправляем POST запрос через Axios с таймаутом 10 секунд
      const response = await axios.post(uriAdAuth, { login, password }, { timeout: 10000 })
      
      // Axios автоматически парсит JSON и кладет его в response.data
      const responseData = response.data

      // При успешном ответе (статусы 2xx) сохраняем логин в localStorage
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
        uriHost: state.phoneControlRdcr.uriHost,
        wssPort: state.phoneControlRdcr.wssPort,
      }

      dispatch(handleClkRegister(formDataForSip, state.phoneControlRdcr))
      // END OF Воздействие на компоненту PhoneReg

    } catch (error) {
      let detailMessage = 'Не удалось выполнить запрос.'

      if (error.response) {
        // Сервер ответил кодом ошибки (4xx, 5xx)
        const serverData = error.response.data
        detailMessage = serverData && typeof serverData === 'object'
          ? (serverData.message || serverData.error || serverData.detail || JSON.stringify(serverData))
          : String(serverData || error.response.statusText || detailMessage)
      } else if (error.request) {
        // Запрос был отправлен, но ответ не получен (например, таймаут или упала сеть)
        detailMessage = error.code === 'ECONNABORTED' 
          ? 'Время ожидания запроса истекло. Сервер не отвечает.' 
          : 'Сетевая ошибка. Проверьте подключение к интернету.'
      } else {
        // Произошло что-то непредвиденное при настройке запроса
        detailMessage = error.message || detailMessage
      }

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
