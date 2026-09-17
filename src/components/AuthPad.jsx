import { Close as IconClose } from "@mui/icons-material";
import { Box, Divider, IconButton, Paper, Stack, Switch, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { HEADER_BACKGROUND, PAPER_BACKGROUND } from "../theme.js";

function AuthPad(props) {
  const { authControlRdcr, lkControlRdcr, regState, onToggleReg, onToggleMeet, onClose } = props;

  useEffect(() => {
    if (import.meta.env.DEV) console.log("AuthPad MOUNT");
    return () => {
      if (import.meta.env.DEV) console.log("AuthPad UNMOUNT");
    };
  }, []);

  // Тумблер SIP-регистрации: off — выключен (нейтральный цвет), ok — зелёный
  // (регистрация прошла), fail — красный (регистрация не прошла)
  const regOn = regState !== "off";
  const regColor = regState === "ok" ? "success" : regState === "fail" ? "error" : "primary";
  const sipUsername = authControlRdcr?.responseData?.sip_username || "";
  const sipSecret = authControlRdcr?.responseData?.sip_secret || "";
  const hasSipData = Boolean(sipUsername && sipSecret);

  // lk_token приходит либо из AD-ответа, либо из формы LkToken
  const lkToken = authControlRdcr?.responseData?.lk_token || lkControlRdcr?.responseData?.lk_token || "";
  const hasLkToken = Boolean(lkToken);
  const meetVisible = !!lkControlRdcr?.displayControl;

  // Информируем, если AdAuth не выполнен или не содержит нужные поля
  const missingFields = [];
  if (!sipUsername) missingFields.push("sip_username");
  if (!sipSecret) missingFields.push("sip_secret");
  if (!lkToken) missingFields.push("lk_token");

  let infoText = "";
  if (authControlRdcr?.status !== "success") {
    infoText = "AD авторизация не выполнена — sip_username / sip_secret / lk_token недоступны.";
  } else if (missingFields.length > 0) {
    infoText = `AD не вернул: ${missingFields.join(", ")}.`;
  }

  // Тумблер — не только индикатор, но и действие: из off клик запускает
  // регистрацию, из цветного состояния — разрегистрацию (решает AuthContainer)
  const handleToggleReg = () => {
    onToggleReg();
  };
  // Тумблер показа компоненты LkMeet
  const handleToggleMeet = (event) => {
    onToggleMeet(event.target.checked);
  };

  return (
    <Paper
      elevation={8}
      sx={{
        maxWidth: 320,
        width: "100%",
        bgcolor: PAPER_BACKGROUND,
        mx: "auto",
        mt: 2,
        borderRadius: 3,
        position: "relative",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <IconButton aria-label="Закрыть панель" onClick={onClose} sx={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}>
        <IconClose color="action" />
      </IconButton>

      <Stack
        direction="row"
        sx={{
          minHeight: 48,
          pl: { xs: 1.5, sm: 2 },
          pr: 6,
          py: 0.5,
          alignItems: "center",
          bgcolor: HEADER_BACKGROUND,
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" color="primary" noWrap>
            Мост к сервисам
          </Typography>
        </Box>
      </Stack>

      <Divider />

      {/* Тело панели: padding переехал с Paper на тело, чтобы шапка легла вплотную к краям */}
      <Box sx={{ p: 1 }}>
        <Stack spacing={1}>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body1" color="text.primary">
              {`SIP Регистрация ${sipUsername || "—"}`}
            </Typography>
            <Switch
              checked={regOn}
              color={regColor}
              disabled={!regOn && !hasSipData}
              onChange={handleToggleReg}
              slotProps={{
                input: { "aria-label": "Тумблер SIP регистрации" },
              }}
            />
          </Stack>

          <Stack direction="row" spacing={2} sx={{ alignItems: "center", justifyContent: "space-between" }}>
            <Typography variant="body1" color="text.primary">
              LiveKit Встреча
            </Typography>
            <Switch
              checked={meetVisible}
              disabled={!hasLkToken}
              onChange={handleToggleMeet}
              slotProps={{
                input: { "aria-label": "Показ LiveKit Встречи" },
              }}
            />
          </Stack>
        </Stack>

        {infoText && (
          <>
            <Divider sx={{ mt: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1, textAlign: "center" }}>
              {infoText}
            </Typography>
          </>
        )}
      </Box>
    </Paper>
  );
}

AuthPad.propTypes = {
  authControlRdcr: PropTypes.shape({
    status: PropTypes.oneOf(["idle", "loading", "success", "error"]),
    responseData: PropTypes.shape({
      sip_username: PropTypes.string,
      sip_secret: PropTypes.string,
      lk_token: PropTypes.string,
    }),
  }).isRequired,
  lkControlRdcr: PropTypes.shape({
    displayControl: PropTypes.bool,
    responseData: PropTypes.shape({
      lk_token: PropTypes.string,
    }),
  }).isRequired,
  regState: PropTypes.oneOf(["off", "ok", "fail"]).isRequired,
  onToggleReg: PropTypes.func.isRequired,
  onToggleMeet: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AuthPad;
