import {
  LKTOKEN_SUBMIT_REQUEST,
  LKTOKEN_SUBMIT_SUCCESS,
  LKTOKEN_SUBMIT_ERROR,
  LKTOKEN_CLEAR,
  LK_STORE_VALUE,
} from '../constants/redux'

const handleLkTokenSubmit = function(formData = {}) {
  return async (dispatch) => {
    const num = typeof formData.num === 'string' ? formData.num.trim() : ''
    const room = typeof formData.room === 'string' ? formData.room.trim() : ''
    const uriLkToken = typeof formData.uriLkToken === 'string' ? formData.uriLkToken.trim() : ''

    if (!num || !room) {
      dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: {
          message: 'Заполните num и room.',
        },
      })
      return
    }

    if (!uriLkToken) {
      dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: {
          message: 'Не задан uriLkToken.',
        },
      })
      return
    }
    localStorage.setItem('uriLkToken', formData.uriLkToken)

    dispatch({ type: LKTOKEN_SUBMIT_REQUEST })

    try {
      const response = await fetch(uriLkToken, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ num, room }),
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
        type: LKTOKEN_SUBMIT_SUCCESS,
        payload: {
          message: 'Успешно',
          responseData: responseData,
        },
      })
    } catch (error) {
    dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: {
        message: error && error.message ? error.message : 'Не удалось выполнить запрос.',
        },
    })
    }
  }
}

const handleLkTokenClear = function() {
  return (dispatch) => {
    dispatch({ type: LKTOKEN_CLEAR })
  }
}

const handleChangeStore = function(storeDataKey, storeDataValue) {
  return (dispatch) => {
    dispatch({
      type: LK_STORE_VALUE,
      payload: { storeDataKey, storeDataValue },
    })
  }
}

export {
  handleLkTokenSubmit,
  handleLkTokenClear,
  handleChangeStore,
}
