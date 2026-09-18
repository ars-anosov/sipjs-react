import { DialerSip, Dns, Close as IconClose, Login as IconLogin, Logout as IconLogout, Lock, Visibility, VisibilityOff } from "@mui/icons-material";
import {
  Alert,
  Avatar,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import PropTypes from "prop-types";
import { useEffect, useState } from "react";

function PhoneReg(props) {
  const { phoneControlRdcr, phoneControlActions } = props;

  useEffect(() => {
    if (import.meta.env.DEV) console.log("PhoneReg MOUNT");
    return () => {
      if (import.meta.env.DEV) console.log("PhoneReg UNMOUNT");
    };
  }, []);

  const [callerUserNum, setCallerUserNum] = useState(phoneControlRdcr.callerUserNum);
  const [regUserPass, setRegUserPass] = useState(phoneControlRdcr.regUserPass);
  const [uriWebRtc, setUriWebRtc] = useState(phoneControlRdcr.uriWebRtc);
  const [showPassword, setShowPassword] = useState(false);

  // Синхронизация полей, когда authControlActions присылает новые данные SIP после AD-логина
  useEffect(() => {
    setCallerUserNum(phoneControlRdcr.callerUserNum || "");
    setRegUserPass(phoneControlRdcr.regUserPass || "");
    setUriWebRtc(phoneControlRdcr.uriWebRtc || "");
  }, [phoneControlRdcr.callerUserNum, phoneControlRdcr.regUserPass, phoneControlRdcr.uriWebRtc]);

  const handleClose = () => {
    phoneControlActions.handleChangeStore("displayReg", false);
    if (phoneControlRdcr.errComponent === "PhoneReg") {
      phoneControlActions.handleChangeStore("errComponent", "");
      phoneControlActions.handleChangeStore("errText", "");
    }
  };

  const handleRegister = (event) => {
    event.preventDefault();
    // Пустые поля не глотаем: валидацию и алерт «Заполните все поля.» даёт handleClkRegister.
    // Это важно после разрегистрации — пароль в форме не хранится (PHONECTL_CONNECT_SUCCESS).
    phoneControlActions.handleClkRegister({ callerUserNum, regUserPass, uriWebRtc }, phoneControlRdcr);
  };

  const handleUnregister = () => {
    phoneControlActions.handleClkUnregister(phoneControlRdcr);
  };

  const isRegistered = phoneControlRdcr.regState === "ok";

  // Секрет убирается из формы при успешной регистрации (PHONECTL_CONNECT_SUCCESS) —
  // сбрасываем и режим показа, чтобы при следующем открытии формы пароль не вводился открытым текстом
  useEffect(() => {
    if (isRegistered) setShowPassword(false);
  }, [isRegistered]);

  // Модальное окно: портал вне потока документа, поэтому форма не раздвигает
  // остальные компоненты; Escape и клик по подложке закрывают её через onClose.
  // Paper — сам тег form, поэтому Enter в поле отправляет запрос, а кнопки живут
  // в DialogActions (см. MUI → Dialog → Form dialog).
  return (
    <Dialog
      open
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="phoneRegTitle"
      aria-describedby="phoneRegSubtitle"
      slotProps={{
        paper: {
          component: "form",
          onSubmit: handleRegister,
          noValidate: true,
          sx: { borderRadius: 3 },
        },
      }}
    >
      {/* Кнопка закрытия формы в углу подложки */}
      <IconButton aria-label="Закрыть форму SIP регистрации" onClick={handleClose} sx={{ position: "absolute", top: 8, right: 8 }}>
        <IconClose color="action" />
      </IconButton>

      {/* Блок Логотипа и Заголовка: DialogTitle — единственный заголовок окна (h2) */}
      <DialogTitle
        id="phoneRegTitle"
        variant="h5"
        sx={{ pt: 4, pb: 1, fontWeight: 600, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}
      >
        <Avatar
          sx={{
            width: 56,
            height: 56,
            backgroundColor: isRegistered ? "success.light" : "primary.light",
            transition: "background-color 0.3s ease",
          }}
        >
          <DialerSip
            sx={{
              fontSize: 32,
              color: isRegistered ? "success.main" : "primary.main",
            }}
          />
        </Avatar>
        SIP Регистрация
      </DialogTitle>

      {/* DialogContent после DialogTitle идёт без верхнего паддинга — это штатное
          правило MUI; первым элементом идёт подзаголовок, поэтому лейбл поля не обрезается */}
      <DialogContent>
        <DialogContentText id="phoneRegSubtitle" variant="body2" sx={{ textAlign: "center", mb: 2.5 }}>
          {isRegistered ? "Статус: Подключен" : "Телефон не зарегистрирован"}
        </DialogContentText>

        <Stack spacing={2.5}>
          {/* Внутренний номер */}
          <TextField
            fullWidth
            required
            disabled={isRegistered}
            id="callerUserNum"
            label="Внутренний номер"
            variant="outlined"
            value={callerUserNum}
            onChange={(e) => setCallerUserNum(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <DialerSip color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* SIP Пароль (Secret) */}
          <TextField
            fullWidth
            required
            disabled={isRegistered}
            id="regUserPass"
            label="Пароль (Secret)"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            value={regUserPass}
            onChange={(event) => setRegUserPass(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="переключить видимость пароля"
                      onClick={() => setShowPassword((prev) => !prev)}
                      onMouseDown={(event) => event.preventDefault()}
                      edge="end"
                      disabled={isRegistered}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Безопасный условный рендеринг: инпуты вырезаются из DOM в продакшене */}
          {import.meta.env.DEV && (
            <TextField
              fullWidth
              required
              disabled={isRegistered}
              id="uriWebRtc"
              label="WebRTC URI (Dev Only)"
              variant="outlined"
              size="small"
              value={uriWebRtc}
              onChange={(e) => setUriWebRtc(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Dns color="action" style={{ fontSize: 18 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          )}

          {/* Ошибки компонента */}
          <Collapse in={phoneControlRdcr.errComponent === "PhoneReg" && !!phoneControlRdcr.errText}>
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {phoneControlRdcr.errText}
            </Alert>
          </Collapse>
        </Stack>
      </DialogContent>

      {/* Управляющие кнопки */}
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        {!isRegistered ? (
          <Button
            type="submit"
            variant="contained"
            color="primary"
            startIcon={<IconLogin />}
            size="large"
            fullWidth
            sx={{ py: 1.3, fontWeight: "bold", borderRadius: 2 }}
          >
            Подключить телефон
          </Button>
        ) : (
          <Button
            type="button"
            variant="contained"
            color="error"
            onClick={handleUnregister}
            startIcon={<IconLogout />}
            size="large"
            fullWidth
            sx={{ py: 1.3, fontWeight: "bold", borderRadius: 2 }}
          >
            Отключить телефон
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

PhoneReg.propTypes = {
  phoneControlRdcr: PropTypes.shape({
    callerUserNum: PropTypes.string,
    regUserPass: PropTypes.string,
    uriWebRtc: PropTypes.string,
    regState: PropTypes.oneOf(["off", "ok", "fail"]),
    errComponent: PropTypes.string,
    errText: PropTypes.string,
  }).isRequired,
  phoneControlActions: PropTypes.shape({
    handleClkRegister: PropTypes.func.isRequired,
    handleClkUnregister: PropTypes.func.isRequired,
    handleChangeStore: PropTypes.func.isRequired,
  }).isRequired,
};

export default PhoneReg;
