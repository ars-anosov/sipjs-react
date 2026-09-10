import {
  Inviter,
  Messager,
  Registerer,
  RegistererState,
  SessionState,
  UserAgent,
  Web,
} from "sip.js";

import {
  CALLS_MAX_CALLS,
  CALLS_STORAGE_KEY,
  CHAT_MAX_MESSAGES,
  CHAT_STORAGE_KEY,
} from "../constants/storage";

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
});

const phoneRuntime = createPhoneRuntime();
const connectionCtlByUserAgent = new WeakMap();

const getPhoneRuntime = () => phoneRuntime;

const setPhoneRuntime = (values) => {
  Object.assign(phoneRuntime, values);
};

const resetPhoneRuntime = () => {
  Object.assign(phoneRuntime, createPhoneRuntime());
};

const resetPhoneRuntimeSessions = () => {
  setPhoneRuntime({
    incomingSession: null,
    outgoingSession: null,
  });
};

// ============================================================
// SIP.js Media Functions
// ============================================================

const clearRemoteStream = (remoteStream) => {
  remoteStream.getTracks().forEach((track) => {
    remoteStream.removeTrack(track);
    track.stop();
  });
};

const setupRemoteMedia = (session, mediaElement, remoteStream) => {
  clearRemoteStream(remoteStream);
  session.sessionDescriptionHandler.peerConnection
    .getReceivers()
    .forEach((receiver) => {
      if (receiver.track) {
        remoteStream.addTrack(receiver.track);
      }
    });
  mediaElement.srcObject = remoteStream;
  mediaElement.play();
};

const cleanupMedia = (mediaElement, audioLocalIn, audioLocalOut) => {
  if (mediaElement.srcObject instanceof MediaStream) {
    clearRemoteStream(mediaElement.srcObject);
  }
  mediaElement.srcObject = null;
  mediaElement.pause();
  audioLocalIn.pause();
  audioLocalOut.pause();
};

// ============================================================
// SIP.js Session Functions
// ============================================================

const endCall = async (session) => {
  if (!session) return;

  try {
    switch (session.state) {
      case SessionState.Initial:
      case SessionState.Establishing:
        // Если мы звоним — отменяем, если нам звонят — отклоняем
        if (session instanceof Inviter) {
          await session.cancel();
        } else {
          await session.reject();
        }
        break;
      case SessionState.Established:
        await session.bye();
        break;
      case SessionState.Terminating:
      case SessionState.Terminated:
        break;
    }
  } catch (e) {
    console.error("Ошибка при завершении:", e);
  } finally {
    session.dispose();
  }
};

const getActiveSession = () => {
  const runtime = getPhoneRuntime();
  const sessions = [runtime.incomingSession, runtime.outgoingSession];

  return sessions.find(
    (session) => session && session.state === SessionState.Established,
  );
};

const setLocalAudioEnabled = (session, enabled) => {
  session.sessionDescriptionHandler?.peerConnection
    ?.getSenders()
    .forEach((sender) => {
      if (sender.track && sender.track.kind === "audio") {
        sender.track.enabled = enabled;
      }
    });
};

// ============================================================
// SIP.js Codec Modifiers
// ============================================================

const opusCodecModifier = (description) => {
  // Ничего не модифицирую
  return Promise.resolve(description);

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
};

// ============================================================
// SIP.js Call Logging
// ============================================================

const normalizeCallLog = (calllog = {}) => {
  if (!calllog || typeof calllog !== "object" || Array.isArray(calllog)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(calllog).map(([callId, callRecord]) => {
      const normalizedRecord = {
        ...callRecord,
        id: callId,
        read: typeof callRecord.read === "boolean" ? callRecord.read : true,
      };

      return [callId, normalizedRecord];
    }),
  );
};

const logCall = (session, callState, direction) => {
  const log = {
    id: session.id,
    clid: session.displayName,
    uri:
      session.remoteIdentity.uri.raw.user +
      (session.remoteIdentity.displayName
        ? ` "${session.remoteIdentity.displayName}"`
        : ""),
    time: Date.now(),
  };
  const calllog = normalizeCallLog(
    JSON.parse(localStorage.getItem(CALLS_STORAGE_KEY)),
  );

  if (!Object.hasOwn(calllog, session.id)) {
    calllog[log.id] = {
      id: log.id,
      clid: log.clid,
      uri: log.uri,
      start: log.time,
      flow: direction,
      read: true,
    };
  }

  if (callState === "complete") {
    const stop = log.time;
    const start = calllog[log.id].start ?? stop;

    calllog[log.id].stop = stop;
    calllog[log.id].duration = Math.max(0, stop - start);
  }

  if (callState === "complete" && calllog[log.id].callState === "ringing") {
    calllog[log.id].callState = "lost";
    calllog[log.id].read = false;
  } else {
    calllog[log.id].callState = callState;
    if (callState === "incall" || callState === "complete") {
      calllog[log.id].read = true;
    }
  }

  localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calllog));
};

const loadCallsArr = () => {
  const calllog = normalizeCallLog(
    JSON.parse(localStorage.getItem(CALLS_STORAGE_KEY)),
  );
  const rows = Object.values(calllog);

  // Удаляю первую строчку лога (самую старую)
  if (rows.length > CALLS_MAX_CALLS) {
    delete calllog[rows[0].id];
    localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calllog));
  }

  rows.sort((a, b) => (a.start > b.start ? -1 : 1));
  return rows;
};

const markCallsRead = () => {
  const calllog = normalizeCallLog(
    JSON.parse(localStorage.getItem(CALLS_STORAGE_KEY)),
  );
  const rows = Object.values(calllog);

  if (rows.length > 0) {
    Object.values(calllog).forEach((callRecord) => {
      callRecord.read = true;
    });

    localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calllog));
  }

  rows.sort((a, b) => (a.start > b.start ? -1 : 1));
  return rows.map((row) => ({ ...row, read: true }));
};

// ============================================================
// SIP.js Audio Element Factory
// ============================================================

const createAudioElements = () => {
  const audioLocalIn = new Audio();
  audioLocalIn.preload = "auto";
  audioLocalIn.src = "sounds/sipjs/incoming.mp3";
  audioLocalIn.loop = true;

  const audioLocalOut = new Audio();
  audioLocalOut.preload = "auto";
  audioLocalOut.src = "sounds/sipjs/outgoing.mp3";
  audioLocalOut.loop = true;

  const audioRemote = new Audio();

  return { audioLocalIn, audioLocalOut, audioRemote };
};

const createRemoteStream = () => new MediaStream();

// ============================================================
// SIP.js Connection Control Helpers
// ============================================================

const markVoluntaryDisconnect = (userAgent) => {
  const ctl = userAgent && connectionCtlByUserAgent.get(userAgent);
  if (!ctl) return;
  ctl.shouldBeConnected = false;
  ctl.suppressReconnectOnNextDisconnect = true;
};

const getConnectionCtl = (userAgent) => connectionCtlByUserAgent.get(userAgent);

const setConnectionCtl = (userAgent, ctl) => {
  connectionCtlByUserAgent.set(userAgent, ctl);
};

// ============================================================
// SIP.js MESSAGE Functions
// ============================================================

const peerFromSipUri = (uri) => {
  if (!uri) return "";
  if (typeof uri === "string") {
    const match = uri.match(/^sip:([^@;]+)/i);
    return match ? match[1] : uri;
  }
  return uri.user || uri.raw?.user || "";
};

const loadChatMessages = () => {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY));
  if (!stored) return [];

  const rows = Object.values(stored);
  rows.sort((a, b) => a.time - b.time);
  return rows.slice(-CHAT_MAX_MESSAGES);
};

const saveChatMessage = (message) => {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
  stored[message.id] = message;

  const rows = Object.values(stored).sort((a, b) => a.time - b.time);
  if (rows.length > CHAT_MAX_MESSAGES) {
    rows.slice(0, rows.length - CHAT_MAX_MESSAGES).forEach((row) => {
      delete stored[row.id];
    });
  }

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
  return Object.values(stored).sort((a, b) => a.time - b.time);
};

const clearChatMessages = () => {
  localStorage.removeItem(CHAT_STORAGE_KEY);
  return [];
};

const clearCallsArr = () => {
  localStorage.removeItem(CALLS_STORAGE_KEY);
  return [];
};

const createChatMessage = (peer, body, direction, status = null) => {
  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    peer,
    body,
    direction,
    time: Date.now(),
  };

  if (direction === "out") {
    message.status = status || "sending";
    message.statusCode = null;
    message.statusText = null;
  }

  return message;
};

const updateChatMessageStatus = (messageId, status, statusCode, statusText) => {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
  if (!stored[messageId]) return loadChatMessages();

  stored[messageId] = {
    ...stored[messageId],
    status,
    statusCode: statusCode ?? null,
    statusText: statusText ?? null,
  };

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
  return Object.values(stored).sort((a, b) => a.time - b.time);
};

const handleIncomingSipMessage = (message) => {
  message.accept();

  const peer = peerFromSipUri(message.request.from.uri);
  const body =
    typeof message.request.body === "string" ? message.request.body : "";
  const chatMessage = createChatMessage(peer, body, "in");
  const chatMessages = saveChatMessage(chatMessage);

  return { chatMessage, chatMessages };
};

const transmitSipMessage = ({ chatMessage, uriHost, onStatusChange }) => {
  const runtime = getPhoneRuntime();
  if (!runtime.userAgent) {
    return Promise.reject(new Error("Нет подключения к SIP."));
  }

  const { peer, body } = chatMessage;
  const targetStr = `sip:${peer}@${uriHost}`;
  const target = UserAgent.makeURI(targetStr);
  if (!target) {
    return Promise.reject(new Error(`Некорректный SIP URI: ${targetStr}`));
  }

  const setDeliveryStatus = (status, statusCode, statusText) => {
    const chatMessages = updateChatMessageStatus(
      chatMessage.id,
      status,
      statusCode,
      statusText,
    );
    onStatusChange?.(chatMessages);
  };

  const requestDelegate = {
    onAccept(response) {
      setDeliveryStatus(
        "delivered",
        response.message.statusCode,
        response.message.reasonPhrase,
      );
    },
    onReject(response) {
      setDeliveryStatus(
        "error",
        response.message.statusCode,
        response.message.reasonPhrase,
      );
    },
  };

  const activeSession = getActiveSession();
  const sendPromise = activeSession
    ? activeSession.message({
        requestOptions: {
          body: {
            contentDisposition: "render",
            contentType: "text/plain",
            content: body,
          },
        },
        requestDelegate,
      })
    : new Messager(runtime.userAgent, target, body, "text/plain").message({
        requestDelegate,
      });

  return sendPromise
    .then(() => {
      const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
      if (stored[chatMessage.id]?.status === "sending") {
        setDeliveryStatus("delivered", 200, "OK");
      }
    })
    .catch((error) => {
      console.log("MESSAGE send ERROR !", error);
      const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
      if (stored[chatMessage.id]?.status === "sending") {
        const msg =
          error && typeof error.message === "string"
            ? error.message
            : String(error);
        setDeliveryStatus("error", null, msg);
      }
    });
};

export {
  cleanupMedia,
  clearCallsArr,
  clearChatMessages,
  clearRemoteStream,
  // Audio elements
  createAudioElements,
  createChatMessage,
  createRemoteStream,
  // Session functions
  endCall,
  getActiveSession,
  getConnectionCtl,
  getPhoneRuntime,
  handleIncomingSipMessage,
  Inviter,
  loadCallsArr,
  // MESSAGE functions
  loadChatMessages,
  // Call logging
  logCall,
  Messager,
  markCallsRead,
  // Connection control
  markVoluntaryDisconnect,
  // Codec modifiers
  opusCodecModifier,
  Registerer,
  RegistererState,
  resetPhoneRuntime,
  resetPhoneRuntimeSessions,
  // Re-export SIP.js types for convenience
  SessionState,
  saveChatMessage,
  setConnectionCtl,
  setLocalAudioEnabled,
  setPhoneRuntime,
  // Media functions
  setupRemoteMedia,
  transmitSipMessage,
  UserAgent,
  updateChatMessageStatus,
  Web,
};
