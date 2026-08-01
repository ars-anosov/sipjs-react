import ky from 'ky'
import { getApiErrorMessage } from './utils/kyError'

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

  AUTHCTL_STORE_VALUE,
} from '../constants/redux'

import {
  getPhoneRuntime,
  setPhoneRuntime,
  resetPhoneRuntime,
  resetPhoneRuntimeSessions,
  // Media functions
  setupRemoteMedia,
  cleanupMedia,
  // Session functions
  endCall,
  getActiveSession,
  setLocalAudioEnabled,
  // Codec modifiers
  opusCodecModifier,
  // Call logging
  logCall,
  loadCallsArr,
  // Audio elements
  createAudioElements,
  createRemoteStream,
  // Connection control
  markVoluntaryDisconnect,
  getConnectionCtl,
  setConnectionCtl,
  // SIP.js types
  SessionState,
  RegistererState,
  Inviter,
  Web,
  UserAgent,
  Registerer,
  loadChatMessages,
  saveChatMessage,
  clearChatMessages,
  clearCallsArr,
  createChatMessage,
  handleIncomingSipMessage,
  transmitSipMessage,
} from './phoneRuntime'

const getUriHostFromWebRtc = function(uriWebRtc = '') {
  if (!uriWebRtc) {
    return ''
  }

  try {
    return new URL(uriWebRtc).hostname || ''
  } catch {
    const match = String(uriWebRtc).match(/^wss?:\/\/([^:/]+)/i)
    return match?.[1] || ''
  }
}

const MessagesArrUpdate = function() {
  return (dispatch) => {
    dispatch({
      type: PHONECTL_MESSAGES_LOAD,
      payload: {
        chatMessages: loadChatMessages(),
      },
    })
  }
}

const appendChatMessage = function(message, dispatch) {
  const chatMessages = saveChatMessage(message)

  dispatch({
    type: PHONECTL_MESSAGE_ADD,
    payload: {
      chatMessages,
      incoming: message.direction === 'in',
    },
  })
}

const CallsArrUpdate = function() {
  return (dispatch) => {
    dispatch({
      type: PHONECTL_CALLLOG_UPD,
      payload: {
        callsArr: loadCallsArr(),
      },
    })
  }
}



const handleClkRegister = function(formData, rdcr) {
  return (dispatch, getState) => {
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

    const normalizedUriWebRtc = typeof formData.uriWebRtc === 'string' ? formData.uriWebRtc.trim() : ''
    const uriHostFromWebRtc = getUriHostFromWebRtc(normalizedUriWebRtc)

    // Checks
    if (!normalizedUriWebRtc || !formData.callerUserNum || !formData.regUserPass) {
      regAlert('Заполните все поля.')
      return
    }
    localStorage.setItem('uriWebRtc', normalizedUriWebRtc)
    localStorage.setItem('callerUserNum', formData.callerUserNum)
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: {'storeDataKey': 'uriWebRtc', 'storeDataValue': normalizedUriWebRtc}
    })
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: {'storeDataKey': 'callerUserNum', 'storeDataValue': formData.callerUserNum}
    })
    // Воздействие на компоненту AuthAd
    const state = getState()
    dispatch({ 
      type: AUTHCTL_STORE_VALUE, 
      payload: { 
        storeDataKey: 'responseData', 
        storeDataValue: {
          ...(state?.authControlRdcr?.responseData || {}), // Если объекта нет, берем пустой {} и раскрываем его
          sip_username: formData.callerUserNum
        }
      }, 
    })





    const uriStr = `sip:${formData.callerUserNum}@${uriHostFromWebRtc}`
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
        server: normalizedUriWebRtc,
        // Эти "/r/n/r/n" ломают OpenSIPS и это не нужно т.к. REGISTER все равно будет слать запросы перергистрации через expires.
        // Полагаемся на браузерный встроенный keep alive.
        // keepAliveInterval: 30,
        // keepAliveDebounce: 10  // Не слать пинг, если активность была менее 10с назад
      },
      logLevel: process.env.NODE_ENV === 'production' ? "error" : "debug"
    }

    const constrainsDefault = {
      audio: true,
      video: false,
    }

    const sessionOptions = {
      sessionDescriptionHandlerModifiers: [
        opusCodecModifier,
      ],
      sessionDescriptionHandlerOptions: {
        constraints: constrainsDefault,
      },
    }

    if (!rdcr.useIce) {
      // 1. Ставим 1 мс. SIP.js мгновенно завершит ожидание и сформирует INVITE.
      sessionOptions.sessionDescriptionHandlerOptions.iceGatheringTimeout = 1
      sessionOptions.sessionDescriptionHandlerOptions.peerConnectionConfiguration = {
        // 2. Используем стандартную политику
        iceTransportPolicy: 'all',
        // 3. Вырезаем STUN/TURN, чтобы браузер не тратил время на внешние запросы
        iceServers: [],
        // 4. Ограничиваем пул кандидатов до нуля, блокируя сбор на уровне WebRTC
        iceCandidatePoolSize: 0,
      }
    }

    const { audioLocalIn, audioLocalOut, audioRemote } = createAudioElements()
    const remoteStream = createRemoteStream()

    const userAgent = new UserAgent(userAgentOptions)
    const connectionCtl = {
      shouldBeConnected: true,
      suppressReconnectOnNextDisconnect: false,
    }
    setConnectionCtl(userAgent, connectionCtl)
    setPhoneRuntime({
      audioLocalIn,
      audioLocalOut,
      audioRemote,
      remoteStream,
      userAgentOptions,
      sessionOptions,
      userAgent,
      registerer: null,
      incomingSession: null,
      outgoingSession: null,
    })

    // ------------------------------------------------------------ handling for incoming INVITE requests
    userAgent.delegate = {
      onInvite(invitation) {

        const incomingSession = invitation
        setPhoneRuntime({
          incomingSession,
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
            'calleePhoneNum'  : incomingSession.remoteIdentity.uri.raw.user+(incomingSession.remoteIdentity.displayName ? ' "'+incomingSession.remoteIdentity.displayName+'"' : '')
          }
        })
      },

      onMessage(message) {
        const { chatMessages } = handleIncomingSipMessage(message)

        const incomingMessageSound = new Audio('sounds/sipjs/message.mp3')
        incomingMessageSound.preload = 'auto'
        incomingMessageSound.play().catch(() => {})

        dispatch({
          type: PHONECTL_MESSAGE_ADD,
          payload: {
            chatMessages,
            incoming: true,
          },
        })
      },
    }



    const registererOptions = sessionOptions
    const registerer = new Registerer(userAgent, registererOptions)
    setPhoneRuntime({ registerer })

    registerer.stateChange.addListener((newState) => {
      if (newState === RegistererState.Registered) {
        registrationAccepted = true
      }

      if (newState === RegistererState.Unregistered) {
        registrationAccepted = false
        registrationInFlight = false

        if (connectionCtl.shouldBeConnected && !connectionCtl.suppressReconnectOnNextDisconnect) {
          dispatch({
            type: PHONECTL_CONNECT_ERROR,
            payload: {
              'regNow'      : false,
              'phoneHeader' : 'Registration expired',
              'icoHeader'   : 'Registration expired',
            }
          })
          attemptReconnection()
        }
      }
    })


    // ------------------------------------------------------------ Handling Changes in Network State
    const reconnectionAttempts = 2
    const reconnectionDelay = 4

    let attemptingReconnection = false
    let registrationInFlight = false
    let registrationAccepted = false

    const stopAfterRegistrationFailure = () => {
      connectionCtl.shouldBeConnected = false
      connectionCtl.suppressReconnectOnNextDisconnect = true

      return userAgent.stop().catch((e) => {
        console.log('userAgent.stop()', e)
      })
    }

    const attemptReconnection = (reconnectionAttempt = 1) => {

      if (!userAgent) {
        return;
      }

      if (!connectionCtl.shouldBeConnected) {
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
        if (!connectionCtl.shouldBeConnected) {
          attemptingReconnection = false
          return;
        }
        
        if (!userAgent) {
          console.error('userAgent is null during reconnect attempt')
          attemptingReconnection = false
          return;
        }
        
        // Attempt reconnect
        try {
          userAgent.reconnect()
            .then(() => {
              // console.log('userAgent.reconnect() success')
              attemptingReconnection = false
            })
            .catch((error) => {
              console.error('userAgent.reconnect() failed:', error.message || error)
              attemptingReconnection = false
              attemptReconnection(++reconnectionAttempt)
            });
        } catch (e) {
          console.error('userAgent.reconnect() error:', e.message || e)
          attemptingReconnection = false
          attemptReconnection(++reconnectionAttempt)
        }
      }, reconnectionAttempt === 1 ? 0 : reconnectionDelay * 1000)
    }

    userAgent.delegate.onConnect = () => {
      if (!connectionCtl.shouldBeConnected || registrationAccepted || registrationInFlight) {
        return
      }

      if (!registerer) {
        console.error('Registerer not available on connect')
        return
      }

      registrationInFlight = true
      try {
        registerer.register({
          requestDelegate: {
            onAccept(response) {
              // console.log('register.onAccept()',response)
              registrationInFlight = false
              registrationAccepted = true
              dispatch({
                type: PHONECTL_CONNECT_SUCCESS,
                payload: {
                  'regNow'            : true,
                  'phoneHeader'       : response.message.from.displayName,
                  'icoHeader'         : response.message.from.displayName,
                }
              })
            },
            onReject(response) {
              console.error('SIP Registration rejected:', response.message.statusCode+' '+response.message.reasonPhrase)
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
                    resetPhoneRuntime()
                  })
              }, 3000)
            },
          },
        })
        .catch((e) => {
          console.error('SIP Registration error:', e.message || e)
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
                resetPhoneRuntime()
              })
          }, 3000)
        })
      } catch (e) {
        console.error('SIP Registerer register() error:', e.message || e)
        registrationInFlight = false
        registrationAccepted = false
      }
    }

    userAgent.delegate.onDisconnect = (error) => {
      if (connectionCtl.suppressReconnectOnNextDisconnect) {
        connectionCtl.suppressReconnectOnNextDisconnect = false
        return
      }

      registrationAccepted = false
      registrationInFlight = false
      attemptingReconnection = false

      console.error('WebSocket disconnected:', error ? error.message : 'unknown reason')

      dispatch({
        type: PHONECTL_CONNECT_ERROR,
        payload: {
          'regNow'          : false,
          'phoneHeader'     : 'Disconnected',
          'icoHeader'       : 'Disconnected',
        }
      })

      if (error && connectionCtl.shouldBeConnected) {
        try {
          attemptReconnection()
        } catch (e) {
          console.error('Error triggering reconnection:', e.message || e)
        }
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
      console.error('userAgent.start() failed:', e.message || e)
      connectionCtl.shouldBeConnected = false
      dispatch({
        type: PHONECTL_CONNECT_ERROR,
        payload: {
          'regNow'          : false,
          'phoneHeader'     : 'SIP proxy WebSocket problem',
          'icoHeader'       : 'SIP proxy WebSocket problem',
        }
      })
      dispatch({ type: PHONECTL_UNREGISTER })
      resetPhoneRuntime()
    })

  }
}



const handleClkUnregister = function(rdcr) {
  return (dispatch) => {
    const runtime = getPhoneRuntime()
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

    if (!runtime.userAgent) {
      regAlert('Нет подключения к SIP.')
      return
    }
    if (!rdcr.regNow) {
      regAlert('Нет активной регистрации.')
      return
    }

    if (runtime.outgoingSession) endCall(runtime.outgoingSession)
    if (runtime.incomingSession) endCall(runtime.incomingSession)
    if (runtime.audioLocalIn) runtime.audioLocalIn.pause()
    if (runtime.audioLocalOut) runtime.audioLocalOut.pause()

    markVoluntaryDisconnect(runtime.userAgent)

    const finishStop = () => {
      return runtime.userAgent.stop()
        .then(() => {
          dispatch({ type: PHONECTL_UNREGISTER })
          resetPhoneRuntime()
          clearRegAlert()
        })
        .catch((e) => {
          console.log('userAgent.stop()', e)
          dispatch({ type: PHONECTL_UNREGISTER })
          resetPhoneRuntime()
          clearRegAlert()
        })
    }

    const registerer = runtime.registerer
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
    const runtime = getPhoneRuntime()
    dispatch({
      type: PHONECTL_INCOME_SUBMIT,
      payload: {
        'incomeDisplay'   : false,
        'incomeCallNow'   : true,
      }
    })
    runtime.audioLocalIn.pause()
    runtime.incomingSession.accept(runtime.sessionOptions)
  }
}



const handleClkSubmitOut = function(calleePhoneNum, rdcr) {
  // calleePhoneNum передаю отдельным аргументом т.к. rdcr.calleePhoneNum прилетит позже при след.рендере.

  return (dispatch) => {
    const runtime = getPhoneRuntime()
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
    if (!runtime.userAgent) {
      padAlert('Нет подключения к SIP.')
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

    const uriHost = getUriHostFromWebRtc(rdcr.uriWebRtc)
    const targetStr = 'sip:' + callee + '@' + uriHost
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
      }
    })
    runtime.audioLocalOut.play()

    const outgoingSession = new Inviter(runtime.userAgent, target, runtime.sessionOptions)
    setPhoneRuntime({
      outgoingSession,
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
          runtime.audioLocalOut.pause()
          setupRemoteMedia(outgoingSession, runtime.audioRemote, runtime.remoteStream)
          break
        case SessionState.Terminated:
          logCall(outgoingSession, 'complete', 'out')
          dispatch(CallsArrUpdate())
          cleanupMedia(runtime.audioRemote, runtime.audioLocalIn, runtime.audioLocalOut)
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
      // ПРОВЕРКА: Если сессия закрыта нами, не считаем это ошибкой
      const isTerminated =
        outgoingSession.state === SessionState.Terminating ||
        outgoingSession.state === SessionState.Terminated
      if (isTerminated) {
        console.log("Игнорируем ошибку в состоянии Terminating/Terminated")
        return
      }

      // В противном случае — это реальная проблема (сеть, сервер и т.д.)
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
    const runtime = getPhoneRuntime()
    const {
      outgoingSession = runtime.outgoingSession,
      incomingSession = runtime.incomingSession,
      phoneHeader,
    } = callData
    if (outgoingSession) endCall(outgoingSession)
    if (incomingSession) endCall(incomingSession)
    if (runtime.audioLocalIn) runtime.audioLocalIn.pause()
    if (runtime.audioLocalOut) runtime.audioLocalOut.pause()
    resetPhoneRuntimeSessions()

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



const handleClkDtmf = function(tone, rdcr, options = {}) {
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

    const dtmf = typeof tone === 'string' ? tone.trim() : String(tone ?? '').trim()
    if (!/^[0-9A-D#*,]$/.test(dtmf)) {
      padAlert('Некорректный DTMF сигнал.')
      return
    }

    const session = getActiveSession()
    if (!session) {
      padAlert('Нет активного звонка для DTMF.')
      return
    }

    clearPadAlert()

    if (options.useSessionDescriptionHandler) {
      if (!session.sessionDescriptionHandler?.sendDtmf(dtmf, options.dtmfOptions)) {
        padAlert('Не удалось отправить DTMF.')
      }
      return
    }

    const duration = options.duration ?? 200
    const requestOptions = {
      body: {
        contentDisposition: 'render',
        contentType: 'application/dtmf-relay',
        content: 'Signal=' + dtmf + '\r\nDuration=' + duration,
      }
    }

    session.info({ requestOptions })
      .catch((error) => {
        console.log('dtmf INFO send ERROR !', error)
        padAlert('Не удалось отправить DTMF.')
      })
  }
}



const handleClkHold = function(rdcr, hold = true) {
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

    const session = getActiveSession()
    if (!session) {
      padAlert('Нет активного звонка для HOLD.')
      return
    }

    const sessionDescriptionHandlerModifiers = hold ? [opusCodecModifier, Web.holdModifier] : [opusCodecModifier]

    session.invite({ sessionDescriptionHandlerModifiers })
      .then(() => {
        setLocalAudioEnabled(session, !hold)
        dispatch({
          type: PHONECTL_STORE_VALUE,
          payload: {'storeDataKey': 'callHoldNow', 'storeDataValue': hold}
        })
        clearPadAlert()
      })
      .catch((error) => {
        console.log('hold re-INVITE send ERROR !', error)
        padAlert(hold ? 'Не удалось поставить звонок на HOLD.' : 'Не удалось снять звонок с HOLD.')
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



const handleChatUnreadClear = function() {
  return (dispatch) => {
    dispatch({ type: PHONECTL_CHAT_UNREAD_CLEAR })
  }
}



const handleClearChat = function() {
  return (dispatch) => {
    clearChatMessages()
    dispatch({ type: PHONECTL_CLEAR_CHAT })
  }
}

const handleClearHistory = function() {
  return (dispatch) => {
    clearCallsArr()
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: { storeDataKey: 'callsArr', storeDataValue: [] },
    })
  }
}


const handleSendMessage = function(peerPhoneNum, messageBody, rdcr) {
  return (dispatch) => {
    const runtime = getPhoneRuntime()
    const chatAlert = (errText) => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: 'PhoneChat',
          errText,
        },
      })
    }

    const clearChatAlert = () => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: '',
          errText: '',
        },
      })
    }

    const peer = typeof peerPhoneNum === 'string' ? peerPhoneNum.trim() : String(peerPhoneNum ?? '').trim()
    const body = typeof messageBody === 'string' ? messageBody.trim() : String(messageBody ?? '').trim()

    if (!rdcr.regNow) {
      chatAlert('Нет регистрации. Сначала зарегистрируйтесь.')
      return
    }
    if (!runtime.userAgent) {
      chatAlert('Нет подключения к SIP.')
      return
    }
    if (!peer) {
      chatAlert('Введите номер абонента.')
      return
    }
    if (!body) {
      chatAlert('Введите текст сообщения.')
      return
    }

    const uriHost = getUriHostFromWebRtc(rdcr.uriWebRtc)
    const targetStr = 'sip:' + peer + '@' + uriHost
    if (!UserAgent.makeURI(targetStr)) {
      chatAlert('Некорректный SIP URI: ' + targetStr)
      return
    }

    clearChatAlert()

    const chatMessage = createChatMessage(peer, body, 'out', 'sending')
    appendChatMessage(chatMessage, dispatch)
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: { storeDataKey: 'calleePhoneNum', storeDataValue: peer },
    })

    transmitSipMessage({
      chatMessage,
      uriHost,
      onStatusChange: (chatMessages) => {
        dispatch({
          type: PHONECTL_MESSAGE_UPDATE,
          payload: { chatMessages },
        })
      },
    })
  }
}

const getPhoneDir = function() {
  return async () => {
    const url = localStorage.getItem('uriPhoneDir');

    if (!url) {
      console.warn('No phone directory URI found in localStorage.');
      return [];
    }

    try {
      return await ky.get(url).json();
    } catch (error) {
      const detailMessage = await getApiErrorMessage(error, 'Ошибка загрузки телефонного справочника.');
      
      console.error('Error fetching phone directory:', detailMessage);
      throw new Error(detailMessage);
    }
  };
};



export {
  handleClkRegister,
  handleClkUnregister,
  handleClkReset,
  handleClkSubmitIn,
  handleClkSubmitOut,
  handleClkDtmf,
  handleClkHold,
  handleChangeStore,
  handleSendMessage,
  handleChatUnreadClear,
  handleClearChat,
  handleClearHistory,
  CallsArrUpdate,
  MessagesArrUpdate,
  getPhoneDir,
}
