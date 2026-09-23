import { AUTHCTL_CLEAR, AUTHCTL_STORE_VALUE, AUTHCTL_SUBMIT_ERROR, AUTHCTL_SUBMIT_REQUEST, AUTHCTL_SUBMIT_SUCCESS } from "../constants/redux";
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
    const login = typeof formData.login === "string" ? formData.login.trim() : "";
    const password = typeof formData.password === "string" ? formData.password.trim() : "";
    const uriAdAuth = typeof formData.uriAdAuth === "string" ? formData.uriAdAuth.trim() : "";

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

// Пробивка PHP-сессии (GET uriAdPhpAuth?PHPSESSID=<cookie>): успех — тихий AD-вход без
// формы (AUTHCTL_SUBMIT_SUCCESS), неуспех — форма AuthAd (сюда AuthContainer смотрит
// на phpProbe). Ошибку пробивки пользователю не показываем: это ожидаемый фолбэк.
const handleAdPhpProbe = (uriAdPhpAuth) => async (dispatch) => {
  const phpAuthUri = typeof uriAdPhpAuth === "string" ? uriAdPhpAuth.trim() : "";

  if (!phpAuthUri) {
    dispatch(handleChangeStore("phpProbe", "fail"));
    return;
  }

  dispatch(handleChangeStore("phpProbe", "loading"));

  try {
    const responseData = await adAuth.probeAdPhpSession(phpAuthUri);

    dispatch({
      type: AUTHCTL_SUBMIT_SUCCESS,
      payload: { responseData },
    });
    dispatch(handleChangeStore("phpProbe", "success"));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn("Пробивка uriAdPhpAuth не прошла — показываем форму AuthAd:", error);
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

export { handleAdAuthClear, handleAdPhpProbe, handleAdRegister, handleChangeStore };
