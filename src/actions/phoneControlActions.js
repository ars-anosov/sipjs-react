import {
  PHONECTL_CALLLOG_UPD,
  PHONECTL_CHAT_UNREAD_CLEAR,
  PHONECTL_CLEAR_CHAT,
  PHONECTL_CLK_RESET,
  PHONECTL_CONNECT_ERROR,
  PHONECTL_CONNECT_REQUEST,
  PHONECTL_CONNECT_SUCCESS,
  PHONECTL_ERROR_ALERT,
  PHONECTL_INCOME_DISPLAY,
  PHONECTL_INCOME_SUBMIT,
  PHONECTL_MESSAGE_ADD,
  PHONECTL_MESSAGE_UPDATE,
  PHONECTL_MESSAGES_LOAD,
  PHONECTL_OUTGO_SUBMIT,
  PHONECTL_RECONNECT_TRY,
  PHONECTL_STORE_VALUE,
  PHONECTL_UNREGISTER,
} from "../constants/redux";
import { fetchPhoneDir, getStoredPhoneDirUri } from "../services/phoneDirectory";
import {
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
} from "../services/phoneRuntime";
import {
  clearCallsArr,
  clearChatMessages,
  // Call logging
  loadCallsArr,
  loadChatMessages,
  markCallsRead as markCallsReadInStorage,
  saveCallsArr,
  saveChatMessage,
  storeCallerUserNum,
  storeUriWebRtc,
} from "../services/phoneStorage";
import { getApiErrorMessage } from "./utils/kyError";

// Регистрация активна: единственный источник истины — phoneControlRdcr.regState
const isRegistered = (rdcr) => rdcr.regState === "ok";

const MessagesArrUpdate = () => (dispatch) => {
  dispatch({
    type: PHONECTL_MESSAGES_LOAD,
    payload: {
      chatMessages: loadChatMessages(),
    },
  });
};

const appendChatMessage = (message, dispatch) => {
  const chatMessages = saveChatMessage(message);

  dispatch({
    type: PHONECTL_MESSAGE_ADD,
    payload: {
      chatMessages,
      incoming: message.direction === "in",
    },
  });
};

// Общий хвост отправки: запись в чат (localStorage + PHONECTL_MESSAGE_ADD), текущий
// собеседник и транспорт со статусами доставки (PHONECTL_MESSAGE_UPDATE)
const sendChatMessage = (chatMessage, uriHost, dispatch) => {
  appendChatMessage(chatMessage, dispatch);

  dispatch({
    type: PHONECTL_STORE_VALUE,
    payload: { storeDataKey: "calleePhoneNum", storeDataValue: chatMessage.peer },
  });

  transmitSipMessage({
    chatMessage,
    uriHost,
    onStatusChange: (chatMessages) => {
      dispatch({
        type: PHONECTL_MESSAGE_UPDATE,
        payload: { chatMessages },
      });
    },
  });
};

const CallsArrUpdate = () => (dispatch, getState) => {
  const displayHistory = getState().phoneControlRdcr.displayHistory;
  let callsArr = loadCallsArr();

  if (displayHistory) {
    callsArr = callsArr.map((row) => ({ ...row, read: true }));
    saveCallsArr(callsArr);
  }

  dispatch({
    type: PHONECTL_CALLLOG_UPD,
    payload: {
      callsArr,
    },
  });
};

const markCallsRead = () => (dispatch) => {
  dispatch({
    type: PHONECTL_CALLLOG_UPD,
    payload: {
      callsArr: markCallsReadInStorage(),
    },
  });
};

const handleClkRegister = (formData, rdcr) => (dispatch) => {
  const regAlert = (errText) => {
    dispatch({
      type: PHONECTL_ERROR_ALERT,
      payload: {
        errComponent: "PhoneReg",
        errText,
      },
    });
  };

  const clearRegAlert = () => {
    dispatch({
      type: PHONECTL_ERROR_ALERT,
      payload: {
        errComponent: "",
        errText: "",
      },
    });
  };

  const normalizedUriWebRtc = typeof formData.uriWebRtc === "string" ? formData.uriWebRtc.trim() : "";

  // Checks
  if (!normalizedUriWebRtc || !formData.callerUserNum || !formData.regUserPass) {
    regAlert("Заполните все поля.");
    return;
  }
  storeUriWebRtc(normalizedUriWebRtc);
  storeCallerUserNum(formData.callerUserNum);
  dispatch({
    type: PHONECTL_STORE_VALUE,
    payload: { storeDataKey: "uriWebRtc", storeDataValue: normalizedUriWebRtc },
  });
  dispatch({
    type: PHONECTL_STORE_VALUE,
    payload: {
      storeDataKey: "callerUserNum",
      storeDataValue: formData.callerUserNum,
    },
  });
  // Синхронизация sip_username в authControlRdcr.responseData — в AuthContainer
  // (мост PHONECTL_ → AUTHCTL_), см. AuthPad.

  clearRegAlert();

  try {
    registerSipUserAgent({
      formData: {
        callerUserNum: formData.callerUserNum,
        regUserPass: formData.regUserPass,
        uriWebRtc: normalizedUriWebRtc,
        useIce: rdcr.useIce,
      },
      handlers: {
        onConnectRequest: ({ phoneHeader, icoHeader }) =>
          dispatch({
            type: PHONECTL_CONNECT_REQUEST,
            payload: { phoneHeader, icoHeader },
          }),
        onConnectSuccess: ({ phoneHeader, icoHeader }) =>
          dispatch({
            type: PHONECTL_CONNECT_SUCCESS,
            payload: { phoneHeader, icoHeader },
          }),
        onConnectError: ({ phoneHeader, icoHeader }) =>
          dispatch({
            type: PHONECTL_CONNECT_ERROR,
            payload: { phoneHeader, icoHeader },
          }),
        onReconnectTry: ({ phoneHeader, icoHeader }) =>
          dispatch({
            type: PHONECTL_RECONNECT_TRY,
            payload: { phoneHeader, icoHeader },
          }),
        onIncomeDisplay: ({ calleePhoneNum }) =>
          dispatch({
            type: PHONECTL_INCOME_DISPLAY,
            payload: { calleePhoneNum },
          }),
        onMessage: ({ chatMessages }) =>
          dispatch({
            type: PHONECTL_MESSAGE_ADD,
            payload: { chatMessages, incoming: true },
          }),
        onCallLogUpdate: () => dispatch(CallsArrUpdate()),
        onCallEnded: (callData) => dispatch(handleClkReset(callData, rdcr)),
        // Потеря/неудача регистрации: PhoneReg не форсируем — мост
        // PHONECTL_ → AUTHCTL_ в AuthContainer покажет AuthPad с красным тумблером
        onUnregistered: () =>
          dispatch({
            type: PHONECTL_UNREGISTER,
            payload: { registrationLost: true },
          }),
        onRegisterStarted: () => clearRegAlert(),
      },
    });
  } catch (e) {
    regAlert(typeof e?.message === "string" ? e.message : "Ошибка регистрации.");
  }
};

const handleClkUnregister = (rdcr) => (dispatch) => {
  const regAlert = (errText) => {
    dispatch({
      type: PHONECTL_ERROR_ALERT,
      payload: {
        errComponent: "PhoneReg",
        errText,
      },
    });
  };

  const clearRegAlert = () => {
    dispatch({
      type: PHONECTL_ERROR_ALERT,
      payload: {
        errComponent: "",
        errText: "",
      },
    });
  };

  if (!isSipConnected()) {
    regAlert("Нет подключения к SIP.");
    return;
  }
  if (!isRegistered(rdcr)) {
    regAlert("Нет активной регистрации.");
    return;
  }

  unregisterSip().then(() => {
    dispatch({ type: PHONECTL_UNREGISTER });
    // Явная разрегистрация возвращает тумблер AuthPad в 'off'
    dispatch({
      type: PHONECTL_STORE_VALUE,
      payload: { storeDataKey: "regState", storeDataValue: "off" },
    });
    clearRegAlert();
  });
};

const handleClkSubmitIn = (_rdcr) => (dispatch) => {
  dispatch({
    type: PHONECTL_INCOME_SUBMIT,
    payload: {
      incomeDisplay: false,
      incomeCallNow: true,
    },
  });
  answerIncomingCall();
};

const handleClkSubmitOut = (calleePhoneNum, rdcr) => {
  // calleePhoneNum передаю отдельным аргументом т.к. rdcr.calleePhoneNum прилетит позже при след.рендере.

  return (dispatch) => {
    const padAlert = (errText) => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: "PhonePad",
          errText,
        },
      });
    };

    const clearPadAlert = () => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: "",
          errText: "",
        },
      });
    };

    const callee = typeof calleePhoneNum === "string" ? calleePhoneNum.trim() : String(calleePhoneNum ?? "").trim();

    if (!isRegistered(rdcr)) {
      padAlert("Нет регистрации. Сначала зарегистрируйтесь.");
      return;
    }
    if (!isSipConnected()) {
      padAlert("Нет подключения к SIP.");
      return;
    }
    if (!rdcr.callerUserNum) {
      padAlert("Не задан внутренний номер.");
      return;
    }
    if (!callee) {
      padAlert("Введите номер абонента.");
      return;
    }

    try {
      placeOutgoingCall(callee, {
        callerUserNum: rdcr.callerUserNum,
        onOutgoingSubmit: () => {
          clearPadAlert();
          dispatch({
            type: PHONECTL_OUTGO_SUBMIT,
            payload: {
              outgoCallNow: true,
            },
          });
        },
        onCallLogUpdate: () => dispatch(CallsArrUpdate()),
        onCallEnded: (callData) => dispatch(handleClkReset(callData, rdcr)),
        onInviteError: (msg) => padAlert(`Не удалось отправить вызов: ${msg}`),
      });
    } catch (e) {
      padAlert(typeof e?.message === "string" ? e.message : "Ошибка вызова.");
    }
  };
};

const handleClkReset = (callData, _rdcr) => (dispatch) => {
  const { phoneHeader } = callData;

  resetSipCall(callData);

  dispatch({
    type: PHONECTL_CLK_RESET,
    payload: {
      phoneHeader: phoneHeader,
      icoHeader: phoneHeader,
      calleePhoneNum: "",
      incomeDisplay: false,
      outgoCallNow: false,
      incomeCallNow: false,
      errComponent: "",
      errText: "",
    },
  });
};

const handleClkDtmf =
  (tone, _rdcr, options = {}) =>
  (dispatch) => {
    const padAlert = (errText) => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: "PhonePad",
          errText,
        },
      });
    };

    const clearPadAlert = () => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: "",
          errText: "",
        },
      });
    };

    const dtmf = typeof tone === "string" ? tone.trim() : String(tone ?? "").trim();
    if (!/^[0-9A-D#*,]$/.test(dtmf)) {
      padAlert("Некорректный DTMF сигнал.");
      return;
    }

    sendDtmf(dtmf, options)
      .then(() => clearPadAlert())
      .catch((error) => {
        padAlert(error && typeof error.message === "string" ? error.message : "Не удалось отправить DTMF.");
      });
  };

const handleClkHold =
  (_rdcr, hold = true) =>
  (dispatch) => {
    const padAlert = (errText) => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: "PhonePad",
          errText,
        },
      });
    };

    const clearPadAlert = () => {
      dispatch({
        type: PHONECTL_ERROR_ALERT,
        payload: {
          errComponent: "",
          errText: "",
        },
      });
    };

    setHold(hold)
      .then(() => {
        dispatch({
          type: PHONECTL_STORE_VALUE,
          payload: { storeDataKey: "callHoldNow", storeDataValue: hold },
        });
        clearPadAlert();
      })
      .catch((error) => {
        padAlert(error && typeof error.message === "string" ? error.message : "Ошибка HOLD.");
      });
  };

const handleChangeStore = (storeDataKey, storeDataValue) => (dispatch) => {
  dispatch({
    type: PHONECTL_STORE_VALUE,
    payload: { storeDataKey: storeDataKey, storeDataValue: storeDataValue },
  });
};

const handleChatUnreadClear = () => (dispatch) => {
  dispatch({ type: PHONECTL_CHAT_UNREAD_CLEAR });
};

const handleClearChat = () => (dispatch) => {
  clearChatMessages();
  dispatch({ type: PHONECTL_CLEAR_CHAT });
};

const handleClearHistory = () => (dispatch) => {
  clearCallsArr();
  dispatch({
    type: PHONECTL_STORE_VALUE,
    payload: { storeDataKey: "callsArr", storeDataValue: [] },
  });
};

const handleSendMessage = (peerPhoneNum, messageBody, rdcr) => (dispatch) => {
  const chatAlert = (errText) => {
    dispatch({
      type: PHONECTL_ERROR_ALERT,
      payload: {
        errComponent: "PhoneChat",
        errText,
      },
    });
  };

  const clearChatAlert = () => {
    dispatch({
      type: PHONECTL_ERROR_ALERT,
      payload: {
        errComponent: "",
        errText: "",
      },
    });
  };

  const peer = typeof peerPhoneNum === "string" ? peerPhoneNum.trim() : String(peerPhoneNum ?? "").trim();
  const body = typeof messageBody === "string" ? messageBody.trim() : String(messageBody ?? "").trim();

  if (!isRegistered(rdcr)) {
    chatAlert("Нет регистрации. Сначала зарегистрируйтесь.");
    return;
  }
  if (!isSipConnected()) {
    chatAlert("Нет подключения к SIP.");
    return;
  }
  if (!peer) {
    chatAlert("Введите номер абонента.");
    return;
  }
  if (!body) {
    chatAlert("Введите текст сообщения.");
    return;
  }

  const uriHost = getUriHostFromWebRtc(rdcr.uriWebRtc);
  if (!isValidSipTarget(peer, uriHost)) {
    chatAlert(`Некорректный SIP URI: sip:${peer}@${uriHost}`);
    return;
  }

  clearChatAlert();

  sendChatMessage(createChatMessage(peer, body, "out", "sending"), uriHost, dispatch);
};

// Приглашение в комнату LK (мост LK_ → PHONECTL_ живёт в LkContainer): адресат и текст со
// ссылкой приходят из LK-домена, а запись чата, отправка и статусы доставки — здесь.
const handleSendInviteMessage = (inviteMessage, rdcr) => (dispatch) => {
  const peer = typeof inviteMessage?.num === "string" ? inviteMessage.num.trim() : "";
  const body = typeof inviteMessage?.body === "string" ? inviteMessage.body.trim() : "";

  if (!peer || !body || !isSipConnected()) return;

  const uriHost = getUriHostFromWebRtc(rdcr.uriWebRtc);
  if (!isValidSipTarget(peer, uriHost)) {
    console.warn(`Некорректный SIP URI приглашения: sip:${peer}@${uriHost}`);
    return;
  }

  sendChatMessage(createChatMessage(peer, body, "out", "sending"), uriHost, dispatch);
};

const getPhoneDir = () => async () => {
  const url = getStoredPhoneDirUri();

  if (!url) {
    console.warn("Адрес телефонного справочника не задан.");
    return [];
  }

  try {
    return await fetchPhoneDir(url);
  } catch (error) {
    const detailMessage = await getApiErrorMessage(error, "Ошибка загрузки телефонного справочника.");

    console.error("Error fetching phone directory:", detailMessage);
    throw new Error(detailMessage);
  }
};

export {
  CallsArrUpdate,
  getPhoneDir,
  handleChangeStore,
  handleChatUnreadClear,
  handleClearChat,
  handleClearHistory,
  handleClkDtmf,
  handleClkHold,
  handleClkRegister,
  handleClkReset,
  handleClkSubmitIn,
  handleClkSubmitOut,
  handleClkUnregister,
  handleSendInviteMessage,
  handleSendMessage,
  MessagesArrUpdate,
  markCallsRead,
};
