import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bindActionCreators } from "redux";
import * as authActions from "../actions/authControlActions.js";
import * as lkActions from "../actions/lkControlActions.js";
import * as phoneActions from "../actions/phoneControlActions.js";
import AuthAd from "../components/AuthAd.jsx";
import AuthPad from "../components/AuthPad.jsx";

// Ключ пары SIP-реквизитов: защищает от повторных dispatch на каждый ререндер
const buildSipKey = (sipUsername, sipSecret) => `${sipUsername}\u0000${sipSecret}`;

const AuthContainer = () => {
  const dispatch = useDispatch();

  const phoneControlRdcr = useSelector((state) => state.phoneControlRdcr);
  const authControlRdcr = useSelector((state) => state.authControlRdcr);
  const lkControlRdcr = useSelector((state) => state.lkControlRdcr);

  const phoneControlActions = useMemo(() => bindActionCreators(phoneActions, dispatch), [dispatch]);
  const authControlActions = useMemo(() => bindActionCreators(authActions, dispatch), [dispatch]);
  const lkControlActions = useMemo(() => bindActionCreators(lkActions, dispatch), [dispatch]);

  const { responseData, displayAd, displayAuthPad, errComponent: authErrComponent } = authControlRdcr;
  const { callerUserNum, uriWebRtc, connectStatus, regState } = phoneControlRdcr;

  const isRegistered = regState === "ok";

  const sipUsername = responseData?.sip_username || "";
  const sipSecret = responseData?.sip_secret || "";

  // Уже подставленная в PhoneReg пара sip_username / sip_secret
  const filledKeyRef = useRef("");

  // Мост AUTHCTL_ → PHONECTL_: данные AD-входа заполняют форму PhoneReg
  useEffect(() => {
    if (!sipUsername || !sipSecret) {
      filledKeyRef.current = "";
      return;
    }

    const sipKey = buildSipKey(sipUsername, sipSecret);
    if (filledKeyRef.current === sipKey) return;

    filledKeyRef.current = sipKey;
    phoneControlActions.handleChangeStore("callerUserNum", sipUsername);
    phoneControlActions.handleChangeStore("regUserPass", sipSecret);
    phoneControlActions.handleChangeStore("displayDir", true);
  }, [sipUsername, sipSecret, phoneControlActions]);

  // Мост AUTHCTL_ → PHONECTL_: тумблер AuthPad трёхпозиционный.
  // off → запуск регистрации (её итог определяет phoneRuntime: ok / fail),
  // ok → разрегистрация SIP-сессии, fail → возврат в off (разрегистрировать нечего).
  const handleToggleReg = () => {
    if (regState === "ok") {
      phoneControlActions.handleClkUnregister(phoneControlRdcr);
      return;
    }

    if (regState === "fail") {
      phoneControlActions.handleChangeStore("regState", "off");
      return;
    }

    // Уже идёт попытка подключения — повторный клик не создаёт вторую регистрацию
    if (isRegistered || connectStatus === "Request") return;
    if (!sipUsername || !sipSecret) return;

    phoneControlActions.handleClkRegister({ callerUserNum: sipUsername, regUserPass: sipSecret, uriWebRtc }, phoneControlRdcr);
  };

  // Мост AUTHCTL_ → LK_: тумблер AuthPad просто показывает/скрывает LkMeet
  const handleToggleMeet = (checked) => {
    lkControlActions.handleChangeStore("displayControl", checked);
  };

  const handleCloseAuthPad = () => {
    authControlActions.handleChangeStore("displayAuthPad", false);
  };

  // Мост PHONECTL_ → AUTHCTL_: AuthAdInfo/LkMeet читают sip_username из authControlRdcr
  useEffect(() => {
    if (!callerUserNum) return;
    if (!isRegistered && !connectStatus) return;
    if (responseData?.sip_username === callerUserNum) return;

    authControlActions.handleChangeStore("responseData", {
      ...(responseData || {}),
      sip_username: callerUserNum,
    });
  }, [callerUserNum, isRegistered, connectStatus, responseData, authControlActions]);

  // Мост PHONECTL_ → AUTHCTL_: потеря регистрации (красный тумблер) форсирует
  // AuthPad, чтобы по нему можно было кликнуть. displayAuthPad в зависимостях
  // намеренно нет: иначе ✕ не закрыл бы панель, пока regState остаётся 'fail'.
  useEffect(() => {
    if (regState !== "fail") return;

    authControlActions.handleChangeStore("displayAuthPad", true);
  }, [regState, authControlActions]);

  // Оба блока AD-домена: форма входа (displayAd) и мост к сервисам (displayAuthPad);
  // без AD-данных AuthPad информирует текстом, поэтому рендерится всегда по флагу меню.
  // Форма — модальный Dialog (портал), в потоке документа она места не занимает
  return (
    <>
      {(displayAd || authErrComponent === "AuthAd") && <AuthAd authControlRdcr={authControlRdcr} authControlActions={authControlActions} />}

      {displayAuthPad && (
        <AuthPad
          authControlRdcr={authControlRdcr}
          lkControlRdcr={lkControlRdcr}
          regState={regState}
          onToggleReg={handleToggleReg}
          onToggleMeet={handleToggleMeet}
          onClose={handleCloseAuthPad}
        />
      )}
    </>
  );
};

export default AuthContainer;
