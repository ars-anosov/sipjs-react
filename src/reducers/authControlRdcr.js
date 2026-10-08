import {
  AUTHCTL_CLEAR,
  AUTHCTL_ERROR_ALERT,
  AUTHCTL_STORE_VALUE,
  AUTHCTL_SUBMIT_ERROR,
  AUTHCTL_SUBMIT_REQUEST,
  AUTHCTL_SUBMIT_SUCCESS,
} from "../constants/redux";

// Только UI-дефолты: сохранённые значения (uriRestAuth) подставляет сид стора —
// store/preloadedState.js → preloadedState в configureStore.
export const initialState = {
  displayControl: false,
  displayRest: false,
  displayAuthPad: false,
  uriRestAuth: "",
  // Адрес PHP-пробивки и её итог: idle — ещё не пробовали, loading — запрос идёт,
  // success — вход без формы, fail — форму AuthRest показывать можно
  uriRestPhpAuth: "",
  phpProbe: "idle",
  status: "idle", // 'idle' | 'loading' | 'success' | 'error'
  responseData: null,
  errComponent: "",
  errText: "",
};

export default function authControlRdcr(state = initialState, action) {
  switch (action.type) {
    case AUTHCTL_SUBMIT_REQUEST:
      return {
        ...state,
        status: "loading",
        displayRest: true,
        responseData: null,
        errComponent: "",
        errText: "",
      };

    case AUTHCTL_SUBMIT_SUCCESS:
      return {
        ...state,
        status: "success",
        displayRest: false,
        displayAuthPad: true,
        responseData: action.payload.responseData,
        errComponent: "",
        errText: "",
      };

    case AUTHCTL_SUBMIT_ERROR: {
      const errText = action.payload.errText || "Ошибка";
      return {
        ...state,
        status: "error",
        displayRest: true,
        responseData: null,
        errComponent: "AuthRest",
        errText,
      };
    }

    case AUTHCTL_CLEAR:
      return {
        ...state,
        status: "idle",
        displayAuthPad: false,
        responseData: null,
        errComponent: "",
        errText: "",
        // Пробивка — одна на загрузку страницы: выход из REST-сессии её не повторяет,
        // а помечает исчерпанной (fail), чтобы форма AuthRest открылась сразу
        phpProbe: "fail",
      };

    case AUTHCTL_STORE_VALUE:
      return {
        ...state,
        [action.payload.storeDataKey]: action.payload.storeDataValue,
      };

    case AUTHCTL_ERROR_ALERT:
      return {
        ...state,
        errComponent: action.payload.errComponent,
        errText: action.payload.errText,
      };

    default:
      return state;
  }
}
