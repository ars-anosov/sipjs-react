import {
  LK_STORE_VALUE,
  LKROOM_CREATE_ERROR,
  LKROOM_CREATE_REQUEST,
  LKROOM_CREATE_SUCCESS,
  LKTOKEN_CLEAR,
  LKTOKEN_SUBMIT_ERROR,
  LKTOKEN_SUBMIT_REQUEST,
  LKTOKEN_SUBMIT_SUCCESS,
} from "../constants/redux";
import { getLkTokenExpiresAt, removeStoredLkInvite, requestLkToken, storeLkInvite, storeLkTokenUri } from "../services/lkToken";
import { getUriHostFromWebRtc, isSipConnected } from "../services/phoneRuntime";
import { getApiErrorMessage } from "./utils/kyError";

const buildInviteSipMessageBody = (room, responseData) => {
  if (responseData && typeof responseData === "object") {
    const lines = [`Приглашение на встречу`];
    lines.push(`<a href="/?lk_room=${room}&lk_token=${responseData.lk_token}">${room}</a>`);
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
    const uriLkToken = typeof formData.uriLkToken === "string" ? formData.uriLkToken.trim() : "";
    const uriWebRtc = typeof formData.uriWebRtc === "string" ? formData.uriWebRtc.trim() : "";

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

      // Приглашения копятся в списке: на номер — одно актуальное (повторное вытесняет прежнее).
      // Список в срезе и в localStorage — один и тот же, нормализует его сервис.
      const invites = storeLkInvite({
        num: responseData?.lk_num || num,
        room: responseData?.lk_room || room,
        token: responseData?.lk_token || "",
        expiresAt: getLkTokenExpiresAt(responseData?.lk_token),
        createdAt: Date.now(),
      });

      dispatch({
        type: LKTOKEN_SUBMIT_SUCCESS,
        payload: { message: "Успешно", invites },
      });

      // Отправку SIP MESSAGE с приглашением ведёт домен телефона (запись чата и статусы
      // доставки живут в phoneControlRdcr). Здесь только готовим текст со ссылкой и
      // возвращаем его вызывающему коду — мост LK_ → PHONECTL_ делает LkContainer.
      const uriHost = getUriHostFromWebRtc(uriWebRtc);
      if (!isSipConnected() || !uriHost || !num) return null;

      return { num, body: buildInviteSipMessageBody(room, responseData) };
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

// Своя комната: токен выдаёт /user/lk, поэтому и num, и room — свой номер.
// Результат возвращается вызывающему коду: LkMeet кладёт
// токен в query маршрута, в сторе остаётся только статус запроса.
const handleLkRoomCreate =
  ({ num, room, uriLkToken }) =>
  async (dispatch) => {
    const ownNum = typeof num === "string" ? num.trim() : "";
    const ownRoom = typeof room === "string" ? room.trim() : "";
    const tokenUri = typeof uriLkToken === "string" ? uriLkToken.trim() : "";

    if (!ownNum || !ownRoom) {
      dispatch({
        type: LKROOM_CREATE_ERROR,
        payload: { message: "Не задан свой номер." },
      });
      return null;
    }

    if (!tokenUri) {
      dispatch({
        type: LKROOM_CREATE_ERROR,
        payload: { message: "Не задан uriLkToken." },
      });
      return null;
    }

    dispatch({ type: LKROOM_CREATE_REQUEST });

    try {
      const responseData = await requestLkToken({ num: ownNum, room: ownRoom, uriLkToken: tokenUri });

      dispatch({
        type: LKROOM_CREATE_SUCCESS,
        payload: { message: "Успешно" },
      });

      return responseData;
    } catch (error) {
      dispatch({
        type: LKROOM_CREATE_ERROR,
        payload: { message: await getApiErrorMessage(error) },
      });
      return null;
    }
  };

// Крестик в строке приглашения: сначала сервис (localStorage), потом срез — списки совпадают
const handleRemoveInvite = (num) => (dispatch) => {
  if (typeof num !== "string" || !num) return;

  dispatch({
    type: LK_STORE_VALUE,
    payload: { storeDataKey: "invites", storeDataValue: removeStoredLkInvite(num) },
  });
};

const handleChangeStore = (storeDataKey, storeDataValue) => (dispatch) => {
  dispatch({
    type: LK_STORE_VALUE,
    payload: { storeDataKey, storeDataValue },
  });
};

export { handleChangeStore, handleLkRoomCreate, handleLkTokenClear, handleLkTokenSubmit, handleRemoveInvite };
