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
  displayBlock    : false,
  status          : '',

  userAgentOptions  : undefined,
  sessionOptions    : undefined,
  userAgent         : undefined,
  audioLocalIn      : undefined,
  audioLocalOut     : undefined,
  audioRemote       : undefined,
  remoteStream      : undefined,
  incomingSession   : undefined,
  outgoingSession   : undefined,

  registerDisplay : true,
  phoneHeader     : 'Не зарегистрирован',
  callerUserNum   : '',
  regUserPass     : '',
  calleePhoneNum  : '',
  incomeDisplay   : false,
  outgoCallNow    : false,
  incomeCallNow   : false,

  callsArr        : []
}


export default function phoneControlRdcr(state = initialState, action) {
  const stateClone = { ...state }

  switch (action.type) {
    case PHONECTL_CONNECT_REQUEST:
      return { ...state,
        'status'          : 'Request',
        'displayBlock'    : true,
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
        'displayBlock'    : true,
        'registerDisplay' : action.payload.registerDisplay,
        'phoneHeader'     : action.payload.phoneHeader,
      }

    case PHONECTL_CONNECT_ERROR:
      return { ...state,
        'status': 'Error',
        'displayBlock'    : true,
        'registerDisplay' : action.payload.registerDisplay,
        'phoneHeader'     : action.payload.phoneHeader,
      }

    case PHONECTL_RECONNECT_TRY:
      return { ...state,
        'status': 'Reconnect',
        'displayBlock'    : true,
        'registerDisplay' : action.payload.registerDisplay,
        'phoneHeader'     : action.payload.phoneHeader,
      }

    case PHONECTL_CLK_RESET:
      return { ...state,
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
      return { ...state, 'displayBlock': action.payload.boolVal }

    case PHONECTL_USER_INPUT:
      stateClone[action.payload.storeDataKey] = action.payload.storeDataValue
      return stateClone

    default:
      return state;
  }

}