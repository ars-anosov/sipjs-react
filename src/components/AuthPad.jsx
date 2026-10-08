import { Close as IconClose, HowToReg as IconHowToReg, PersonOff as IconPersonOff } from "@mui/icons-material";
import { Box, Button, Divider, IconButton, Paper, Snackbar, Stack, Switch, Tooltip, Typography } from "@mui/material";
import PropTypes from "prop-types";
import { useEffect } from "react";
import { HEADER_BACKGROUND, PAPER_BACKGROUND } from "../theme.js";

// Состояние REST-подключения для кнопки в подвале панели: статусы и иконки те же,
// что у кнопки состояния в AuthRestInfo (HowToReg — сессия есть, PersonOff — нет).
// У подключённой сессии вместо слова «Подключено» — логин, под которым вошли
function getRestConnectionConfig(status, restLogin) {
  switch (status) {
    case "loading":
      return { label: "Авторизация…", color: "warning", icon: <IconPersonOff /> };
    case "success":
      // Логин может не прийти (ответ REST без ad_login)
      return { label: restLogin || "Подключено", color: "success", icon: <IconHowToReg /> };
    case "error":
      return { label: "Ошибка авторизации", color: "error", icon: <IconPersonOff /> };
    default:
      return { label: "REST не подключено", color: "inherit", icon: <IconPersonOff /> };
  }
}

function AuthPad(props) {
  const { authControlRdcr, regState, onToggleReg, onOpenRest, onClose } = props;

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

  // Подпись, цвет и иконка кнопки состояния REST в подвале панели
  const restConnection = getRestConnectionConfig(authControlRdcr?.status, authControlRdcr?.responseData?.ad_login || "");

  // Информируем, если RestAuth не выполнен или не содержит нужные поля
  const missingFields = [];
  if (!sipUsername) missingFields.push("sip_username");
  if (!sipSecret) missingFields.push("sip_secret");

  let infoText = "";
  if (authControlRdcr?.status !== "success") {
    infoText = "Авторизуйтесь в REST чтобы получить SIP-данные.";
  } else if (missingFields.length > 0) {
    infoText = `REST не вернул: ${missingFields.join(", ")}.`;
  }

  // Тумблер — не только индикатор, но и действие: из off клик запускает
  // регистрацию, из цветного состояния — разрегистрацию (решает AuthContainer)
  const handleToggleReg = () => {
    onToggleReg();
  };

  return (
    // Панель — всплывающий Snackbar справа внизу: корень MUI позиционирован fixed и места
    // в потоке документа не занимает. onClose намеренно не передан: иначе MUI закрывал бы
    // панель по клику мимо и Escape, а закрывает её только ✕ (проп onClose компоненты)
    <Snackbar
      open
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      sx={{
        // Панель открывает модальную форму AuthRest, а zIndex.snackbar (1400) выше
        // zIndex.modal (1300) — опускаем панель под подложку диалога
        zIndex: (theme) => theme.zIndex.modal - 1,
        // Ширину задаёт корень Snackbar: у fixed-элемента дочерний width: "100%"
        // не от чего считать проценты (на xs ширину держат left/right: 8)
        width: { xs: "auto", sm: 320 },
      }}
    >
      <Paper
        elevation={8}
        sx={{
          maxWidth: 320,
          width: "100%",
          bgcolor: PAPER_BACKGROUND,
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

        <Divider />

        {/* Подвал панели: слева состояние REST-сессии. Кнопка кликабельна — открывает
          форму входа AuthRest, где видно сеанс и есть выход из него */}
        <Stack
          direction="row"
          sx={{
            px: { xs: 1.5, sm: 2 },
            py: 0.75,
            alignItems: "center",
            bgcolor: HEADER_BACKGROUND,
          }}
        >
          <Tooltip title="Открыть форму входа REST">
            {/* Цветная иконка с подписью, без подложки и рамки — остаётся только
              hover-подсветка MUI (вариант text) */}
            <Button
              size="small"
              variant="text"
              color={restConnection.color}
              startIcon={restConnection.icon}
              onClick={onOpenRest}
              aria-label={`REST: ${restConnection.label}. Открыть форму входа`}
              sx={{ maxWidth: "100%" }}
            >
              {/* Длинный логин (почта, домен) не должен растягивать подвал:
                многоточие работает только на flex-элементе с minWidth 0 */}
              <Box component="span" sx={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {restConnection.label}
              </Box>
            </Button>
          </Tooltip>
        </Stack>
      </Paper>
    </Snackbar>
  );
}

AuthPad.propTypes = {
  authControlRdcr: PropTypes.shape({
    status: PropTypes.oneOf(["idle", "loading", "success", "error"]),
    responseData: PropTypes.shape({
      sip_username: PropTypes.string,
      sip_secret: PropTypes.string,
      // Логин REST — подпись кнопки состояния в подвале панели
      ad_login: PropTypes.string,
    }),
  }).isRequired,
  regState: PropTypes.oneOf(["off", "ok", "fail"]).isRequired,
  onToggleReg: PropTypes.func.isRequired,
  // Клик по кнопке состояния в подвале — открыть форму входа REST (AuthRest)
  onOpenRest: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default AuthPad;
