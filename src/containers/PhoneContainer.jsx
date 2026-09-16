import { Grid } from "@mui/material";
import { useMemo } from "react";
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

  const { displayReg, displayPad, displayHistory, displayChat, errComponent } = phoneControlRdcr;

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
          alignItems: "center",
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
