import {
  PHONECTL_CONNECT_REQUEST,
  PHONECTL_CONNECT_SUCCESS,
  PHONECTL_CONNECT_ERROR,
  PHONECTL_RECONNECT_TRY,

  PHONECTL_CLK_RESET,
  PHONECTL_CALLLOG_UPD,

  PHONECTL_INCOME_DISPLAY,
  PHONECTL_INCOME_SUBMIT,
  PHONECTL_OUTGO_SUBMIT,

  PHONECTL_SESSION_IN,
  PHONECTL_SESSION_OUT,

  PHONECTL_USER_INPUT
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
const setupRemoteMedia = function(session, mediaElement, remoteStream) {
  session.sessionDescriptionHandler.peerConnection.getReceivers().forEach((receiver) => {
    if (receiver.track) {
      remoteStream.addTrack(receiver.track);
    }
  });
  mediaElement.srcObject = remoteStream;
  mediaElement.play();
}

const cleanupMedia = function(mediaElement, audioLocalIn, audioLocalOut) {
  mediaElement.srcObject = null
  mediaElement.pause()
  audioLocalIn.pause()
  audioLocalOut.pause()
}

const logCall = function(session, status, direction) {
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

  if (status === 'завершен') {
    calllog[log.id].stop = log.time
  }

  if (status === 'завершен' && calllog[log.id].status === 'звонит') {
      calllog[log.id].status = 'пропущен'
  } else {
      calllog[log.id].status = status
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



const handleClkRegister = function(userAgentOptions, sessionOptions, rdcr) {
  const uriHost       = rdcr.uriHost
  const wssPort       = rdcr.wssPort
  const callerUserNum = rdcr.callerUserNum
  const regUserPass   = rdcr.regUserPass


  return (dispatch) => {
    // Checks
    if (!uriHost || !wssPort || !callerUserNum || !regUserPass) {
      console.log("Not all reg.data!")
      return
    }
    localStorage.setItem('uriHost', uriHost)
    localStorage.setItem('wssPort', wssPort)
    localStorage.setItem('callerUserNum', callerUserNum)

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

    /*
    * Setup handling for incoming INVITE requests
    */
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
              logCall(incomingSession, 'разговор', 'вх.')
              dispatch(CallsArrUpdate())
              setupRemoteMedia(incomingSession, audioRemote, remoteStream)
              break;
            case SessionState.Terminated:
              logCall(incomingSession, 'завершен', 'вх.')
              dispatch(CallsArrUpdate())
              cleanupMedia(audioRemote, audioLocalIn, audioLocalOut)
              dispatch(handleClkReset(false, incomingSession, userAgentOptions.authorizationUsername, rdcr))
              break;
            default:
              break;
          }
        })

        audioLocalIn.play()
        logCall(incomingSession, 'звонит', 'вх.')
        dispatch(CallsArrUpdate())
        dispatch({
          type: PHONECTL_INCOME_DISPLAY,
          payload: {
            'incomeDisplay'   : true,
            'phoneHeader'     : incomingSession.remoteIdentity.uri.raw.user+' ⇢ '+userAgentOptions.authorizationUsername,
            'calleePhoneNum'  : incomingSession.remoteIdentity.uri.raw.user
          }
        })
      }
    }



    const registererOptions = sessionOptions
    const registerer = new Registerer(userAgent, registererOptions)


    // ------------------------------------------------------------ Handling Changes in Network State
    const reconnectionAttempts = 3
    const reconnectionDelay = 4

    // Used to guard against overlapping reconnection attempts
    let attemptingReconnection = false;
    // If false, reconnection attempts will be discontinued or otherwise prevented
    let shouldBeConnected = true;

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
        return;
      }

      dispatch({
        type: PHONECTL_RECONNECT_TRY,
        payload: {
          'phoneHeader'     : 'Reconnection'
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
      registerer.register({
        requestDelegate: {
          onAccept(response) {
            // console.log('register.onAccept()',response)
            dispatch({
              type: PHONECTL_CONNECT_SUCCESS,
              payload: {
                'regNow'          : true,
                'displayReg'      : false,
                'displayPad'      : true,
                'displayHistory'  : true,
                'phoneHeader'     : response.message.from.displayName
              }
            })
          },
          onReject(response) {
            // console.log('register.onReject()',response)
            dispatch({
              type: PHONECTL_CONNECT_ERROR,
              payload: {
                'regNow'          : false,
                'phoneHeader'     : response.message.statusCode+' '+response.message.reasonPhrase
              }
            })
            // Принудительно отключаю, чтобы сбросить старые атрибуты user/secret
            setTimeout(() => {
              userAgent.stop()
            }, 3000)
          },
        },
      })
      .catch((e) => {
        console.log('register.catch()',e)
        dispatch({
          type: PHONECTL_CONNECT_ERROR,
          payload: {
            'regNow'          : false,
            'phoneHeader'     : 'Registration error'
          }
        })
        // Принудительно отключаю, чтобы сбросить старые атрибуты user/secret
        setTimeout(() => {
          userAgent.stop()
        }, 3000)
      })
    }

    userAgent.delegate.onDisconnect = (error) => {
      dispatch({
        type: PHONECTL_CONNECT_ERROR,
        payload: {
          'phoneHeader'     : 'Disconnected'
        }
      })
      // registerer.unregister()
      // .catch((e) => {
      //   console.log('unregister.catch()', e)
      // })      

      if (error) {
        // console.log('userAgent.onDisconnect(error)', error)
        attemptReconnection()
      }
    }

    // END OF ------------------------------------------------------------ Handling Changes in Network State



    dispatch({
      type: PHONECTL_CONNECT_REQUEST,
      payload: {
        'audioLocalIn'      : audioLocalIn,
        'audioLocalOut'     : audioLocalOut,
        'audioRemote'       : audioRemote,
        'remoteStream'      : remoteStream,
        'userAgentOptions'  : userAgentOptions,
        'sessionOptions'    : sessionOptions,
        'userAgent'         : userAgent,
        'phoneHeader'       : 'UserAgent starting...'
      }
    })

    userAgent.start().then(() => {
      // UA started
    })
    .catch((e) => {
      dispatch({
        type: PHONECTL_CONNECT_ERROR,
        payload: {
          'regNow'          : false,
          'phoneHeader'     : 'SIP proxy WebSocket problem'
        }
      })
    })

  }
}



const handleClkSubmitIn = function(rdcr) {
  const incomingSession = rdcr.incomingSession
  const sessionOptions  = rdcr.sessionOptions
  const audioLocalIn    = rdcr.audioLocalIn
  const callerUserNum   = rdcr.callerUserNum

  return (dispatch) => {
    dispatch({
      type: PHONECTL_INCOME_SUBMIT,
      payload: {
        'incomeDisplay'   : false,
        'incomeCallNow'   : true,
        'phoneHeader'     : incomingSession.remoteIdentity.uri.raw.user+' ⇢ '+callerUserNum
      }
    })
    audioLocalIn.pause()
    incomingSession.accept(sessionOptions)
  }
}



const handleClkSubmitOut = function(rdcr, calleePhoneNum) {
  const userAgent       = rdcr.userAgent
  const sessionOptions  = rdcr.sessionOptions
  const audioLocalIn    = rdcr.audioLocalIn
  const audioLocalOut   = rdcr.audioLocalOut
  const callerUserNum   = rdcr.callerUserNum
  // const calleePhoneNum  = rdcr.calleePhoneNum  // Передаю отдельным аргументом т.к. rdcr.calleePhoneNum прилетит позже при след.рендере.
  const audioRemote     = rdcr.audioRemote
  const remoteStream    = rdcr.remoteStream
  const regNow          = rdcr.regNow


  // Checks
  if (!regNow) {
    console.log("Not Registered state!")
    return
  }
  if (!callerUserNum) {
    console.log("callerUserNum is empty!")
    return
  }
  if (!calleePhoneNum) {
    console.log("calleePhoneNum is empty!")
    return
  }
  
  const target = UserAgent.makeURI("sip:"+calleePhoneNum+"@"+window.localStorage.getItem('uas_uri'))
  if (!target) {
    console.log("Failed to create target URI for:","sip:"+calleePhoneNum+"@"+window.localStorage.getItem('uas_uri'))
    return
  }

  // do it
  return (dispatch) => {
    dispatch({
      type: PHONECTL_OUTGO_SUBMIT,
      payload: {
        'outgoCallNow'    : true,
        'phoneHeader'     : calleePhoneNum+' ⇠ '+callerUserNum
      }
    })
    audioLocalOut.play()

    const outgoingSession = new Inviter(userAgent, target, sessionOptions)
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
          logCall(outgoingSession, 'звонит', 'исх.')
          dispatch(CallsArrUpdate())
          break
        case SessionState.Established:
          logCall(outgoingSession, 'разговор', 'исх.')
          dispatch(CallsArrUpdate())
          audioLocalOut.pause()
          setupRemoteMedia(outgoingSession, audioRemote, remoteStream)
          break
        case SessionState.Terminated:
          logCall(outgoingSession, 'завершен', 'исх.')
          dispatch(CallsArrUpdate())
          cleanupMedia(audioRemote, audioLocalIn, audioLocalOut)
          dispatch(handleClkReset(outgoingSession, false, callerUserNum, rdcr))
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
      })
  }
}



const handleClkReset = function(outgoingSession, incomingSession, phoneHeader, rdcr) {
  const audioLocalIn    = rdcr.audioLocalIn
  const audioLocalOut   = rdcr.audioLocalOut

  return (dispatch) => {
    if (outgoingSession) endCall(outgoingSession)
    if (incomingSession) endCall(incomingSession)
    if (audioLocalIn) audioLocalIn.pause()
    if (audioLocalOut) audioLocalOut.pause()

    dispatch({
      type: PHONECTL_CLK_RESET,
      payload: {
        'phoneHeader'     : phoneHeader,
        'calleePhoneNum'  : '',
        'incomeDisplay'   : false,
        'outgoCallNow'    : false,
        'incomeCallNow'   : false,
      }
    })
  }
}



const handleChangeData = function(event) {
  return (dispatch) => {
    dispatch({
      type: PHONECTL_USER_INPUT,
      payload: {'storeDataKey': event.target.id, 'storeDataValue': event.target.value}
    })
  }
}



export {
  handleClkRegister,
  handleClkReset,
  handleClkSubmitIn,
  handleClkSubmitOut,
  handleChangeData,
  CallsArrUpdate
}