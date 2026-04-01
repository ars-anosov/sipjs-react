import {
  PHONECTL_DISPLAY_BLK,

  PHONECTL_CONNECT_REQUEST,
  PHONECTL_CONNECT_SUCCESS,
  PHONECTL_CONNECT_ERROR,
  PHONECTL_RECONNECT_TRY,

  PHONECTL_CLK_RESET,
  PHONECTL_CALLLOG_UPD,
  PHONECTL_CALEE_NUM,

  PHONECTL_INCOME_DISPLAY,
  PHONECTL_INCOME_SUBMIT,
  PHONECTL_OUTGO_SUBMIT,

  PHONECTL_SESSION_IN,
  PHONECTL_SESSION_OUT,

  PHONECTL_USER_INPUT
} from '../constants/all'

const initialState = {
    userAgentOptions  : null,
    sessionOptions    : null,
    userAgent         : null,
    audioLocalIn      : null,
    audioLocalOut     : null,
    audioRemote       : null,
    remoteStream      : null,
    incomingSession   : null,
    outgoingSession   : null,

    displayReg      : true,
    displayPad      : false,
    displayControl  : true,
    displayHistory  : false,
    phoneHeader     : 'Не зарегистрирован',
    uriHost         : localStorage.getItem('uriHost') ? localStorage.getItem('uriHost') : '',
    wssPort         : localStorage.getItem('wssPort') ? localStorage.getItem('wssPort') : '',
    callerUserNum   : localStorage.getItem('callerUserNum') ? localStorage.getItem('callerUserNum') : '',
    regUserPass     : '',
    calleePhoneNum  : '',
    incomeDisplay   : false,
    outgoCallNow    : false,
    incomeCallNow   : false,
    regNow          : false,
    callsArr        : []
}



export default function phoneControlRdcr(state = initialState, action) {
  const stateClone = { ...state }

  switch (action.type) {
    case PHONECTL_CONNECT_REQUEST:
      return { ...state,
        'status'          : 'Request',
        'displayPad'      : true,
        'userAgent'       : action.payload.userAgent,
        'audioLocalIn'    : action.payload.audioLocalIn,
        'audioLocalOut'   : action.payload.audioLocalOut,
        'audioRemote'     : action.payload.audioRemote,
        'remoteStream'    : action.payload.remoteStream,
        'phoneHeader'     : action.payload.phoneHeader,
      }

    case PHONECTL_CONNECT_SUCCESS:
      return { ...state,
        'status': 'Success',
        'displayPad'      : true,
        'displayReg'      : action.payload.displayReg,
        'phoneHeader'     : action.payload.phoneHeader,
      }

    case PHONECTL_CONNECT_ERROR:
      return { ...state,
        'status': 'Error',
        'displayPad'      : true,
        'displayReg'      : action.payload.displayReg,
        'phoneHeader'     : action.payload.phoneHeader,
      }

    case PHONECTL_RECONNECT_TRY:
      return { ...state,
        'status': 'Reconnect',
        'displayPad'      : true,
        'displayReg'      : action.payload.displayReg,
        'phoneHeader'     : action.payload.phoneHeader,
      }

    case PHONECTL_CLK_RESET:
      return { ...state,
        'status': '',
        'phoneHeader'     : action.payload.phoneHeader,
        'calleePhoneNum'  : action.payload.calleePhoneNum,
        'incomeDisplay'   : action.payload.incomeDisplay,
        'incomeCallNow'   : action.payload.outgoCallNow,
        'outgoCallNow'    : action.payload.outgoCallNow,
      }

    case PHONECTL_CALLLOG_UPD:
      return { ...state,
        'callsArr'  : action.payload.callsArr,
      }

    case PHONECTL_INCOME_DISPLAY:
      return { ...state,
        'incomeDisplay'   : action.payload.incomeDisplay,
        'phoneHeader'     : action.payload.phoneHeader,
        'calleePhoneNum'  : action.payload.calleePhoneNum,
      }

    case PHONECTL_INCOME_SUBMIT:
      return { ...state,
        'incomeDisplay' : action.payload.incomeDisplay,
        'incomeCallNow' : action.payload.incomeCallNow,
        'phoneHeader'   : action.payload.phoneHeader,
      }

    case PHONECTL_OUTGO_SUBMIT:
      return { ...state,
        'outgoCallNow'  : action.payload.outgoCallNow,
        'phoneHeader'   : action.payload.phoneHeader,
      }

    case PHONECTL_CALEE_NUM:
      return { ...state,
        'calleePhoneNum' : action.payload.calleePhoneNum,
      }

    case PHONECTL_SESSION_IN:
      return { ...state,
        'incomingSession' : action.payload.incomingSession,
      }

    case PHONECTL_SESSION_OUT:
      return { ...state,
        'outgoingSession' : action.payload.outgoingSession,
      }

    case PHONECTL_DISPLAY_BLK:
      return { ...state, 'displayPad': action.payload.boolVal }

    case PHONECTL_USER_INPUT:
      stateClone[action.payload.storeDataKey] = action.payload.storeDataValue
      return stateClone

    default:
      return state;
  }

}