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

// Только UI-дефолты: сохранённое (uriLk, uriLkToken и список приглашений `invites`) подставляет
// сид стора — store/preloadedState.js → preloadedState в configureStore.
// createStatus/createMessage — своя комната через /user/lk, её результат уходит в query, поэтому
// с `invites` (LKTOKEN_SUBMIT_SUCCESS) они не смешиваются. Список приходит в payload уже
// нормализованным сервисом (одно приглашение на номер, лимит) — редьюсер его просто кладёт.
export const initialState = {
  displayControl: false,
  displayLkToken: false,
  uriLk: "",
  uriLkToken: "",
  status: "idle",
  message: "",
  invites: [],
  createStatus: "idle",
  createMessage: "",
};

export default function lkTokenRdcr(state = initialState, action) {
  switch (action.type) {
    case LKTOKEN_SUBMIT_REQUEST:
      return {
        ...state,
        status: "loading",
        displayLkToken: true,
        message: "",
      };

    case LKTOKEN_SUBMIT_SUCCESS:
      return {
        ...state,
        status: "success",
        displayLkToken: false,
        message: action.payload.message || "Успешно",
        invites: action.payload.invites || state.invites,
      };

    case LKTOKEN_SUBMIT_ERROR:
      return {
        ...state,
        status: "error",
        displayLkToken: true,
        message: action.payload.message || "Ошибка",
      };

    case LKTOKEN_CLEAR:
      // Сохранённые данные не теряем: сбрасываем только результат запроса, а список
      // приглашений — такая же сохранённая сущность, как конфиг.
      return {
        ...initialState,
        uriLk: state.uriLk,
        uriLkToken: state.uriLkToken,
        invites: state.invites,
      };

    case LKROOM_CREATE_REQUEST:
      return {
        ...state,
        createStatus: "loading",
        createMessage: "",
      };

    case LKROOM_CREATE_SUCCESS:
      return {
        ...state,
        createStatus: "success",
        createMessage: action.payload.message || "Успешно",
      };

    case LKROOM_CREATE_ERROR:
      return {
        ...state,
        createStatus: "error",
        createMessage: action.payload.message || "Ошибка",
      };

    case LK_STORE_VALUE:
      return {
        ...state,
        [action.payload.storeDataKey]: action.payload.storeDataValue,
      };

    default:
      return state;
  }
}
