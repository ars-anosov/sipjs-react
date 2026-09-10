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
  logCall,
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

// ============================================================
// SIP.js High-Level Orchestration
// ============================================================

const getUriHostFromWebRtc = (uriWebRtc = "") => {
  if (!uriWebRtc) {
    return "";
  }

  try {
    return new URL(uriWebRtc).hostname || "";
  } catch {
    const match = String(uriWebRtc).match(/^wss?:\/\/([^:/]+)/i);
    return match?.[1] || "";
  }
};

const isSipConnected = () => Boolean(getPhoneRuntime().userAgent);

const isValidSipTarget = (peer, uriHost) =>
  Boolean(UserAgent.makeURI(`sip:${peer}@${uriHost}`));

// ------------------------------------------------------------
// Регистрация: UserAgent + Registerer + делегаты + реконнект
// ------------------------------------------------------------

const registerSipUserAgent = ({ formData, handlers }) => {
  const { callerUserNum, regUserPass, uriWebRtc, useIce } = formData;

  const uriHostFromWebRtc = getUriHostFromWebRtc(uriWebRtc);
  const uriStr = `sip:${callerUserNum}@${uriHostFromWebRtc}`;
  const uri = UserAgent.makeURI(uriStr);
  if (!uri) {
    throw new Error(`UserAgent URI:${uriStr}`);
  }

  const userAgentOptions = {
    uri,
    authorizationUsername: callerUserNum,
    authorizationPassword: regUserPass,
    displayName: callerUserNum,
    hackIpInContact: true,
    transportOptions: {
      server: uriWebRtc,
      // Эти "/r/n/r/n" ломают OpenSIPS и это не нужно т.к. REGISTER все равно будет слать запросы перергистрации через expires.
      // Полагаемся на браузерный встроенный keep alive.
      // keepAliveInterval: 30,
      // keepAliveDebounce: 10  // Не слать пинг, если активность была менее 10с назад
    },
    logLevel: process.env.NODE_ENV === "production" ? "error" : "debug",
  };

  const constrainsDefault = {
    audio: true,
    video: false,
  };

  const sessionOptions = {
    sessionDescriptionHandlerModifiers: [opusCodecModifier],
    sessionDescriptionHandlerOptions: {
      constraints: constrainsDefault,
    },
  };

  if (!useIce) {
    // 1. Ставим 1 мс. SIP.js мгновенно завершит ожидание и сформирует INVITE.
    sessionOptions.sessionDescriptionHandlerOptions.iceGatheringTimeout = 1;
    sessionOptions.sessionDescriptionHandlerOptions.peerConnectionConfiguration =
      {
        // 2. Используем стандартную политику
        iceTransportPolicy: "all",
        // 3. Вырезаем STUN/TURN, чтобы браузер не тратил время на внешние запросы
        iceServers: [],
        // 4. Ограничиваем пул кандидатов до нуля, блокируя сбор на уровне WebRTC
        iceCandidatePoolSize: 0,
      };
  }

  const { audioLocalIn, audioLocalOut, audioRemote } = createAudioElements();
  const remoteStream = createRemoteStream();

  const userAgent = new UserAgent(userAgentOptions);
  const connectionCtl = {
    shouldBeConnected: true,
    suppressReconnectOnNextDisconnect: false,
  };
  setConnectionCtl(userAgent, connectionCtl);
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
  });

  const reconnectionAttempts = 2;
  const reconnectionDelay = 4;

  let attemptingReconnection = false;
  let registrationInFlight = false;
  let registrationAccepted = false;

  const stopAfterRegistrationFailure = () => {
    connectionCtl.shouldBeConnected = false;
    connectionCtl.suppressReconnectOnNextDisconnect = true;

    return userAgent.stop().catch((e) => {
      console.log("userAgent.stop()", e);
    });
  };

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
      handlers.onConnectError({
        regNow: false,
        phoneHeader: "Disconnected",
        icoHeader: "Disconnected",
      });
      return;
    }

    handlers.onReconnectTry({
      phoneHeader: "Reconnection",
      icoHeader: "Reconnection",
    });

    attemptingReconnection = true;

    setTimeout(
      () => {
        if (!connectionCtl.shouldBeConnected) {
          attemptingReconnection = false;
          return;
        }

        if (!userAgent) {
          console.error("userAgent is null during reconnect attempt");
          attemptingReconnection = false;
          return;
        }

        // Attempt reconnect
        try {
          userAgent
            .reconnect()
            .then(() => {
              // console.log('userAgent.reconnect() success')
              attemptingReconnection = false;
            })
            .catch((error) => {
              console.error(
                "userAgent.reconnect() failed:",
                error.message || error,
              );
              attemptingReconnection = false;
              attemptReconnection(++reconnectionAttempt);
            });
        } catch (e) {
          console.error("userAgent.reconnect() error:", e.message || e);
          attemptingReconnection = false;
          attemptReconnection(++reconnectionAttempt);
        }
      },
      reconnectionAttempt === 1 ? 0 : reconnectionDelay * 1000,
    );
  };

  // ------------------------------------------------------------ handling for incoming INVITE requests
  userAgent.delegate = {
    onInvite(invitation) {
      const incomingSession = invitation;
      setPhoneRuntime({
        incomingSession,
      });

      incomingSession.delegate = {
        // Handle incoming REFER request.
        onRefer(_referral) {
          console.log("sip.js incomingSession <--- incoming REFER request.");
        },
      };

      incomingSession.stateChange.addListener((newState) => {
        switch (newState) {
          case SessionState.Establishing:
            // logCall
            break;
          case SessionState.Established:
            logCall(incomingSession, "incall", "in");
            handlers.onCallLogUpdate();
            setupRemoteMedia(incomingSession, audioRemote, remoteStream);
            break;
          case SessionState.Terminated: {
            logCall(incomingSession, "complete", "in");
            handlers.onCallLogUpdate();
            cleanupMedia(audioRemote, audioLocalIn, audioLocalOut);
            handlers.onCallEnded({
              outgoingSession: false,
              incomingSession,
              phoneHeader: userAgentOptions.authorizationUsername,
            });
            break;
          }
          default:
            break;
        }
      });

      audioLocalIn.play();
      logCall(incomingSession, "ringing", "in");
      handlers.onCallLogUpdate();
      handlers.onIncomeDisplay({
        calleePhoneNum:
          incomingSession.remoteIdentity.uri.raw.user +
          (incomingSession.remoteIdentity.displayName
            ? ` "${incomingSession.remoteIdentity.displayName}"`
            : ""),
      });
    },

    onMessage(message) {
      const { chatMessages } = handleIncomingSipMessage(message);

      playIncomingMessageSound();

      handlers.onMessage({ chatMessages });
    },
  };

  const registerer = new Registerer(userAgent, sessionOptions);
  setPhoneRuntime({ registerer });

  registerer.stateChange.addListener((newState) => {
    if (newState === RegistererState.Registered) {
      registrationAccepted = true;
    }

    if (newState === RegistererState.Unregistered) {
      registrationAccepted = false;
      registrationInFlight = false;

      if (
        connectionCtl.shouldBeConnected &&
        !connectionCtl.suppressReconnectOnNextDisconnect
      ) {
        handlers.onConnectError({
          regNow: false,
          phoneHeader: "Registration expired",
          icoHeader: "Registration expired",
        });
        attemptReconnection();
      }
    }
  });

  userAgent.delegate.onConnect = () => {
    if (
      !connectionCtl.shouldBeConnected ||
      registrationAccepted ||
      registrationInFlight
    ) {
      return;
    }

    if (!registerer) {
      console.error("Registerer not available on connect");
      return;
    }

    registrationInFlight = true;
    try {
      registerer
        .register({
          requestDelegate: {
            onAccept(response) {
              // console.log('register.onAccept()',response)
              registrationInFlight = false;
              registrationAccepted = true;
              handlers.onConnectSuccess({
                regNow: true,
                phoneHeader: response.message.from.displayName,
                icoHeader: response.message.from.displayName,
              });
            },
            onReject(response) {
              console.error(
                "SIP Registration rejected:",
                response.message.statusCode +
                  " " +
                  response.message.reasonPhrase,
              );
              registrationInFlight = false;
              registrationAccepted = false;
              handlers.onConnectError({
                regNow: false,
                phoneHeader:
                  response.message.statusCode +
                  " " +
                  response.message.reasonPhrase,
                icoHeader:
                  response.message.statusCode +
                  " " +
                  response.message.reasonPhrase,
              });
              // Принудительно отключаю, чтобы сбросить старые атрибуты user/secret
              setTimeout(() => {
                stopAfterRegistrationFailure().finally(() => {
                  handlers.onUnregistered();
                  resetPhoneRuntime();
                });
              }, 3000);
            },
          },
        })
        .catch((e) => {
          console.error("SIP Registration error:", e.message || e);
          registrationInFlight = false;
          registrationAccepted = false;
          handlers.onConnectError({
            regNow: false,
            phoneHeader: "Registration error",
            icoHeader: "Registration error",
          });
          // Принудительно отключаю, чтобы сбросить старые атрибуты user/secret
          setTimeout(() => {
            stopAfterRegistrationFailure().finally(() => {
              handlers.onUnregistered();
              resetPhoneRuntime();
            });
          }, 3000);
        });
    } catch (e) {
      console.error("SIP Registerer register() error:", e.message || e);
      registrationInFlight = false;
      registrationAccepted = false;
    }
  };

  userAgent.delegate.onDisconnect = (error) => {
    if (connectionCtl.suppressReconnectOnNextDisconnect) {
      connectionCtl.suppressReconnectOnNextDisconnect = false;
      return;
    }

    registrationAccepted = false;
    registrationInFlight = false;
    attemptingReconnection = false;

    console.error(
      "WebSocket disconnected:",
      error ? error.message : "unknown reason",
    );

    handlers.onConnectError({
      regNow: false,
      phoneHeader: "Disconnected",
      icoHeader: "Disconnected",
    });

    if (error && connectionCtl.shouldBeConnected) {
      try {
        attemptReconnection();
      } catch (e) {
        console.error("Error triggering reconnection:", e.message || e);
      }
    }
  };

  handlers.onConnectRequest({
    phoneHeader: "UserAgent starting...",
    icoHeader: "UserAgent starting...",
  });

  userAgent
    .start()
    .then(() => {
      handlers.onRegisterStarted();
    })
    .catch((e) => {
      console.error("userAgent.start() failed:", e.message || e);
      connectionCtl.shouldBeConnected = false;
      handlers.onConnectError({
        regNow: false,
        phoneHeader: "SIP proxy WebSocket problem",
        icoHeader: "SIP proxy WebSocket problem",
      });
      handlers.onUnregistered();
      resetPhoneRuntime();
    });
};

// ------------------------------------------------------------
// Де-регистрация
// ------------------------------------------------------------

const unregisterSip = async () => {
  const runtime = getPhoneRuntime();

  if (runtime.outgoingSession) endCall(runtime.outgoingSession);
  if (runtime.incomingSession) endCall(runtime.incomingSession);
  if (runtime.audioLocalIn) runtime.audioLocalIn.pause();
  if (runtime.audioLocalOut) runtime.audioLocalOut.pause();

  if (!runtime.userAgent) {
    resetPhoneRuntime();
    return;
  }

  markVoluntaryDisconnect(runtime.userAgent);

  const registerer = runtime.registerer;
  const finishStop = () => runtime.userAgent.stop();

  try {
    if (registerer) {
      await registerer.unregister();
    }
  } catch (e) {
    console.log("unregister.catch()", e);
  }

  try {
    await finishStop();
  } catch (e) {
    console.log("userAgent.stop()", e);
  }

  resetPhoneRuntime();
};

// ------------------------------------------------------------
// Ответ на входящий вызов
// ------------------------------------------------------------

const answerIncomingCall = () => {
  const runtime = getPhoneRuntime();
  if (runtime.audioLocalIn) runtime.audioLocalIn.pause();
  if (runtime.incomingSession) {
    runtime.incomingSession.accept(runtime.sessionOptions);
  }
};

// ------------------------------------------------------------
// Исходящий вызов
// ------------------------------------------------------------

const placeOutgoingCall = (
  calleePhoneNum,
  { callerUserNum = "", onOutgoingSubmit, onCallLogUpdate, onCallEnded, onInviteError } = {},
) => {
  const runtime = getPhoneRuntime();

  const server = runtime.userAgentOptions?.transportOptions?.server || "";
  const uriHost = getUriHostFromWebRtc(server);
  const targetStr = `sip:${calleePhoneNum}@${uriHost}`;
  const target = UserAgent.makeURI(targetStr);
  if (!target) {
    throw new Error(`Некорректный SIP URI: ${targetStr}`);
  }

  onOutgoingSubmit?.();

  runtime.audioLocalOut.play();

  const outgoingSession = new Inviter(
    runtime.userAgent,
    target,
    runtime.sessionOptions,
  );
  setPhoneRuntime({
    outgoingSession,
  });

  outgoingSession.delegate = {
    // Handle incoming REFER request.
    onRefer(_referral) {
      console.log("sip.js outgoingSession <--- incoming REFER request.");
    },
  };

  outgoingSession.stateChange.addListener((newState) => {
    switch (newState) {
      case SessionState.Establishing:
        logCall(outgoingSession, "ringing", "out");
        onCallLogUpdate?.();
        break;
      case SessionState.Established:
        logCall(outgoingSession, "incall", "out");
        onCallLogUpdate?.();
        runtime.audioLocalOut.pause();
        setupRemoteMedia(
          outgoingSession,
          runtime.audioRemote,
          runtime.remoteStream,
        );
        break;
      case SessionState.Terminated: {
        logCall(outgoingSession, "complete", "out");
        onCallLogUpdate?.();
        cleanupMedia(
          runtime.audioRemote,
          runtime.audioLocalIn,
          runtime.audioLocalOut,
        );
        onCallEnded?.({
          outgoingSession,
          incomingSession: false,
          phoneHeader: callerUserNum,
        });
        break;
      }
      default:
        break;
    }
  });

  // Send the INVITE request
  outgoingSession
    .invite()
    .then(() => {
      // INVITE sent
    })
    .catch((error) => {
      // ПРОВЕРКА: Если сессия закрыта нами, не считаем это ошибкой
      const isTerminated =
        outgoingSession.state === SessionState.Terminating ||
        outgoingSession.state === SessionState.Terminated;
      if (isTerminated) {
        console.log("Игнорируем ошибку в состоянии Terminating/Terminated");
        return;
      }

      // В противном случае — это реальная проблема (сеть, сервер и т.д.)
      console.log("inviter INVITE send ERROR !", error);
      const msg =
        error && typeof error.message === "string"
          ? error.message
          : String(error);
      onInviteError?.(msg);
      onCallEnded?.({
        outgoingSession,
        incomingSession: false,
        phoneHeader: callerUserNum,
      });
    });
};

// ------------------------------------------------------------
// Завершение звонка / сброс сессий
// ------------------------------------------------------------

const resetSipCall = (callData = {}) => {
  const runtime = getPhoneRuntime();
  const {
    outgoingSession = runtime.outgoingSession,
    incomingSession = runtime.incomingSession,
  } = callData;

  if (outgoingSession) endCall(outgoingSession);
  if (incomingSession) endCall(incomingSession);
  if (runtime.audioLocalIn) runtime.audioLocalIn.pause();
  if (runtime.audioLocalOut) runtime.audioLocalOut.pause();
  resetPhoneRuntimeSessions();
};

// ------------------------------------------------------------
// DTMF
// ------------------------------------------------------------

const sendDtmf = (tone, options = {}) => {
  const session = getActiveSession();
  if (!session) {
    return Promise.reject(new Error("Нет активного звонка для DTMF."));
  }

  if (options.useSessionDescriptionHandler) {
    const sent = session.sessionDescriptionHandler?.sendDtmf(
      tone,
      options.dtmfOptions,
    );
    if (!sent) {
      return Promise.reject(new Error("Не удалось отправить DTMF."));
    }
    return Promise.resolve();
  }

  const duration = options.duration ?? 200;
  const requestOptions = {
    body: {
      contentDisposition: "render",
      contentType: "application/dtmf-relay",
      content: `Signal=${tone}\r\nDuration=${duration}`,
    },
  };

  return session.info({ requestOptions }).catch((error) => {
    console.log("dtmf INFO send ERROR !", error);
    throw new Error("Не удалось отправить DTMF.");
  });
};

// ------------------------------------------------------------
// Hold / Resume
// ------------------------------------------------------------

const setHold = (hold = true) => {
  const session = getActiveSession();
  if (!session) {
    return Promise.reject(new Error("Нет активного звонка для HOLD."));
  }

  const sessionDescriptionHandlerModifiers = hold
    ? [opusCodecModifier, Web.holdModifier]
    : [opusCodecModifier];

  return session
    .invite({ sessionDescriptionHandlerModifiers })
    .then(() => {
      setLocalAudioEnabled(session, !hold);
    })
    .catch((error) => {
      console.log("hold re-INVITE send ERROR !", error);
      throw new Error(
        hold
          ? "Не удалось поставить звонок на HOLD."
          : "Не удалось снять звонок с HOLD.",
      );
    });
};

export {
  answerIncomingCall,
  createChatMessage,
  getUriHostFromWebRtc,
  isSipConnected,
  isValidSipTarget,
  placeOutgoingCall,
  registerSipUserAgent,
  resetSipCall,
  sendDtmf,
  setHold,
  transmitSipMessage,
  unregisterSip,
};
