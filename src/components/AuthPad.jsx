import { Close as IconClose } from "@mui/icons-material";
import { IconButton, Paper, Stack, Switch, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { useEffect } from "react";

function AuthPad(props) {
  const {
    authControlRdcr,
    lkControlRdcr,
    onToggleAutoReg,
    onToggleMeet,
    onClose,
  } = props;

  useEffect(() => {
    if (import.meta.env.DEV) console.log("AuthPad MOUNT");
    return () => {
      if (import.meta.env.DEV) console.log("AuthPad UNMOUNT");
    };
  }, []);

  const autoReg = !!authControlRdcr?.autoReg;
  const sipUsername = authControlRdcr?.responseData?.sip_username || "";
  const sipSecret = authControlRdcr?.responseData?.sip_secret || "";
  const hasSipData = Boolean(sipUsername && sipSecret);

  // lk_token приходит либо из AD-ответа, либо из формы LkToken
  const lkToken =
    authControlRdcr?.responseData?.lk_token ||
    lkControlRdcr?.responseData?.lk_token ||
    "";
  const hasLkToken = Boolean(lkToken);
  const meetVisible = !!lkControlRdcr?.displayControl;

  // Информируем, если AdAuth не выполнен или не содержит нужные поля
  const missingFields = [];
  if (!sipUsername) missingFields.push("sip_username");
  if (!sipSecret) missingFields.push("sip_secret");
  if (!lkToken) missingFields.push("lk_token");

  let infoText = "";
  if (authControlRdcr?.status !== "success") {
    infoText =
      "AD авторизация не выполнена — sip_username / sip_secret / lk_token недоступны.";
  } else if (missingFields.length > 0) {
    infoText = `AD не вернул: ${missingFields.join(", ")}.`;
  }

  // Тумблер — не только флаг, но и действие: клик on запускает регистрацию
  const handleToggleAutoReg = (event) => {
    onToggleAutoReg(event.target.checked);
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
        mx: "auto",
        mt: 2,
        p: 1,
        borderRadius: 3,
        position: "relative",
      }}
    >
      <Stack
        direction="row"
        sx={{ mb: 1, alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography variant="h6" color="primary">
          Мост к сервисам
        </Typography>
        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={onClose}
            sx={{ position: "absolute", top: 4, right: 4 }}
          >
            <IconClose color="action" />
          </IconButton>
        </Stack>
      </Stack>

      <Stack spacing={1}>
        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography variant="body1" color="text.primary">
            {`SIP Регистрация ${sipUsername || "—"}`}
          </Typography>
          <Switch
            checked={autoReg}
            disabled={!hasSipData}
            onChange={handleToggleAutoReg}
            slotProps={{
              input: { "aria-label": "Автоматическая регистрация SIP" },
            }}
          />
        </Stack>

        <Stack
          direction="row"
          spacing={2}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
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
        <Typography
          variant="caption"
          color="warning.main"
          sx={{ display: "block", mt: 1 }}
        >
          {infoText}
        </Typography>
      )}
    </Paper>
  );
}

AuthPad.propTypes = {
  authControlRdcr: PropTypes.shape({
    autoReg: PropTypes.bool,
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
  onToggleAutoReg: PropTypes.func.isRequired,
  onToggleMeet: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AuthPad;
