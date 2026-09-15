import {
  AUTHCTL_CLEAR,
  AUTHCTL_ERROR_ALERT,
  AUTHCTL_STORE_VALUE,
  AUTHCTL_SUBMIT_ERROR,
  AUTHCTL_SUBMIT_REQUEST,
  AUTHCTL_SUBMIT_SUCCESS,
} from "../constants/redux";

import { getStoredAdAuthUri } from "../services/adAuth";

const initialState = {
  displayAd: true,
  displayAuthPad: false,
  displayControl: true,
  uriAdAuth: getStoredAdAuthUri(),
  status: "idle", // 'idle' | 'loading' | 'success' | 'error'
  autoReg: false, // тумблер AuthPad: клик on запускает регистрацию SIP данными AD
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
        autoReg: false,
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
        autoReg: false,
        responseData: null,
        errComponent: "",
        errText: "",
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
