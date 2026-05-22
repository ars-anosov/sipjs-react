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
} from '../constants/all'

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
} from './phoneRuntime'



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
        server: "wss://"+formData.uriHost+":"+formData.wssPort,
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
      }
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
      if (!connectionCtl.shouldBeConnected || registrationAccepted || registrationInFlight) {
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
                'regNow'            : true,
                'phoneHeader'       : response.message.from.displayName,
                'icoHeader'         : response.message.from.displayName,
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
                  resetPhoneRuntime()
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
              resetPhoneRuntime()
            })
        }, 3000)
      })
    }

    userAgent.delegate.onDisconnect = (error) => {
      if (connectionCtl.suppressReconnectOnNextDisconnect) {
        connectionCtl.suppressReconnectOnNextDisconnect = false
        return
      }

      registrationAccepted = false
      registrationInFlight = false

      dispatch({
        type: PHONECTL_CONNECT_ERROR,
        payload: {
          'regNow'          : false,
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



export {
  handleClkRegister,
  handleClkUnregister,
  handleClkReset,
  handleClkSubmitIn,
  handleClkSubmitOut,
  handleClkDtmf,
  handleClkHold,
  handleChangeStore,
  CallsArrUpdate
}
