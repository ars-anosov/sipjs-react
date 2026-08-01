import {
  PHONECTL_CONNECT_REQUEST,
  PHONECTL_CONNECT_SUCCESS,
  PHONECTL_CONNECT_ERROR,
  PHONECTL_UNREGISTER,
  PHONECTL_RECONNECT_TRY,

  PHONECTL_CLK_RESET,
  PHONECTL_CALLLOG_UPD,

  PHONECTL_INCOME_DISPLAY,
  PHONECTL_INCOME_SUBMIT,
  PHONECTL_OUTGO_SUBMIT,

  PHONECTL_STORE_VALUE,

  PHONECTL_ERROR_ALERT,
  PHONECTL_MESSAGE_ADD,
  PHONECTL_MESSAGE_UPDATE,
  PHONECTL_MESSAGES_LOAD,
  PHONECTL_CHAT_UNREAD_CLEAR,
  PHONECTL_CLEAR_CHAT,
} from '../constants/redux'

import { CALLS_STORAGE_KEY } from '../constants/storage'

const parseUriWebRtcValue = function(uriWebRtc = '') {
  return typeof uriWebRtc === 'string' ? uriWebRtc.trim() : ''
}

const getUnreadMissedCallsCount = function(callsArr = []) {
  return (callsArr || []).filter((row) => {
    const flow = String(row?.flow || '').toLowerCase()
    const state = String(row?.callState || '').toLowerCase()
    return row?.read === false && flow.includes('in') && state.includes('lost')
  }).length
}

const persistCallsArr = function(callsArr = []) {
  const storageObject = (callsArr || []).reduce((accumulator, row) => {
    accumulator[row.id] = row
    return accumulator
  }, {})

  localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(storageObject))
}

const initialState = {
  // --- UI ---
  // MenuAppBar
  displayReg        : true,
  displayPad        : false,
  displayControl    : true,
  displayDir        : false,
  displayHistory    : false,
  displayChat       : false,
  // PhoneReg form fields
  uriWebRtc         : parseUriWebRtcValue(localStorage.getItem('uriWebRtc')),
  callerUserNum     : localStorage.getItem('callerUserNum') ? localStorage.getItem('callerUserNum') : '',
  regUserPass       : '',
  useIce            : localStorage.getItem('useIce') === null ? true : localStorage.getItem('useIce') === 'true',
  calleePhoneNum    : '',
  addPrefix         : false,
  calleePrefix      : '1999',
  // PhoneIco + PhonePad
  regNow            : false,
  connectStatus     : '',
  phoneHeader       : 'Не зарегистрирован',
  icoHeader         : 'Не зарегистрирован',
  incomeDisplay     : false,
  incomeCallNow     : false,
  outgoCallNow      : false,
  callHoldNow       : false,
  // PhoneHistory
  callsArr          : [],
  callUnread        : 0,
  // PhoneChat
  chatMessages      : [],
  chatUnread        : 0,
  // Error alert
  errComponent      : '',
  errText           : '',
}



export default function phoneControlRdcr(state = initialState, action) {
  const stateClone = { ...state }

  switch (action.type) {
    case PHONECTL_CONNECT_REQUEST:
      return { ...state,
        'connectStatus'     : 'Request',
        'phoneHeader'       : action.payload.phoneHeader,
        'icoHeader'     : action.payload.icoHeader,
      }

    case PHONECTL_CONNECT_SUCCESS:
      return { ...state,
        'connectStatus'   : 'Success',
        'regNow'          : action.payload.regNow,
        'displayReg'      : false,
        'displayPad'      : true,
        'displayHistory'  : false,
        'displayChat'     : false,
        'phoneHeader'     : action.payload.phoneHeader,
        'icoHeader'       : action.payload.icoHeader,
      }

    case PHONECTL_CONNECT_ERROR:
      return { ...state,
        'connectStatus'   : 'Error',
        'regNow'          : action.payload.regNow,
        'phoneHeader'     : action.payload.phoneHeader,
        'icoHeader'       : action.payload.icoHeader,
      }

    case PHONECTL_UNREGISTER:
      return { ...state,
        'connectStatus'     : '',
        'regNow'            : false,
        'phoneHeader'       : 'Не зарегистрирован',
        'icoHeader'         : 'Не зарегистрирован',
        'displayReg'        : true,
        'displayPad'        : false,
        'displayHistory'    : false,
        'displayChat'       : false,
        'callUnread'        : 0,
        'chatUnread'        : 0,
        'incomeDisplay'     : false,
        'outgoCallNow'      : false,
        'incomeCallNow'     : false,
        'callHoldNow'       : false,
        'calleePhoneNum'    : '',
        'errComponent'      : '',
        'errText'           : '',
      }

    case PHONECTL_RECONNECT_TRY:
      return { ...state,
        'connectStatus'     : 'Reconnect',
        'phoneHeader'       : action.payload.phoneHeader,
        'icoHeader'         : action.payload.icoHeader,
      }

    case PHONECTL_CLK_RESET:
      return { ...state,
        'connectStatus'     : '',
        'phoneHeader'       : action.payload.phoneHeader,
        'icoHeader'         : action.payload.icoHeader,
        'calleePhoneNum'    : action.payload.calleePhoneNum,
        'incomeDisplay'     : action.payload.incomeDisplay,
        'incomeCallNow'     : action.payload.incomeCallNow,
        'outgoCallNow'      : action.payload.outgoCallNow,
        'callHoldNow'       : false,
        'errComponent'      : action.payload.errComponent,
        'errText'           : action.payload.errText,
      }

    case PHONECTL_CALLLOG_UPD: {
      const visibleCallsArr = (action.payload.callsArr || []).map((row) => {
        if (state.displayHistory && row?.read === false) {
          return { ...row, read: true }
        }

        return row
      })
      const nextCallUnread = state.displayHistory
        ? 0
        : getUnreadMissedCallsCount(visibleCallsArr)

      if (state.displayHistory) {
        persistCallsArr(visibleCallsArr)
      }

      return { ...state,
        'callsArr'          : visibleCallsArr,
        'callUnread'        : nextCallUnread,
      }
    }

    case PHONECTL_INCOME_DISPLAY:
      return { ...state,
        'incomeDisplay'   : true,
        'phoneHeader'     : state.callerUserNum+' ⇠ '+action.payload.calleePhoneNum,
        'icoHeader'       : action.payload.calleePhoneNum+' ⇢ '+state.callerUserNum,
        'calleePhoneNum'  : action.payload.calleePhoneNum,
      }

    case PHONECTL_INCOME_SUBMIT:
      return { ...state,
        'incomeDisplay'   : false,
        'incomeCallNow'   : true,
        'callHoldNow'     : false,
        'phoneHeader'     : state.callerUserNum+' ⇠ '+state.calleePhoneNum,
        'icoHeader'       : state.calleePhoneNum+' ⇢ '+state.callerUserNum,
      }

    case PHONECTL_OUTGO_SUBMIT:
      return { ...state,
        'outgoCallNow'    : action.payload.outgoCallNow,
        'callHoldNow'     : false,
        'phoneHeader'     : state.callerUserNum+' ⇢ '+state.calleePhoneNum,
        'icoHeader'       : state.calleePhoneNum+' ⇠ '+state.callerUserNum,
      }

    case PHONECTL_STORE_VALUE: {
      return {
        ...state,
        [action.payload.storeDataKey]: action.payload.storeDataValue,
      }
    }

    case PHONECTL_ERROR_ALERT:
      return { ...state,
        'errComponent'      : action.payload.errComponent,
        'errText'           : action.payload.errText,
      }

    case PHONECTL_MESSAGE_ADD:
      return { ...state,
        'chatMessages'  : action.payload.chatMessages,
        'chatUnread'    : state.displayChat || !action.payload.incoming
          ? state.chatUnread
          : state.chatUnread + 1,
      }

    case PHONECTL_MESSAGE_UPDATE:
      return { ...state,
        'chatMessages'  : action.payload.chatMessages,
      }

    case PHONECTL_MESSAGES_LOAD:
      return { ...state,
        'chatMessages'  : action.payload.chatMessages,
      }

    case PHONECTL_CHAT_UNREAD_CLEAR:
      return { ...state,
        'chatUnread'    : 0,
      }

    case PHONECTL_CLEAR_CHAT:
      return { ...state,
        'chatMessages'  : [],
        'chatUnread'    : 0,
      }

    default:
      return state;
  }

}
