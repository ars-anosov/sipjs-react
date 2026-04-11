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

  PHONECTL_SESSION_IN,
  PHONECTL_SESSION_OUT,

  PHONECTL_STORE_VALUE,

  PHONECTL_ERROR_ALERT,
} from '../constants/all'

const initialState = {
  // sip.js
  userAgentOptions  : null,
  sessionOptions    : null,
  userAgent         : null,
  registerer        : null,
  audioLocalIn      : null,
  audioLocalOut     : null,
  audioRemote       : null,
  remoteStream      : null,
  incomingSession   : null,
  outgoingSession   : null,


  // --- UI ---
  // MenuAppBar
  displayReg        : true,
  displayPad        : false,
  displayControl    : true,
  displayHistory    : false,
  // PhoneReg form fields
  uriHost           : localStorage.getItem('uriHost') ? localStorage.getItem('uriHost') : '',
  wssPort           : localStorage.getItem('wssPort') ? localStorage.getItem('wssPort') : '',
  callerUserNum     : localStorage.getItem('callerUserNum') ? localStorage.getItem('callerUserNum') : '',
  regUserPass       : '',
  calleePhoneNum    : '',
  // PhoneIco + PhonePad
  regNow            : false,
  connectStatus     : '',
  phoneHeader       : 'Не зарегистрирован',
  icoHeader         : 'Не зарегистрирован',
  incomeDisplay     : false,
  incomeCallNow     : false,
  outgoCallNow      : false,
  // PhoneHistory
  callsArr          : [],
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
        'audioLocalIn'    : action.payload.audioLocalIn,
        'audioLocalOut'   : action.payload.audioLocalOut,
        'audioRemote'     : action.payload.audioRemote,
        'remoteStream'    : action.payload.remoteStream,
        'userAgentOptions': action.payload.userAgentOptions,
        'sessionOptions'  : action.payload.sessionOptions,
        'userAgent'       : action.payload.userAgent,
        'registerer'      : action.payload.registerer,
        'regNow'          : action.payload.regNow,
        'displayReg'      : false,
        'displayPad'      : true,
        'displayHistory'  : true,
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
        'userAgent'         : null,
        'registerer'        : null,
        'userAgentOptions'  : null,
        'sessionOptions'    : null,
        'audioLocalIn'      : null,
        'audioLocalOut'     : null,
        'audioRemote'       : null,
        'remoteStream'      : null,
        'incomingSession'   : null,
        'outgoingSession'   : null,
        'connectStatus'     : '',
        'regNow'            : false,
        'phoneHeader'       : 'Не зарегистрирован',
        'icoHeader'         : 'Не зарегистрирован',
        'displayReg'        : true,
        'displayPad'        : false,
        'displayHistory'    : false,
        'incomeDisplay'     : false,
        'outgoCallNow'      : false,
        'incomeCallNow'     : false,
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
        'errComponent'      : action.payload.errComponent,
        'errText'           : action.payload.errText,
      }

    case PHONECTL_CALLLOG_UPD:
      return { ...state,
        'callsArr'          : action.payload.callsArr,
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
        'phoneHeader'     : state.callerUserNum+' ⇠ '+(state.incomingSession?.remoteIdentity?.uri?.raw?.user ?? state.calleePhoneNum),
        'icoHeader'       : (state.incomingSession?.remoteIdentity?.uri?.raw?.user ?? state.calleePhoneNum)+' ⇢ '+state.callerUserNum,
      }

    case PHONECTL_OUTGO_SUBMIT:
      return { ...state,
        'outgoCallNow'    : action.payload.outgoCallNow,
        'phoneHeader'     : state.callerUserNum+' ⇢ '+state.calleePhoneNum,
        'icoHeader'       : state.calleePhoneNum+' ⇠ '+state.callerUserNum,
      }

    case PHONECTL_SESSION_IN:
      return { ...state,
        'incomingSession'   : action.payload.incomingSession,
      }

    case PHONECTL_SESSION_OUT:
      return { ...state,
        'outgoingSession'   : action.payload.outgoingSession,
      }

    case PHONECTL_STORE_VALUE:
      return { ...state,
        [action.payload.storeDataKey]: action.payload.storeDataValue
      }

    case PHONECTL_ERROR_ALERT:
      return { ...state,
        'errComponent'      : action.payload.errComponent,
        'errText'           : action.payload.errText,
      }

    default:
      return state;
  }

}
