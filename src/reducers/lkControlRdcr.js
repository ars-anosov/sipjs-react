import { LK_STORE_VALUE, LKTOKEN_CLEAR, LKTOKEN_SUBMIT_ERROR, LKTOKEN_SUBMIT_REQUEST, LKTOKEN_SUBMIT_SUCCESS } from "../constants/redux";

// Только UI-дефолты: сохранённый конфиг (uriLk, uriLkToken) подставляет сид стора —
// store/preloadedState.js → preloadedState в configureStore.
export const initialState = {
  displayLkToken: false,
  displayControl: false,
  uriLk: "",
  uriLkToken: "",
  status: "idle",
  message: "",
  responseData: null,
};

export default function lkTokenRdcr(state = initialState, action) {
  switch (action.type) {
    case LKTOKEN_SUBMIT_REQUEST:
      return {
        ...state,
        status: "loading",
        displayLkToken: true,
        message: "",
        responseData: null,
      };

    case LKTOKEN_SUBMIT_SUCCESS:
      return {
        ...state,
        status: "success",
        displayLkToken: false,
        message: action.payload.message || "Успешно",
        responseData: action.payload.responseData,
      };

    case LKTOKEN_SUBMIT_ERROR:
      return {
        ...state,
        status: "error",
        displayLkToken: true,
        message: action.payload.message || "Ошибка",
        responseData: null,
      };

    case LKTOKEN_CLEAR:
      // Сохранённый конфиг не теряем: сбрасываем только результат запроса.
      return {
        ...initialState,
        uriLk: state.uriLk,
        uriLkToken: state.uriLkToken,
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
