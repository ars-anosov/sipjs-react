import { Grid } from "@mui/material";
import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { bindActionCreators } from "redux";
// Actions
import * as phoneActions from "../actions/phoneControlActions.js";

// Components
import PhoneChat from "../components/PhoneChat.jsx";
import PhoneHistory from "../components/PhoneHistory.jsx";
import PhonePad from "../components/PhonePad.jsx";
import PhoneReg from "../components/PhoneReg.jsx";

// Контейнер среза телефона: форма входа PhoneReg и рабочие блоки PhonePad/PhoneHistory/PhoneChat.
// AD-вход (AuthAd) относится к authControlRdcr — его рендерит AuthContainer, чужой срез здесь не читается.
const PhoneContainer = () => {
  const dispatch = useDispatch();

  const phoneControlRdcr = useSelector((state) => state.phoneControlRdcr);

  const phoneControlActions = useMemo(() => bindActionCreators(phoneActions, dispatch), [dispatch]);

  const { displayReg, displayPad, displayHistory, displayChat, errComponent, regState } = phoneControlRdcr;

  // F5 рвёт SIP-сессию: WebSocket, SIP-диалог и RTCPeerConnection живут только в памяти
  // страницы (singleton phoneRuntime) и после перезагрузки не восстанавливаются.
  // Пока регистрация активна, предупреждаем о перезагрузке/закрытии вкладки.
  // https://developer.mozilla.org/ru/docs/Web/API/Window/beforeunload_event
  useEffect(() => {
    if (regState !== "ok") return;

    const handleBeforeUnload = (event) => {
      // Современный способ включить диалог подтверждения; текст браузер не показывает
      event.preventDefault();
      // Легаси-совместимость: без заполненного returnValue диалог не выводится
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [regState]);

  // Форма входа — модальный Dialog (портал), в потоке документа она места не занимает,
  // поэтому телефон под ней не сдвигается
  return (
    <>
      {(displayReg || errComponent === "PhoneReg") && <PhoneReg phoneControlRdcr={phoneControlRdcr} phoneControlActions={phoneControlActions} />}

      <Grid
        container
        spacing={2}
        sx={{
          justifyContent: "center",
          alignItems: "start",
          width: "100%",
        }}
      >
        {/* Телефон */}
        {(displayPad || errComponent === "PhonePad") && (
          <Grid size={{ xs: 12, md: "auto" }}>
            <PhonePad phoneControlRdcr={phoneControlRdcr} phoneControlActions={phoneControlActions} showInput />
          </Grid>
        )}

        {/* История */}
        {(displayHistory || errComponent === "PhoneHistory") && (
          <Grid size={{ xs: 12, md: "auto" }}>
            <PhoneHistory phoneControlRdcr={phoneControlRdcr} phoneControlActions={phoneControlActions} />
          </Grid>
        )}

        {/* Чат */}
        {(displayChat || errComponent === "PhoneChat") && (
          <Grid size={{ xs: 12, md: "auto" }}>
            <PhoneChat phoneControlRdcr={phoneControlRdcr} phoneControlActions={phoneControlActions} />
          </Grid>
        )}
      </Grid>
    </>
  );
};

export default PhoneContainer;
