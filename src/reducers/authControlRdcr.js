import {
  AUTHCTL_CLEAR,
  AUTHCTL_ERROR_ALERT,
  AUTHCTL_STORE_VALUE,
  AUTHCTL_SUBMIT_ERROR,
  AUTHCTL_SUBMIT_REQUEST,
  AUTHCTL_SUBMIT_SUCCESS,
} from "../constants/redux";

// Только UI-дефолты: сохранённые значения (uriAdAuth) подставляет сид стора —
// store/preloadedState.js → preloadedState в configureStore.
export const initialState = {
  displayControl: false,
  displayAd: false,
  displayAuthPad: false,
  uriAdAuth: "",
  // Адрес PHP-пробивки и её итог: idle — ещё не пробовали, loading — запрос идёт,
  // success — вход без формы, fail — форму AuthAd показывать можно
  uriAdPhpAuth: "",
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
        displayAd: true,
        responseData: null,
        errComponent: "",
        errText: "",
      };

    case AUTHCTL_SUBMIT_SUCCESS:
      return {
        ...state,
        status: "success",
        displayAd: false,
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
        displayAd: true,
        responseData: null,
        errComponent: "AuthAd",
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
        // Пробивка — одна на загрузку страницы: выход из AD-сессии её не повторяет,
        // а помечает исчерпанной (fail), чтобы форма AuthAd открылась сразу
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
