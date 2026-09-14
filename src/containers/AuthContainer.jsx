import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bindActionCreators } from "redux";
import * as authActions from "../actions/authControlActions.js";
import * as lkActions from "../actions/lkControlActions.js";
import * as phoneActions from "../actions/phoneControlActions.js";
import AuthPad from "../components/AuthPad.jsx";

// Ключ пары SIP-реквизитов: защищает от повторных dispatch на каждый ререндер
const buildSipKey = (sipUsername, sipSecret) =>
  `${sipUsername}\u0000${sipSecret}`;

const AuthContainer = () => {
  const dispatch = useDispatch();

  const phoneControlRdcr = useSelector((state) => state.phoneControlRdcr);
  const authControlRdcr = useSelector((state) => state.authControlRdcr);
  const lkControlRdcr = useSelector((state) => state.lkControlRdcr);

  const phoneControlActions = useMemo(
    () => bindActionCreators(phoneActions, dispatch),
    [dispatch],
  );
  const authControlActions = useMemo(
    () => bindActionCreators(authActions, dispatch),
    [dispatch],
  );
  const lkControlActions = useMemo(
    () => bindActionCreators(lkActions, dispatch),
    [dispatch],
  );

  const { responseData, displayAuthPad } = authControlRdcr;
  const { callerUserNum, uriWebRtc, regNow, connectStatus } = phoneControlRdcr;

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

  // Мост AUTHCTL_ → PHONECTL_: клик по тумблеру AuthPad сразу регистрирует PhoneReg
  const handleToggleAutoReg = (checked) => {
    authControlActions.handleChangeStore("autoReg", checked);

    if (!checked || !sipUsername || !sipSecret || regNow) return;

    phoneControlActions.handleClkRegister(
      { callerUserNum: sipUsername, regUserPass: sipSecret, uriWebRtc },
      phoneControlRdcr,
    );
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
    if (!regNow && !connectStatus) return;
    if (responseData?.sip_username === callerUserNum) return;

    authControlActions.handleChangeStore("responseData", {
      ...(responseData || {}),
      sip_username: callerUserNum,
    });
  }, [callerUserNum, regNow, connectStatus, responseData, authControlActions]);

  // AuthPad показывается по флагу меню; без AD-данных она информирует об этом
  if (!displayAuthPad) return null;

  return (
    <AuthPad
      authControlRdcr={authControlRdcr}
      lkControlRdcr={lkControlRdcr}
      onToggleAutoReg={handleToggleAutoReg}
      onToggleMeet={handleToggleMeet}
      onClose={handleCloseAuthPad}
    />
  );
};

export default AuthContainer;
