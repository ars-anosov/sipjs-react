import {
  AUTHCTL_CLEAR,
  AUTHCTL_STORE_VALUE,
  AUTHCTL_SUBMIT_ERROR,
  AUTHCTL_SUBMIT_REQUEST,
  AUTHCTL_SUBMIT_SUCCESS,
} from "../constants/redux";
import * as adAuth from "../services/adAuth";
import { getApiErrorMessage } from "./utils/kyError";

// Namespace-инвариант: thunk-и AUTHCTL_ не трогают PHONECTL_ (и наоборот).
// Мост «AD-данные → PhoneReg» живёт в контейнере AuthContainer.

function dispatchAdAuthError(dispatch, errText) {
  dispatch({
    type: AUTHCTL_SUBMIT_ERROR,
    payload: { errText },
  });
}

const handleAdRegister =
  (formData = {}) =>
  async (dispatch) => {
    const login =
      typeof formData.login === "string" ? formData.login.trim() : "";
    const password =
      typeof formData.password === "string" ? formData.password.trim() : "";
    const uriAdAuth =
      typeof formData.uriAdAuth === "string" ? formData.uriAdAuth.trim() : "";

    if (!login || !password) {
      dispatchAdAuthError(dispatch, "Заполните логин и пароль.");
      return;
    }

    if (!uriAdAuth) {
      dispatchAdAuthError(dispatch, "Не задан uriAdAuth.");
      return;
    }

    dispatch({ type: AUTHCTL_SUBMIT_REQUEST });

    try {
      // Сервис сам сохраняет адрес AD и AD-сессию.
      const responseData = await adAuth.loginAd({ login, password, uriAdAuth });

      dispatch({
        type: AUTHCTL_SUBMIT_SUCCESS,
        payload: { responseData },
      });

      // Подстановка sip_username/sip_secret в PhoneReg и автозапуск регистрации —
      // в AuthContainer (мост AUTHCTL_ → PHONECTL_), управляется тумблером AuthPad.
    } catch (error) {
      const detailMessage = await getApiErrorMessage(error);
      dispatchAdAuthError(dispatch, detailMessage);
    }
  };

const handleAdAuthClear = () => (dispatch) => {
  adAuth.clearAdAuthSession();
  dispatch({ type: AUTHCTL_CLEAR });
};

const handleChangeStore = (storeDataKey, storeDataValue) => (dispatch) => {
  dispatch({
    type: AUTHCTL_STORE_VALUE,
    payload: { storeDataKey, storeDataValue },
  });
};

export { handleAdAuthClear, handleAdRegister, handleChangeStore };
