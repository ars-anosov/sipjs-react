import { useEffect, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { bindActionCreators } from "redux";
import * as authActions from "../actions/authControlActions.js";
import * as lkActions from "../actions/lkControlActions.js";
import * as phoneActions from "../actions/phoneControlActions.js";
import AuthAd from "../components/AuthAd.jsx";
import AuthLinks from "../components/AuthLinks.jsx";
import AuthPad from "../components/AuthPad.jsx";

// Ключ пары SIP-реквизитов: защищает от повторных dispatch на каждый ререндер
const buildSipKey = (sipUsername, sipSecret) => `${sipUsername}\u0000${sipSecret}`;

const AuthContainer = () => {
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();

  const phoneControlRdcr = useSelector((state) => state.phoneControlRdcr);
  const authControlRdcr = useSelector((state) => state.authControlRdcr);

  const phoneControlActions = useMemo(() => bindActionCreators(phoneActions, dispatch), [dispatch]);
  const authControlActions = useMemo(() => bindActionCreators(authActions, dispatch), [dispatch]);
  const lkControlActions = useMemo(() => bindActionCreators(lkActions, dispatch), [dispatch]);

  const { responseData, displayAd, displayAuthPad, status: authStatus, errComponent: authErrComponent, uriAdPhpAuth, phpProbe } = authControlRdcr;
  const { callerUserNum, uriWebRtc, connectStatus, regState } = phoneControlRdcr;

  const isRegistered = regState === "ok";

  // Гость по ссылке-приглашению: токен в query — это вход во встречу, а не логин
  const hasInvite = Boolean(searchParams.get("lk_token"));

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

  const handleCloseAuthPad = () => {
    authControlActions.handleChangeStore("displayAuthPad", false);
  };

  // Стартовый экран: ссылки открывают формы своего среза (переходов между срезами нет —
  // каждый вызов пишет только в свой)
  const handleOpenReg = () => {
    phoneControlActions.handleChangeStore("displayReg", true);
  };

  const handleOpenAd = () => {
    authControlActions.handleChangeStore("displayAd", true);
  };

  // Пробивка PHP-сессии идёт впереди формы AuthAd: пока запрос в пути, модальное окно
  // не монтируется — на экран оно попадает только при неуспехе пробивки. Уже пройденный
  // AD (status не idle, в том числе успех) пробивать незачем: там форма нужна лишь для
  // просмотра сеанса и выхода из него.
  const isAdFormRequested = displayAd || authErrComponent === "AuthAd";
  const needsAdPhpProbe = authStatus === "idle" && Boolean(uriAdPhpAuth);
  const isAdPhpProbePending = needsAdPhpProbe && phpProbe !== "fail";

  useEffect(() => {
    // phpProbe != "idle" — пробивка одна на загрузку страницы: ни закрытие формы,
    // ни выход из AD-сессии её не повторяют
    if (!isAdFormRequested || !needsAdPhpProbe || phpProbe !== "idle") return;

    authControlActions.handleAdPhpProbe(uriAdPhpAuth);
  }, [isAdFormRequested, needsAdPhpProbe, phpProbe, uriAdPhpAuth, authControlActions]);

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

  // Мост URL → LK: гость по ссылке-приглашению сразу видит панель встречи.
  // Эффект срабатывает на появление lk_token в query: если гость закрыл панель сам
  // (displayControl=false, а query не менялся), заново её никто не открывает.
  useEffect(() => {
    if (!hasInvite) return;

    lkControlActions.handleChangeStore("displayControl", true);
  }, [hasInvite, lkControlActions]);

  // Стартовый экран — ссылки на обе формы, пока ни одна авторизация не прошла.
  // Дальше: успех AD → мост AuthPad, успешная SIP-регистрация → телефон PhonePad.
  // Гость по ссылке-приглашению входит во встречу сразу, поэтому экран «Войти» ему
  // не показываем, а панель LkMeet открываем без похода в меню
  const showAuthLinks = authStatus !== "success" && regState !== "ok" && !hasInvite;

  // Оба блока AD-домена: форма входа (displayAd) и мост к сервисам (displayAuthPad).
  // Форма — модальный Dialog (портал), в потоке документа она места не занимает
  return (
    <>
      {showAuthLinks && <AuthLinks onOpenReg={handleOpenReg} onOpenAd={handleOpenAd} />}

      {isAdFormRequested && !isAdPhpProbePending && <AuthAd authControlRdcr={authControlRdcr} authControlActions={authControlActions} />}

      {displayAuthPad && (
        <AuthPad authControlRdcr={authControlRdcr} regState={regState} onToggleReg={handleToggleReg} onOpenAd={handleOpenAd} onClose={handleCloseAuthPad} />
      )}
    </>
  );
};

export default AuthContainer;
