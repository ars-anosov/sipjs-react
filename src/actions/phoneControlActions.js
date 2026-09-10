import ky from "ky";
import {
  AUTHCTL_STORE_VALUE,
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
import {
  PHONE_CALLER_USER_NUM_KEY,
  PHONE_URI_DIR_KEY,
  PHONE_URI_WEBRTC_KEY,
} from "../constants/storage";
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
} from "../services/phoneStorage";
import { getApiErrorMessage } from "./utils/kyError";

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

const handleClkRegister = (formData, rdcr) => (dispatch, getState) => {
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

  const normalizedUriWebRtc =
    typeof formData.uriWebRtc === "string" ? formData.uriWebRtc.trim() : "";

  // Checks
  if (
    !normalizedUriWebRtc ||
    !formData.callerUserNum ||
    !formData.regUserPass
  ) {
    regAlert("Заполните все поля.");
    return;
  }
  localStorage.setItem(PHONE_URI_WEBRTC_KEY, normalizedUriWebRtc);
  localStorage.setItem(PHONE_CALLER_USER_NUM_KEY, formData.callerUserNum);
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
  // Воздействие на компоненту AuthAd
  const state = getState();
  dispatch({
    type: AUTHCTL_STORE_VALUE,
    payload: {
      storeDataKey: "responseData",
      storeDataValue: {
        ...(state?.authControlRdcr?.responseData || {}), // Если объекта нет, берем пустой {} и раскрываем его
        sip_username: formData.callerUserNum,
      },
    },
  });

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
        onConnectSuccess: ({ regNow, phoneHeader, icoHeader }) =>
          dispatch({
            type: PHONECTL_CONNECT_SUCCESS,
            payload: { regNow, phoneHeader, icoHeader },
          }),
        onConnectError: ({ regNow, phoneHeader, icoHeader }) =>
          dispatch({
            type: PHONECTL_CONNECT_ERROR,
            payload: { regNow, phoneHeader, icoHeader },
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
        onUnregistered: () => dispatch({ type: PHONECTL_UNREGISTER }),
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
  if (!rdcr.regNow) {
    regAlert("Нет активной регистрации.");
    return;
  }

  unregisterSip().then(() => {
    dispatch({ type: PHONECTL_UNREGISTER });
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

    const callee =
      typeof calleePhoneNum === "string"
        ? calleePhoneNum.trim()
        : String(calleePhoneNum ?? "").trim();

    if (!rdcr.regNow) {
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

    const dtmf =
      typeof tone === "string" ? tone.trim() : String(tone ?? "").trim();
    if (!/^[0-9A-D#*,]$/.test(dtmf)) {
      padAlert("Некорректный DTMF сигнал.");
      return;
    }

    sendDtmf(dtmf, options)
      .then(() => clearPadAlert())
      .catch((error) => {
        padAlert(
          error && typeof error.message === "string"
            ? error.message
            : "Не удалось отправить DTMF.",
        );
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
        padAlert(
          error && typeof error.message === "string"
            ? error.message
            : "Ошибка HOLD.",
        );
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

  const peer =
    typeof peerPhoneNum === "string"
      ? peerPhoneNum.trim()
      : String(peerPhoneNum ?? "").trim();
  const body =
    typeof messageBody === "string"
      ? messageBody.trim()
      : String(messageBody ?? "").trim();

  if (!rdcr.regNow) {
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

  const chatMessage = createChatMessage(peer, body, "out", "sending");
  appendChatMessage(chatMessage, dispatch);
  dispatch({
    type: PHONECTL_STORE_VALUE,
    payload: { storeDataKey: "calleePhoneNum", storeDataValue: peer },
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

const getPhoneDir = () => async () => {
  const url = localStorage.getItem(PHONE_URI_DIR_KEY);

  if (!url) {
    console.warn("No phone directory URI found in localStorage.");
    return [];
  }

  try {
    return await ky.get(url).json();
  } catch (error) {
    const detailMessage = await getApiErrorMessage(
      error,
      "Ошибка загрузки телефонного справочника.",
    );

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
  handleSendMessage,
  MessagesArrUpdate,
  markCallsRead,
};
