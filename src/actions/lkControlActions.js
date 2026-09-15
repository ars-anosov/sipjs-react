import {
  LK_STORE_VALUE,
  LKTOKEN_CLEAR,
  LKTOKEN_SUBMIT_ERROR,
  LKTOKEN_SUBMIT_REQUEST,
  LKTOKEN_SUBMIT_SUCCESS,
} from "../constants/redux";
import { requestLkToken, storeLkTokenUri } from "../services/lkToken";
import {
  createChatMessage,
  getUriHostFromWebRtc,
  isSipConnected,
  transmitSipMessage,
} from "../services/phoneRuntime";
import { getApiErrorMessage } from "./utils/kyError";

const buildInviteSipMessageBody = (room, responseData) => {
  if (responseData && typeof responseData === "object") {
    const lines = [`Приглашение на встречу`];
    lines.push("");
    lines.push(
      `<a href="/?lk_room=${room}&lk_token=${responseData.lk_token}">${room}</a>`,
    );
    return lines.join("\n");
  }

  return `room=${room}`;
};

// uriWebRtc — данные чужого среза (phoneControlRdcr): thunk не читает стор напрямую,
// мост между срезами делает контейнер и передаёт значение аргументом.
const handleLkTokenSubmit =
  (formData = {}) =>
  async (dispatch) => {
    const num = typeof formData.num === "string" ? formData.num.trim() : "";
    const room = typeof formData.room === "string" ? formData.room.trim() : "";
    const uriLkToken =
      typeof formData.uriLkToken === "string" ? formData.uriLkToken.trim() : "";
    const uriWebRtc =
      typeof formData.uriWebRtc === "string" ? formData.uriWebRtc.trim() : "";

    if (!num || !room) {
      dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: { message: "Заполните num и room." },
      });
      return;
    }

    if (!uriLkToken) {
      dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: { message: "Не задан uriLkToken." },
      });
      return;
    }
    storeLkTokenUri(formData.uriLkToken);

    dispatch({ type: LKTOKEN_SUBMIT_REQUEST });

    try {
      const responseData = await requestLkToken({ num, room, uriLkToken });

      dispatch({
        type: LKTOKEN_SUBMIT_SUCCESS,
        payload: {
          message: "Успешно",
          responseData: responseData,
        },
      });

      // Отправка SIP MESSAGE с приглашением в комнату
      const uriHost = getUriHostFromWebRtc(uriWebRtc);
      const canSendSipMessage = Boolean(isSipConnected() && uriHost && num);

      if (canSendSipMessage) {
        const chatMessage = createChatMessage(
          num,
          buildInviteSipMessageBody(room, responseData),
          "out",
          "sending",
        );

        try {
          await transmitSipMessage({ chatMessage, uriHost });
        } catch (sipError) {
          console.warn("Lk invite SIP MESSAGE send error:", sipError);
        }
      }
      // END OF Отправка SIP MESSAGE
    } catch (error) {
      const detailMessage = await getApiErrorMessage(error);

      dispatch({
        type: LKTOKEN_SUBMIT_ERROR,
        payload: { message: detailMessage },
      });
    }
  };

const handleLkTokenClear = () => (dispatch) => {
  dispatch({ type: LKTOKEN_CLEAR });
};

const handleChangeStore = (storeDataKey, storeDataValue) => (dispatch) => {
  dispatch({
    type: LK_STORE_VALUE,
    payload: { storeDataKey, storeDataValue },
  });
};

export { handleChangeStore, handleLkTokenClear, handleLkTokenSubmit };
