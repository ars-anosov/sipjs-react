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
  getChatMessageStatus,
  saveChatMessage,
  updateChatMessageStatus,
} from "./phoneStorage";

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

const playIncomingMessageSound = () => {
  const messageSound = new Audio("sounds/sipjs/message.mp3");
  messageSound.preload = "auto";
  messageSound.play().catch(() => {});
};

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
      if (getChatMessageStatus(chatMessage.id) === "sending") {
        setDeliveryStatus("delivered", 200, "OK");
      }
    })
    .catch((error) => {
      console.log("MESSAGE send ERROR !", error);
      if (getChatMessageStatus(chatMessage.id) === "sending") {
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
  Messager,
  // Connection control
  markVoluntaryDisconnect,
  // Codec modifiers
  opusCodecModifier,
  playIncomingMessageSound,
  Registerer,
  RegistererState,
  resetPhoneRuntime,
  resetPhoneRuntimeSessions,
  // Re-export SIP.js types for convenience
  SessionState,
  setConnectionCtl,
  setLocalAudioEnabled,
  setPhoneRuntime,
  // Media functions
  setupRemoteMedia,
  transmitSipMessage,
  UserAgent,
  Web,
};
