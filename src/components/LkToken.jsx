import CloseOutlinedIcon from "@mui/icons-material/CloseOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import { Alert, Box, CircularProgress, Collapse, IconButton, Stack, TextField } from "@mui/material";
import PropTypes from "prop-types";
import { useState } from "react";

function LkToken(props) {
  const { phoneControlRdcr, lkControlRdcr, lkControlActions } = props;

  const [num, setNum] = useState("");
  // Комната и эндпоинт выдачи токена берутся из среза: в самой форме их менять нечем,
  // приглашение всегда уходит в свою комнату через свой сервис.
  const room = phoneControlRdcr?.callerUserNum || "";
  const uriLkToken = lkControlRdcr?.uriLkToken || "";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!num.trim()) return;
    // uriWebRtc — из чужого среза phoneControlRdcr: мост делает контейнер (LkContainer),
    // thunk получает значение аргументом и не читает стор.
    lkControlActions.handleLkTokenSubmit({
      num,
      room,
      uriLkToken,
      uriWebRtc: phoneControlRdcr?.uriWebRtc || "",
    });
  };

  const handleClose = () => {
    lkControlActions.handleChangeStore("displayLkToken", false);
  };

  if (!lkControlRdcr.displayLkToken) return null;

  const isLoading = lkControlRdcr.status === "loading";

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate autoComplete="off" sx={{ display: "flex", flexDirection: "column" }}>
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <TextField
          required
          id="lk-token-num"
          type="tel"
          label="Вн. номер"
          variant="standard"
          size="small"
          value={num}
          onChange={(event) => setNum(event.target.value)}
          autoFocus
          disabled={isLoading}
          sx={{ width: "9ch" }}
        />

        <IconButton type="submit" color="primary" size="small" disabled={isLoading} aria-label="Отправить приглашение">
          {isLoading ? <CircularProgress size={16} color="inherit" /> : <PersonAddOutlinedIcon fontSize="small" />}
        </IconButton>

        <IconButton onClick={handleClose} size="small" aria-label="Закрыть форму приглашения" sx={{ color: "text.secondary" }}>
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Collapse in={Boolean(lkControlRdcr.message) && lkControlRdcr.status === "error"}>
        <Alert
          severity="error"
          variant="standard"
          sx={{
            py: 0,
            px: 1,
            fontSize: "0.72rem",
            backgroundColor: "transparent",
            "& .MuiAlert-icon": { fontSize: "0.9rem", mr: 0.5 },
          }}
        >
          {lkControlRdcr.message}
        </Alert>
      </Collapse>
    </Box>
  );
}

LkToken.propTypes = {
  phoneControlRdcr: PropTypes.object,
  lkControlRdcr: PropTypes.object.isRequired,
  lkControlActions: PropTypes.object.isRequired,
};

export default LkToken;
