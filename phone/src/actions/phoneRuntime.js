import {
  Inviter,
  Messager,
  Registerer,
  RegistererState,
  SessionState,
  Web,
  UserAgent,
} from "sip.js"

import {
  CALLS_STORAGE_KEY,
  CHAT_STORAGE_KEY,
  
  CHAT_MAX_MESSAGES,
  CALLS_MAX_CALLS
} from '../constants/storage'

const createPhoneRuntime = () => ({
  userAgentOptions: null,
  sessionOptions: null,
  userAgent: null,
  registerer: null,
  audioLocalIn: null,
  audioLocalOut: null,
  audioRemote: null,
  remoteStream: null,
  incomingSession: null,
  outgoingSession: null,
})

const phoneRuntime = createPhoneRuntime()
const connectionCtlByUserAgent = new WeakMap()

const getPhoneRuntime = function() {
  return phoneRuntime
}

const setPhoneRuntime = function(values) {
  Object.assign(phoneRuntime, values)
}

const resetPhoneRuntime = function() {
  Object.assign(phoneRuntime, createPhoneRuntime())
}

const resetPhoneRuntimeSessions = function() {
  setPhoneRuntime({
    incomingSession: null,
    outgoingSession: null,
  })
}

// ============================================================
// SIP.js Media Functions
// ============================================================

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

// ============================================================
// SIP.js Session Functions
// ============================================================

const endCall = async function(session) {
  if (!session) return

  try {
    switch(session.state) {
      case SessionState.Initial:
      case SessionState.Establishing:
        // Если мы звоним — отменяем, если нам звонят — отклоняем
        if (session instanceof Inviter) {
          await session.cancel()
        } else {
          await session.reject()
        }
        break
      case SessionState.Established:
        await session.bye();
        break
      case SessionState.Terminating:
      case SessionState.Terminated:
        break
    }
  } catch (e) {
    console.error("Ошибка при завершении:", e);
  } finally {
    session.dispose()
  }
}

const getActiveSession = function() {
  const runtime = getPhoneRuntime()
  const sessions = [
    runtime.incomingSession,
    runtime.outgoingSession,
  ]

  return sessions.find((session) => session && session.state === SessionState.Established)
}

const setLocalAudioEnabled = function(session, enabled) {
  session.sessionDescriptionHandler?.peerConnection?.getSenders().forEach((sender) => {
    if (sender.track && sender.track.kind === 'audio') {
      sender.track.enabled = enabled
    }
  })
}

// ============================================================
// SIP.js Codec Modifiers
// ============================================================

const opusCodecModifier = function(description) {
  // Ничего не модифицирую
  return Promise.resolve(description)

  // if (!description.sdp) {
  //   return Promise.resolve(description)
  // }

  // const sections = description.sdp.split(/(?=m=)/)
  // const nextSdp = sections.map((section) => {
  //   if (!section.startsWith('m=audio')) {
  //     return section
  //   }

  //   const opusPayloads = []
  //   section.replace(/^a=rtpmap:(\d+)\s+opus\/48000(?:\/\d+)?\r?$/gim, (line, payload) => {
  //     opusPayloads.push(payload)
  //     return line
  //   })

  //   if (!opusPayloads.length) {
  //     return section
  //   }

  //   const allowed = new Set(opusPayloads)
  //   const lines = section.split(/\r\n|\n/)
  //   const filteredLines = lines
  //     .map((line) => {
  //       if (line.startsWith('m=audio')) {
  //         return line.split(' ').slice(0, 3).concat(opusPayloads).join(' ')
  //       }

  //       const codecLine = line.match(/^a=(rtpmap|fmtp|rtcp-fb):(\d+)/)
  //       if (codecLine && !allowed.has(codecLine[2])) {
  //         return null
  //       }

  //       return line
  //     })
  //     .filter((line) => line !== null)

  //   return filteredLines.join('\r\n')
  // }).join('')

  // return Promise.resolve({ ...description, sdp: nextSdp })
}

// ============================================================
// SIP.js Call Logging
// ============================================================

const logCall = function(session, callState, direction) {
  const log = {
    id   : session.id,
    clid : session.displayName,
    uri  : session.remoteIdentity.uri.raw.user+(session.remoteIdentity.displayName ? ' "'+session.remoteIdentity.displayName+'"' : ''),
    time : new Date().getTime()
  }
  let calllog = JSON.parse(localStorage.getItem(CALLS_STORAGE_KEY))
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

  localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calllog))
}

const loadCallsArr = function() {
  let calllog = JSON.parse(localStorage.getItem(CALLS_STORAGE_KEY))
  const rows = []

  if (calllog !== null) {
    for (const calllogObj in calllog) {
      rows.push(calllog[calllogObj])
    }
  }

  // Удаляю первую строчку лога (самую старую)
  if (rows.length > CALLS_MAX_CALLS) {
    delete calllog[rows[0].id]
    localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calllog))
  }

  rows.sort((a, b) => a.start > b.start ? -1 : 1)
  return rows
}

// ============================================================
// SIP.js Audio Element Factory
// ============================================================

const createAudioElements = function() {
  const audioLocalIn = new Audio()
  audioLocalIn.preload = 'auto'
  audioLocalIn.src = 'sounds/sipjs/incoming.mp3'
  audioLocalIn.loop = true

  const audioLocalOut = new Audio()
  audioLocalOut.preload = 'auto'
  audioLocalOut.src = 'sounds/sipjs/outgoing.mp3'
  audioLocalOut.loop = true

  const audioRemote = new Audio()

  return { audioLocalIn, audioLocalOut, audioRemote }
}

const createRemoteStream = function() {
  return new MediaStream()
}

// ============================================================
// SIP.js Connection Control Helpers
// ============================================================

const markVoluntaryDisconnect = function(userAgent) {
  const ctl = userAgent && connectionCtlByUserAgent.get(userAgent)
  if (!ctl) return
  ctl.shouldBeConnected = false
  ctl.suppressReconnectOnNextDisconnect = true
}

const getConnectionCtl = function(userAgent) {
  return connectionCtlByUserAgent.get(userAgent)
}

const setConnectionCtl = function(userAgent, ctl) {
  connectionCtlByUserAgent.set(userAgent, ctl)
}

// ============================================================
// SIP.js MESSAGE Functions
// ============================================================

const peerFromSipUri = function(uri) {
  if (!uri) return ''
  if (typeof uri === 'string') {
    const match = uri.match(/^sip:([^@;]+)/i)
    return match ? match[1] : uri
  }
  return uri.user || uri.raw?.user || ''
}

const loadChatMessages = function() {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY))
  if (!stored) return []

  const rows = Object.values(stored)
  rows.sort((a, b) => a.time - b.time)
  return rows.slice(-CHAT_MAX_MESSAGES)
}

const saveChatMessage = function(message) {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {}
  stored[message.id] = message

  const rows = Object.values(stored).sort((a, b) => a.time - b.time)
  if (rows.length > CHAT_MAX_MESSAGES) {
    rows.slice(0, rows.length - CHAT_MAX_MESSAGES).forEach((row) => {
      delete stored[row.id]
    })
  }

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored))
  return Object.values(stored).sort((a, b) => a.time - b.time)
}

const createChatMessage = function(peer, body, direction, status = null) {
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    peer,
    body,
    direction,
    time: Date.now(),
  }

  if (direction === 'out') {
    message.status = status || 'sending'
    message.statusCode = null
    message.statusText = null
  }

  return message
}

const updateChatMessageStatus = function(messageId, status, statusCode, statusText) {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {}
  if (!stored[messageId]) return loadChatMessages()

  stored[messageId] = {
    ...stored[messageId],
    status,
    statusCode: statusCode ?? null,
    statusText: statusText ?? null,
  }

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored))
  return Object.values(stored).sort((a, b) => a.time - b.time)
}

const handleIncomingSipMessage = function(message) {
  message.accept()

  const peer = peerFromSipUri(message.request.from.uri)
  const body = typeof message.request.body === 'string' ? message.request.body : ''
  const chatMessage = createChatMessage(peer, body, 'in')
  const chatMessages = saveChatMessage(chatMessage)

  return { chatMessage, chatMessages }
}

const transmitSipMessage = function({ chatMessage, uriHost, onStatusChange }) {
  const runtime = getPhoneRuntime()
  if (!runtime.userAgent) {
    return Promise.reject(new Error('Нет подключения к SIP.'))
  }

  const { peer, body } = chatMessage
  const targetStr = 'sip:' + peer + '@' + uriHost
  const target = UserAgent.makeURI(targetStr)
  if (!target) {
    return Promise.reject(new Error('Некорректный SIP URI: ' + targetStr))
  }

  const setDeliveryStatus = (status, statusCode, statusText) => {
    const chatMessages = updateChatMessageStatus(chatMessage.id, status, statusCode, statusText)
    onStatusChange?.(chatMessages)
  }

  const requestDelegate = {
    onAccept(response) {
      setDeliveryStatus('delivered', response.message.statusCode, response.message.reasonPhrase)
    },
    onReject(response) {
      setDeliveryStatus('error', response.message.statusCode, response.message.reasonPhrase)
    },
  }

  const activeSession = getActiveSession()
  const sendPromise = activeSession
    ? activeSession.message({
        requestOptions: {
          body: {
            contentDisposition: 'render',
            contentType: 'text/plain',
            content: body,
          },
        },
        requestDelegate,
      })
    : new Messager(runtime.userAgent, target, body, 'text/plain').message({ requestDelegate })

  return sendPromise
    .then(() => {
      const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {}
      if (stored[chatMessage.id]?.status === 'sending') {
        setDeliveryStatus('delivered', 200, 'OK')
      }
    })
    .catch((error) => {
      console.log('MESSAGE send ERROR !', error)
      const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {}
      if (stored[chatMessage.id]?.status === 'sending') {
        const msg = error && typeof error.message === 'string' ? error.message : String(error)
        setDeliveryStatus('error', null, msg)
      }
    })
}

export {
  getPhoneRuntime,
  setPhoneRuntime,
  resetPhoneRuntime,
  resetPhoneRuntimeSessions,
  // Media functions
  setupRemoteMedia,
  clearRemoteStream,
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
  // MESSAGE functions
  loadChatMessages,
  saveChatMessage,
  createChatMessage,
  handleIncomingSipMessage,
  transmitSipMessage,
  // Re-export SIP.js types for convenience
  SessionState,
  RegistererState,
  Inviter,
  Messager,
  Registerer,
  Web,
  UserAgent,
}
