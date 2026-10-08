import { AUTHCTL_CLEAR, AUTHCTL_STORE_VALUE, AUTHCTL_SUBMIT_ERROR, AUTHCTL_SUBMIT_REQUEST, AUTHCTL_SUBMIT_SUCCESS } from "../constants/redux";
import * as restAuth from "../services/restAuth";
import { getApiErrorMessage } from "./utils/kyError";

// Namespace-инвариант: thunk-и AUTHCTL_ не трогают PHONECTL_ (и наоборот).
// Мост «REST-данные → PhoneReg» живёт в контейнере AuthContainer.

function dispatchRestAuthError(dispatch, errText) {
  dispatch({
    type: AUTHCTL_SUBMIT_ERROR,
    payload: { errText },
  });
}

const handleRestRegister =
  (formData = {}) =>
  async (dispatch) => {
    const login = typeof formData.login === "string" ? formData.login.trim() : "";
    const password = typeof formData.password === "string" ? formData.password.trim() : "";
    const uriRestAuth = typeof formData.uriRestAuth === "string" ? formData.uriRestAuth.trim() : "";

    if (!login || !password) {
      dispatchRestAuthError(dispatch, "Заполните логин и пароль.");
      return;
    }

    if (!uriRestAuth) {
      dispatchRestAuthError(dispatch, "Не задан uriRestAuth.");
      return;
    }

    dispatch({ type: AUTHCTL_SUBMIT_REQUEST });

    try {
      // Сервис сам сохраняет адрес REST и REST-сессию.
      const responseData = await restAuth.loginRest({ login, password, uriRestAuth });

      dispatch({
        type: AUTHCTL_SUBMIT_SUCCESS,
        payload: { responseData },
      });

      // Подстановка sip_username/sip_secret в PhoneReg и автозапуск регистрации —
      // в AuthContainer (мост AUTHCTL_ → PHONECTL_), управляется тумблером AuthPad.
    } catch (error) {
      const detailMessage = await getApiErrorMessage(error);
      dispatchRestAuthError(dispatch, detailMessage);
    }
  };

const handleRestAuthClear = () => (dispatch) => {
  restAuth.clearRestAuthSession();
  dispatch({ type: AUTHCTL_CLEAR });
};

// Пробивка PHP-сессии (GET uriRestPhpAuth?PHPSESSID=<cookie>): успех — тихий REST-вход без
// формы (AUTHCTL_SUBMIT_SUCCESS), неуспех — форма AuthRest (сюда AuthContainer смотрит
// на phpProbe). Ошибку пробивки пользователю не показываем: это ожидаемый фолбэк.
const handleRestPhpProbe = (uriRestPhpAuth) => async (dispatch) => {
  const phpAuthUri = typeof uriRestPhpAuth === "string" ? uriRestPhpAuth.trim() : "";

  if (!phpAuthUri) {
    dispatch(handleChangeStore("phpProbe", "fail"));
    return;
  }

  dispatch(handleChangeStore("phpProbe", "loading"));

  try {
    const responseData = await restAuth.probeRestPhpSession(phpAuthUri);

    dispatch({
      type: AUTHCTL_SUBMIT_SUCCESS,
      payload: { responseData },
    });
    dispatch(handleChangeStore("phpProbe", "success"));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Пробивка uriRestPhpAuth не прошла — показываем форму AuthRest:", error);
    }

    dispatch(handleChangeStore("phpProbe", "fail"));
  }
};

const handleChangeStore = (storeDataKey, storeDataValue) => (dispatch) => {
  dispatch({
    type: AUTHCTL_STORE_VALUE,
    payload: { storeDataKey, storeDataValue },
  });
};

export { handleChangeStore, handleRestAuthClear, handleRestPhpProbe, handleRestRegister };
