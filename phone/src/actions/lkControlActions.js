import ky from 'ky'
import { getApiErrorMessage } from './utils/kyError'

import {
  LKTOKEN_SUBMIT_REQUEST,
  LKTOKEN_SUBMIT_SUCCESS,
  LKTOKEN_SUBMIT_ERROR,
  LKTOKEN_CLEAR,
  LK_STORE_VALUE,
} from '../constants/redux'

import {
  createChatMessage,
  getPhoneRuntime,
  transmitSipMessage,
} from './phoneRuntime'

const buildInviteSipMessageBody = function(room, responseData) {
  if (responseData && typeof responseData === 'object') {
    const lines = [`Приглашение на встречу`]
    lines.push('')
    lines.push(`<a href="/?lk_room=${room}&lk_token=${responseData.lk_token}">${room}</a>`)
    return lines.join('\n')
  }

  return `room=${room}`
}

const handleLkTokenSubmit = function(formData = {}) {
  return async (dispatch, getState) => {
    const num = typeof formData.num === 'string' ? formData.num.trim() : ''
    const room = typeof formData.room === 'string' ? formData.room.trim() : ''
    const uriLkToken = typeof formData.uriLkToken === 'string' ? formData.uriLkToken.trim() : ''

    if (!num || !room) {
      dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: { message: 'Заполните num и room.' },
      })
      return
    }

    if (!uriLkToken) {
      dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: { message: 'Не задан uriLkToken.' },
      })
      return
    }
    localStorage.setItem('uriLkToken', formData.uriLkToken)

    dispatch({ type: LKTOKEN_SUBMIT_REQUEST })

    try {
      const responseData = await ky.post(uriLkToken, { json: { num, room } }).json()

      dispatch({
        type: LKTOKEN_SUBMIT_SUCCESS,
        payload: {
          message: 'Успешно',
          responseData: responseData,
        },
      })

      // Отправка SIP MESSAGE с приглашением в комнату
      const state = getState()
      const runtime = getPhoneRuntime()
      const uriHost = state?.phoneControlRdcr?.uriHost || ''
      const canSendSipMessage = Boolean(runtime?.userAgent && uriHost && num)

      if (canSendSipMessage) {
        const chatMessage = createChatMessage(
          num,
          buildInviteSipMessageBody(room, responseData),
          'out',
          'sending',
        )

        try {
          await transmitSipMessage({ chatMessage, uriHost })
        } catch (sipError) {
          console.warn('Lk invite SIP MESSAGE send error:', sipError)
        }
      }
      // END OF Отправка SIP MESSAGE

    } catch (error) {
      const detailMessage = await getApiErrorMessage(error)

      dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: { message: detailMessage },
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
