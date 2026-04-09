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

// sip.js
// https://github.com/onsip/SIP.js/blob/main/docs/api.md
import {
  // Invitation,
  Inviter,
  // InviterOptions,
  Registerer,
  // RegistererOptions,
  // Session,
  SessionState,
  UserAgent,
  // UserAgentOptions,
  // InvitationAcceptOptions
} from "sip.js"

/** Добровольный unregister + stop: не слать PHONECTL_CONNECT_ERROR «Disconnected» и не reconnect. */
let suppressReconnectOnNextDisconnect = false

// https://sipjs.com/guides/end-call/
const endCall = function(session) {
  switch(session.state) {
    case SessionState.Initial:
    case SessionState.Establishing:
      if (session instanceof Inviter) {
        // An unestablished outgoing session
        session.cancel();
      } else {
        // An unestablished incoming session
        session.reject();
      }
      break;
    case SessionState.Established:
      // An established session
      session.bye();
      break;
    case SessionState.Terminating:
    case SessionState.Terminated:
      // Cannot terminate a session that is already terminated
      break;
  }
}

// https://sipjs.com/guides/attach-media/
const clearRemoteStream = function(remoteStream) {
  remoteStream.getTracks().forEach((track) => {
    remoteStream.removeTrack(track)
    track.stop()
  })
}

const setupRemoteMedia = function(session, mediaElement, remoteStream) {
  clearRemoteStream(remoteStream)
  session.sessionDescriptionHandler.peerConnection.getReceivers().forEach((receiver) => {
    if (receiver.track) {
      remoteStream.addTrack(receiver.track);
    }
  });
  mediaElement.srcObject = remoteStream;
  mediaElement.play();
}

const cleanupMedia = function(mediaElement, audioLocalIn, audioLocalOut) {
  if (mediaElement.srcObject instanceof MediaStream) {
    clearRemoteStream(mediaElement.srcObject)
  }
  mediaElement.srcObject = null
  mediaElement.pause()
  audioLocalIn.pause()
  audioLocalOut.pause()
}

const logCall = function(session, callState, direction) {
  const log = {
    id   : session.id,
    clid : session.displayName,
    uri  : session.remoteIdentity.uri.raw.user+(session.remoteIdentity.displayName ? ' "'+session.remoteIdentity.displayName+'"' : ''),
    time : new Date().getTime()
  }
  let calllog = JSON.parse(localStorage.getItem('sipCalls'))
  if (!calllog) { calllog = {} }

  if (!calllog.hasOwnProperty(session.id)) {
    calllog[log.id] = {
      id    : log.id,
      clid  : log.clid,
      uri   : log.uri,
      start : log.time,
      flow  : direction
    }
  }

  if (callState === 'complete') {
    calllog[log.id].stop = log.time
  }

  if (callState === 'complete' && calllog[log.id].callState === 'ringing') {
      calllog[log.id].callState = 'lost'
  } else {
      calllog[log.id].callState = callState
  }

  localStorage.setItem('sipCalls', JSON.stringify(calllog))
}

const CallsArrUpdate = function() {
  return (dispatch) => {
    let calllog = JSON.parse(localStorage.getItem('sipCalls'))
    const rows = []

    if (calllog !== null) {
      for (const calllogObj in calllog) {
        rows.push(calllog[calllogObj])
      }
    }

    // Удаляю первую строчку лога (самую старую)
    if (rows.length > 10) {
      delete calllog[rows[0].id]
      localStorage.setItem('sipCalls', JSON.stringify(calllog))
    }

    rows.sort((a, b) => a.start > b.start ? -1 : 1)
    dispatch({
      type: PHONECTL_CALLLOG_UPD,
      payload: {
        'callsArr' : rows,
      }
    })
  }
}



const handleClkRegister = function(formData, rdcr) {
  return (dispatch) => {
    const regAlert = (errText) => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: 'PhoneReg',
          errText,
        },
      })
    }

    const clearRegAlert = () => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: '',
          errText: '',
        },
      })
    }

    // Checks
    if (!formData.uriHost || !formData.wssPort || !formData.callerUserNum || !formData.regUserPass) {
      regAlert('Заполните все поля.')
      return
    }
    localStorage.setItem('uriHost', formData.uriHost)
    localStorage.setItem('wssPort', formData.wssPort)
    localStorage.setItem('callerUserNum', formData.callerUserNum)
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: {'storeDataKey': 'uriHost', 'storeDataValue': formData.uriHost}
    })
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: {'storeDataKey': 'wssPort', 'storeDataValue': formData.wssPort}
    })
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: {'storeDataKey': 'callerUserNum', 'storeDataValue': formData.callerUserNum}
    })



    const uriStr = "sip:"+formData.callerUserNum+"@"+formData.uriHost
    const uri = UserAgent.makeURI(uriStr)
    if (!uri) {
      regAlert('UserAgent URI:'+uriStr)
      return
    }

    clearRegAlert()

    const userAgentOptions = {
      uri,
      authorizationUsername: formData.callerUserNum,
      authorizationPassword: formData.regUserPass,
      displayName: formData.callerUserNum,
      hackIpInContact: true,
      transportOptions: {
        server: "wss://"+formData.uriHost+":"+formData.wssPort
      },
      logLevel: process.env.NODE_ENV === 'production' ? "error" : "debug"
    }

    const constrainsDefault = {
      audio: true,
      video: false,
    }

    const sessionOptions = {
      sessionDescriptionHandlerOptions: {
        constraints: constrainsDefault,
      }
    }

    const audioLocalIn = new Audio()
    audioLocalIn.preload = 'auto'
    audioLocalIn.src = 'sounds/sipjs/incoming.mp3'
    audioLocalIn.loop = true

    const audioLocalOut = new Audio()
    audioLocalOut.preload = 'auto'
    audioLocalOut.src = 'sounds/sipjs/outgoing.mp3'
    audioLocalOut.loop = true

    const audioRemote = new Audio()

    const remoteStream = new MediaStream()
    
    const userAgent = new UserAgent(userAgentOptions)



    // ------------------------------------------------------------ handling for incoming INVITE requests
    userAgent.delegate = {
      onInvite(invitation) {

        const incomingSession = invitation
        dispatch({
          type: PHONECTL_SESSION_IN,
          payload: {
            'incomingSession' : incomingSession,
          }
        })
    
        incomingSession.delegate = {
          // Handle incoming REFER request.
          onRefer(referral) {
            console.log('sip.js incomingSession <--- incoming REFER request.')
          }
        }

        incomingSession.stateChange.addListener((newState) => {
          switch (newState) {
            case SessionState.Establishing:
              // logCall
              break;
            case SessionState.Established:
              logCall(incomingSession, 'incall', 'in')
              dispatch(CallsArrUpdate())
              setupRemoteMedia(incomingSession, audioRemote, remoteStream)
              break;
            case SessionState.Terminated:
              logCall(incomingSession, 'complete', 'in')
              dispatch(CallsArrUpdate())
              cleanupMedia(audioRemote, audioLocalIn, audioLocalOut)
              const callData = {
                outgoingSession: false,
                incomingSession,
                phoneHeader: userAgentOptions.authorizationUsername,
              }
              dispatch(handleClkReset(callData, rdcr))
              break;
            default:
              break;
          }
        })

        audioLocalIn.play()
        logCall(incomingSession, 'ringing', 'in')
        dispatch(CallsArrUpdate())
        dispatch({
          type: PHONECTL_INCOME_DISPLAY,
          payload: {
            'incomeDisplay'   : true,
            'phoneHeader'     : userAgentOptions.authorizationUsername+' ⇠ '+incomingSession.remoteIdentity.uri.raw.user,
            'icoHeader'       : incomingSession.remoteIdentity.uri.raw.user+' ⇢ '+userAgentOptions.authorizationUsername,
            'calleePhoneNum'  : incomingSession.remoteIdentity.uri.raw.user,
          }
        })
      }
    }



    const registererOptions = sessionOptions
    const registerer = new Registerer(userAgent, registererOptions)



    // ------------------------------------------------------------ Handling Changes in Network State
    const reconnectionAttempts = 2
    const reconnectionDelay = 4

    let attemptingReconnection = false;
    let shouldBeConnected = true;
    let registrationInFlight = false
    let registrationAccepted = false

    const stopAfterRegistrationFailure = () => {
      shouldBeConnected = false
      suppressReconnectOnNextDisconnect = true

      return userAgent.stop().catch((e) => {
        console.log('userAgent.stop()', e)
      })
    }

    const attemptReconnection = (reconnectionAttempt = 1) => {

      if (!userAgent) {
        return;
      }

      if (!shouldBeConnected) {
        return;
      }

      if (attemptingReconnection) {
        return;
      }

      if (reconnectionAttempt > reconnectionAttempts) {
        dispatch({
          type: PHONECTL_CONNECT_ERROR,
          payload: {
            'regNow'      : false,
            'phoneHeader' : 'Disconnected',
            'icoHeader'   : 'Disconnected',
          }
        })
        return;
      }

      dispatch({
        type: PHONECTL_RECONNECT_TRY,
        payload: {
          'phoneHeader'     : 'Reconnection',
          'icoHeader'       : 'Reconnection',
        }
      })

      attemptingReconnection = true;

      setTimeout(() => {
        if (!shouldBeConnected) {
          attemptingReconnection = false
          return;
        }
        // Attempt reconnect
        userAgent.reconnect()
          .then(() => {
            // console.log('userAgent.reconnect()')
            attemptingReconnection = false
          })
          .catch((error) => {
            attemptingReconnection = false
            attemptReconnection(++reconnectionAttempt)
          });
      }, reconnectionAttempt === 1 ? 0 : reconnectionDelay * 1000)
    }

    userAgent.delegate.onConnect = () => {
      if (!shouldBeConnected || registrationAccepted || registrationInFlight) {
        return
      }

      registrationInFlight = true
      registerer.register({
        requestDelegate: {
          onAccept(response) {
            // console.log('register.onAccept()',response)
            registrationInFlight = false
            registrationAccepted = true
            dispatch({
              type: PHONECTL_CONNECT_SUCCESS,
              payload: {
                'audioLocalIn'      : audioLocalIn,
                'audioLocalOut'     : audioLocalOut,
                'audioRemote'       : audioRemote,
                'remoteStream'      : remoteStream,
                'userAgentOptions'  : userAgentOptions,
                'sessionOptions'    : sessionOptions,
                'userAgent'         : userAgent,
                'registerer'        : registerer,
                'regNow'          : true,
                'displayReg'      : false,
                'displayPad'      : true,
                'displayHistory'  : true,
                'phoneHeader'     : response.message.from.displayName,
                'icoHeader'       : response.message.from.displayName,
              }
            })
          },
          onReject(response) {
            // console.log('register.onReject()',response)
            registrationInFlight = false
            registrationAccepted = false
            dispatch({
              type: PHONECTL_CONNECT_ERROR,
              payload: {
                'regNow'          : false,
                'phoneHeader'     : response.message.statusCode+' '+response.message.reasonPhrase,
                'icoHeader'   : response.message.statusCode+' '+response.message.reasonPhrase,
              }
            })
            // Принудительно отключаю, чтобы сбросить старые атрибуты user/secret
            setTimeout(() => {
              stopAfterRegistrationFailure()
                .finally(() => {
                  dispatch({ type: PHONECTL_UNREGISTER })
                })
            }, 3000)
          },
        },
      })
      .catch((e) => {
        console.log('register.catch()',e)
        registrationInFlight = false
        registrationAccepted = false
        dispatch({
          type: PHONECTL_CONNECT_ERROR,
          payload: {
            'regNow'          : false,
            'phoneHeader'     : 'Registration error',
            'icoHeader'       : 'Registration error',
          }
        })
        // Принудительно отключаю, чтобы сбросить старые атрибуты user/secret
        setTimeout(() => {
          stopAfterRegistrationFailure()
            .finally(() => {
              dispatch({ type: PHONECTL_UNREGISTER })
            })
        }, 3000)
      })
    }

    userAgent.delegate.onDisconnect = (error) => {
      if (suppressReconnectOnNextDisconnect) {
        suppressReconnectOnNextDisconnect = false
        return
      }

      dispatch({
        type: PHONECTL_CONNECT_ERROR,
        payload: {
          'phoneHeader'     : 'Disconnected',
          'icoHeader'       : 'Disconnected',
        }
      })

      if (error) {
        // console.log('userAgent.onDisconnect(error)', error)
        attemptReconnection()
      }
    }



    dispatch({
      type: PHONECTL_CONNECT_REQUEST,
      payload: {
        'phoneHeader'       : 'UserAgent starting...',
        'icoHeader'         : 'UserAgent starting...',
      }
    })

    userAgent.start().then(() => {
      clearRegAlert()
    })
    .catch((e) => {
      shouldBeConnected = false
      dispatch({
        type: PHONECTL_CONNECT_ERROR,
        payload: {
          'regNow'          : false,
          'phoneHeader'     : 'SIP proxy WebSocket problem',
          'icoHeader'       : 'SIP proxy WebSocket problem',
        }
      })
      dispatch({ type: PHONECTL_UNREGISTER })
    })

  }
}



const handleClkUnregister = function(rdcr) {
  return (dispatch) => {
    const regAlert = (errText) => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: 'PhoneReg',
          errText,
        },
      })
    }

    const clearRegAlert = () => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: '',
          errText: '',
        },
      })
    }

    if (!rdcr.userAgent) {
      regAlert('Нет подключения к SIP.')
      return
    }
    if (!rdcr.regNow) {
      regAlert('Нет активной регистрации.')
      return
    }

    if (rdcr.outgoingSession) endCall(rdcr.outgoingSession)
    if (rdcr.incomingSession) endCall(rdcr.incomingSession)
    if (rdcr.audioLocalIn) rdcr.audioLocalIn.pause()
    if (rdcr.audioLocalOut) rdcr.audioLocalOut.pause()

    const finishStop = () => {
      suppressReconnectOnNextDisconnect = true
      return rdcr.userAgent.stop()
        .then(() => {
          dispatch({ type: PHONECTL_UNREGISTER })
          clearRegAlert()
        })
        .catch((e) => {
          console.log('userAgent.stop()', e)
          dispatch({ type: PHONECTL_UNREGISTER })
          clearRegAlert()
        })
    }

    const registerer = rdcr.registerer
    if (registerer) {
      registerer
        .unregister()
        .then(() => finishStop())
        .catch((e) => {
          console.log('unregister.catch()', e)
          return finishStop()
        })
    } else {
      finishStop()
    }
  }
}



const handleClkSubmitIn = function(rdcr) {
  return (dispatch) => {
    dispatch({
      type: PHONECTL_INCOME_SUBMIT,
      payload: {
        'incomeDisplay'   : false,
        'incomeCallNow'   : true,
        'phoneHeader'     : rdcr.callerUserNum+' ⇠ '+rdcr.incomingSession.remoteIdentity.uri.raw.user,
        'icoHeader'       : rdcr.incomingSession.remoteIdentity.uri.raw.user+' ⇢ '+rdcr.callerUserNum,
      }
    })
    rdcr.audioLocalIn.pause()
    rdcr.incomingSession.accept(rdcr.sessionOptions)
  }
}



const handleClkSubmitOut = function(calleePhoneNum, rdcr) {
  // calleePhoneNum передаю отдельным аргументом т.к. rdcr.calleePhoneNum прилетит позже при след.рендере.

  return (dispatch) => {
    const padAlert = (errText) => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: 'PhonePad',
          errText,
        },
      })
    }

    const clearPadAlert = () => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: '',
          errText: '',
        },
      })
    }

    const callee = typeof calleePhoneNum === 'string' ? calleePhoneNum.trim() : String(calleePhoneNum ?? '').trim()

    if (!rdcr.regNow) {
      padAlert('Нет регистрации. Сначала зарегистрируйтесь.')
      return
    }
    if (!rdcr.callerUserNum) {
      padAlert('Не задан внутренний номер.')
      return
    }
    if (!callee) {
      padAlert('Введите номер абонента.')
      return
    }

    const targetStr = 'sip:' + callee + '@' + rdcr.uriHost
    const target = UserAgent.makeURI(targetStr)
    if (!target) {
      padAlert('Некорректный SIP URI: ' + targetStr)
      return
    }

    clearPadAlert()

    dispatch({
      type: PHONECTL_OUTGO_SUBMIT,
      payload: {
        'outgoCallNow'    : true,
        'phoneHeader'     : rdcr.callerUserNum+' ⇢ '+callee,
        'icoHeader'       : callee+' ⇠ '+rdcr.callerUserNum,
      }
    })
    rdcr.audioLocalOut.play()

    const outgoingSession = new Inviter(rdcr.userAgent, target, rdcr.sessionOptions)
    dispatch({
      type: PHONECTL_SESSION_OUT,
      payload: {
        'outgoingSession' : outgoingSession,
      }
    })

    outgoingSession.delegate = {
      // Handle incoming REFER request.
      onRefer(referral) {
        console.log('sip.js outgoingSession <--- incoming REFER request.')
      }
    }

    outgoingSession.stateChange.addListener((newState) => {
      switch (newState) {
        case SessionState.Establishing:
          logCall(outgoingSession, 'ringing', 'out')
          dispatch(CallsArrUpdate())
          break
        case SessionState.Established:
          logCall(outgoingSession, 'incall', 'out')
          dispatch(CallsArrUpdate())
          rdcr.audioLocalOut.pause()
          setupRemoteMedia(outgoingSession, rdcr.audioRemote, rdcr.remoteStream)
          break
        case SessionState.Terminated:
          logCall(outgoingSession, 'complete', 'out')
          dispatch(CallsArrUpdate())
          cleanupMedia(rdcr.audioRemote, rdcr.audioLocalIn, rdcr.audioLocalOut)
          const callData = {
            outgoingSession,
            incomingSession: false,
            phoneHeader: rdcr.callerUserNum,
          }
          dispatch(handleClkReset(callData, rdcr))
          break
        default:
          break
      }
    })

    // Send the INVITE request
    outgoingSession.invite()
      .then(() => {
        // INVITE sent
      })
      .catch((error) => {
        console.log('inviter INVITE send ERROR !', error)
        const msg = error && typeof error.message === 'string' ? error.message : String(error)
        padAlert('Не удалось отправить вызов: ' + msg)
        const callData = {
          outgoingSession,
          incomingSession: false,
          phoneHeader: rdcr.callerUserNum,
        }
        dispatch(handleClkReset(callData, rdcr))
      })
  }
}



const handleClkReset = function(callData, rdcr) {
  return (dispatch) => {
    const { outgoingSession, incomingSession, phoneHeader } = callData
    if (outgoingSession) endCall(outgoingSession)
    if (incomingSession) endCall(incomingSession)
    if (rdcr.audioLocalIn) rdcr.audioLocalIn.pause()
    if (rdcr.audioLocalOut) rdcr.audioLocalOut.pause()

    dispatch({
      type: PHONECTL_CLK_RESET,
      payload: {
        'phoneHeader'       : phoneHeader,
        'icoHeader'         : phoneHeader,
        'calleePhoneNum'    : '',
        'incomeDisplay'     : false,
        'outgoCallNow'      : false,
        'incomeCallNow'     : false,
        'errComponent'      : '',
        'errText'           : '',
      }
    })
  }
}



const handleChangeStore = function(storeDataKey, storeDataValue) {
  return (dispatch) => {
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: {'storeDataKey': storeDataKey, 'storeDataValue': storeDataValue}
    })
  }
}



export {
  handleClkRegister,
  handleClkUnregister,
  handleClkReset,
  handleClkSubmitIn,
  handleClkSubmitOut,
  handleChangeStore,
  CallsArrUpdate
}
