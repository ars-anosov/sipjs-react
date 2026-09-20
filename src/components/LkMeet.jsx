import {
  AudioTrack,
  DisconnectButton,
  LeaveIcon,
  LiveKitRoom,
  MediaDeviceMenu,
  ParticipantContext,
  ParticipantName,
  RoomAudioRenderer,
  StartMediaButton,
  TrackToggle,
  useTracks,
  VideoTrack,
} from "@livekit/components-react";
import "@livekit/components-styles";
import {
  AddCircleOutlined as AddCircleOutlinedIcon,
  DeleteOutlined as DeleteOutlinedIcon,
  GroupAdd as GroupAddIcon,
  Close as IconClose,
  Fullscreen as IconFullscreen,
  FullscreenExit as IconFullscreenExit,
  MicOff as IconMicOff,
  Mic as IconMicOn,
  OpenInNew as IconOpenInNew,
  VideoCallOutlined as VideoCallOutlinedIcon,
} from "@mui/icons-material";
import { Alert, alpha, Box, Button, CircularProgress, Divider, GlobalStyles, Grid, IconButton, Link, Paper, Stack, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { format, isToday } from "date-fns";
import PropTypes from "prop-types";
import { useEffect, useRef, useState } from "react";
import { createSearchParams, Link as RouterLink, useNavigate, useSearchParams } from "react-router-dom";
import { PANEL_HEIGHT } from "../constants/ui.js";
import { getLiveKitRoom, screenShareCaptureOptions, screenSharePublishOptions, Track } from "../services/lkRuntime";
import { HEADER_BACKGROUND, MEETING_LINK_SX, PAPER_BACKGROUND, VIDEO_SURFACE_BACKGROUND } from "../theme.js";
import { getLiveKitMuiStyles } from "./LkThemeStyles";
import LkToken from "./LkToken";

// Комната и токен живут только в query текущего маршрута (`#/?lk_room=…&lk_token=…`):
// приглашение остаётся обычной ссылкой, а состояние не дублируется в useState.
const buildRoomSearch = (room, token) => createSearchParams({ lk_room: room, lk_token: token }).toString();

// Срок действия токена приглашения (exp из JWT, см. services/lkToken.js): время — до минут,
// с датой, если токен живёт дольше сегодняшнего дня
const formatInviteValidUntil = (expiresAt) => {
  if (typeof expiresAt !== "number") return "";

  const date = new Date(expiresAt);
  return Number.isNaN(date.getTime()) ? "" : format(date, isToday(date) ? "HH:mm" : "dd.MM HH:mm");
};

function MicrophoneStatusIcon({ trackRef }) {
  const participant = trackRef?.participant;
  if (!participant) return null;

  if (!participant.isMicrophoneEnabled) {
    return <IconMicOff sx={{ fontSize: 13, color: "error.main" }} />;
  }

  return (
    <IconMicOn
      sx={{
        fontSize: 13,
        color: participant.isSpeaking ? "success.light" : "common.white",
        animation: participant.isSpeaking ? "lkPulse 1.4s infinite cubic-bezier(0.4, 0, 0.2, 1)" : "none",
        "@keyframes lkPulse": {
          "0%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.18)" },
          "100%": { transform: "scale(1)" },
        },
      }}
    />
  );
}

function ParticipantTileBox({ track, columns }) {
  const theme = useTheme();
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const isScreenShare = track.source === Track.Source.ScreenShare;
  const isSpeaking = Boolean(track.participant?.isSpeaking);
  const isWide = isFullscreen || isScreenShare;
  // Акценты плитки — из палитры темы, чтобы тёмное «полотно» не спорило с MUI-стилем
  const accent = theme.palette.success.light;

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen?.();
        return;
      }
      await containerRef.current.requestFullscreen?.();
    } catch (error) {
      console.error("Ошибка переключения полноэкранного режима:", error);
    }
  };

  return (
    <Grid
      size={isScreenShare ? 12 : columns}
      sx={{
        // Ячейка — контейнер размеров: от её габаритов плитка считает свой прямоугольник
        containerType: "size",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 0,
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Box
        ref={containerRef}
        sx={{
          // Окно видео — всегда 16:9: ширина = минимум из ширины ячейки и её высоты × 16/9.
          // В браузерах без container query units остаётся ширина ячейки (fallback ниже).
          width: isFullscreen ? "100vw" : "100%",
          height: isFullscreen ? "100vh" : "auto",
          aspectRatio: isFullscreen ? "unset" : "16 / 9",
          "@supports (width: 1cqh)": {
            width: isFullscreen ? "100vw" : "min(100%, calc(100cqh * 16 / 9))",
          },
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
          overflow: "hidden",
          isolation: "isolate",
          borderRadius: isFullscreen ? 0 : 4,
          backgroundColor: VIDEO_SURFACE_BACKGROUND,
          transition: "border-color 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease",
          border: "1px solid",
          borderColor: isSpeaking ? alpha(accent, 0.4) : alpha(theme.palette.common.white, 0.08),
          boxShadow: isFullscreen
            ? "none"
            : isSpeaking
              ? `0 0 0 2px ${alpha(accent, 0.2)}, 0 10px 30px -10px ${alpha(accent, 0.3)}`
              : `0 4px 20px -5px ${alpha(theme.palette.common.black, 0.3)}`,
          "&:hover": {
            transform: isFullscreen ? "none" : "translateY(-2px)",
            borderColor: isSpeaking ? alpha(accent, 0.6) : alpha(theme.palette.common.white, 0.2),
          },
        }}
      >
        <ParticipantContext.Provider value={track.participant}>
          <AudioTrack trackRef={track} />

          <VideoTrack
            trackRef={track}
            priority={isWide ? "high" : "low"}
            style={{
              width: "100%",
              height: "100%",
              objectFit: isWide ? "contain" : "cover",
              borderRadius: "inherit",
              overflow: "hidden",
            }}
          />

          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: "absolute",
              bottom: 14,
              left: 14,
              zIndex: 2,
              alignItems: "center",
              px: 1.5,
              py: 0.6,
              borderRadius: 5,
              color: "common.white",
              pointerEvents: "none",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              transition: "background-color 0.25s ease, border-color 0.25s ease",
              backgroundColor: isSpeaking ? alpha(theme.palette.success.main, 0.2) : alpha(theme.palette.text.primary, 0.6),
              border: "1px solid",
              borderColor: isSpeaking ? alpha(accent, 0.4) : alpha(theme.palette.common.white, 0.1),
            }}
          >
            <MicrophoneStatusIcon trackRef={track} />
            <ParticipantName
              component="span"
              sx={{
                typography: "caption",
                fontWeight: 500,
                letterSpacing: "0.02em",
                lineHeight: 1,
              }}
            />
          </Stack>

          <IconButton
            aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Развернуть на весь экран"}
            onClick={toggleFullscreen}
            size="small"
            sx={{
              position: "absolute",
              top: 14,
              right: 14,
              zIndex: 2,
              color: "common.white",
              borderRadius: 2.5,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              backgroundColor: alpha(theme.palette.text.primary, 0.5),
              border: "1px solid",
              borderColor: alpha(theme.palette.common.white, 0.08),
              transition: "background-color 0.2s ease, transform 0.2s ease",
              "&:hover": {
                backgroundColor: alpha(theme.palette.text.primary, 0.8),
                transform: "scale(1.05)",
              },
            }}
          >
            {isFullscreen ? <IconFullscreenExit sx={{ fontSize: 18 }} /> : <IconFullscreen sx={{ fontSize: 18 }} />}
          </IconButton>
        </ParticipantContext.Provider>
      </Box>
    </Grid>
  );
}

// Колонок на плитку под число окон: сетка сама подбирает рядность, чтобы все
// плитки поместились в сцену целиком — без прокрутки и без обрезки.
const getTileColumns = (tracksCount) => {
  if (tracksCount <= 1) return 12;
  if (tracksCount <= 4) return 6;
  if (tracksCount <= 9) return 4;
  return 3;
};

function VideoGridSection() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const columns = getTileColumns(tracks.length);

  return (
    <Grid
      container
      columns={12}
      spacing={1}
      sx={{
        // MUI Grid — flex-контейнер с переносом: сцена задаёт ему высоту (flex: 1),
        // а align-content: stretch делит эту высоту между рядами, поэтому все
        // плитки помещаются целиком — без прокрутки и без обрезки
        flex: 1,
        minHeight: 0,
        alignContent: "stretch",
        overflow: "hidden",
      }}
    >
      {tracks.map((track) => (
        // Участник + источник трека дают стабильный ключ: у одного участника
        // камера и демонстрация экрана — разные плитки
        <ParticipantTileBox key={`${track.participant?.identity}-${track.source}`} track={track} columns={columns} />
      ))}
    </Grid>
  );
}

// Панель управления собрана из тех же примитивов LiveKit, что и `ControlBar`, но с явными
// опциями захвата у демонстрации экрана: у встроенного `ControlBar` их не задать, и он всегда
// просит FullHD (`screenShareCaptureOptions` — см. `services/lkRuntime.js`)
function MeetControlBar() {
  return (
    <Box className="lk-control-bar">
      <div className="lk-button-group">
        <TrackToggle source={Track.Source.Microphone}>Микрофон</TrackToggle>
        <div className="lk-button-group-menu">
          <MediaDeviceMenu kind="audioinput" />
        </div>
      </div>

      <div className="lk-button-group">
        <TrackToggle source={Track.Source.Camera}>Камера</TrackToggle>
        <div className="lk-button-group-menu">
          <MediaDeviceMenu kind="videoinput" />
        </div>
      </div>

      <TrackToggle source={Track.Source.ScreenShare} captureOptions={screenShareCaptureOptions} publishOptions={screenSharePublishOptions}>
        Демонстрация экрана
      </TrackToggle>

      <DisconnectButton>
        <LeaveIcon />
        Выйти
      </DisconnectButton>

      <StartMediaButton />
    </Box>
  );
}

function LkMeet(props) {
  const { phoneControlRdcr, lkControlRdcr, lkControlActions } = props;
  const theme = useTheme();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isRoomActive, setIsRoomActive] = useState(false);
  const [customRoom] = useState(() => getLiveKitRoom());
  const lkStyles = getLiveKitMuiStyles(theme);

  // Комната и токен — производные от query, локальной копии в состоянии нет
  const room = searchParams.get("lk_room") || "";
  const token = searchParams.get("lk_token") || "";

  // Своя комната и приглашение опираются на живую SIP-регистрацию, а не на AD: приглашение
  // уходит SIP MESSAGE, и номер комнаты — зарегистрированный внутренний номер (callerUserNum)
  const ownNum = phoneControlRdcr?.callerUserNum || "";
  const isSipRegistered = phoneControlRdcr?.regState === "ok";
  const canManageRoom = Boolean(isSipRegistered && ownNum);
  // Токен приходит только из query: свой токен для своей комнаты выдаёт /user/lk
  // (кнопка «Создать»), а по ссылке-приглашению он уже в query — тогда регистрация не нужна
  const hasLkAccess = Boolean(token || canManageRoom);
  const isOwnRoom = canManageRoom && ownNum === room;
  // Список приглашений — из среза (сид из localStorage, см. services/lkToken.js):
  // на номер хранится одно актуальное приглашение; показываем его только в своей комнате
  // при живой SIP-регистрации — как и кнопки управления
  const invites = lkControlRdcr?.invites || [];
  const isCreating = lkControlRdcr?.createStatus === "loading";

  let infoText = "";
  if (!hasLkAccess) {
    infoText = isSipRegistered ? "Не задан внутренний номер SIP." : "SIP регистрация не выполнена, встреча возможна по ссылке-приглашению.";
  }

  const handleInvite = () => lkControlActions.handleChangeStore("displayLkToken", true);
  const handleClose = () => lkControlActions.handleChangeStore("displayControl", false);
  // Своя комната создаётся только запросом к /user/lk: токен из ответа кладём в query
  const handleCreateRoom = async () => {
    const responseData = await lkControlActions.handleLkRoomCreate({
      num: ownNum,
      room: ownNum,
      uriLkToken: lkControlRdcr.uriLkToken,
    });

    const createdToken = responseData?.lk_token;
    if (!createdToken) return;

    navigate({ pathname: "/", search: buildRoomSearch(responseData.lk_room || ownNum, createdToken) });
  };

  if (!lkControlRdcr?.displayControl) return null;

  return (
    <Paper
      elevation={8}
      sx={{
        minWidth: 320,
        width: "100%",
        // Панель занимает всё свободное место окна, PANEL_HEIGHT — нижняя граница,
        // ниже которой сцену с сеткой видео уже не разместить
        flex: 1,
        minHeight: PANEL_HEIGHT,
        mx: "auto",
        mt: 2,
        bgcolor: PAPER_BACKGROUND,
        borderRadius: 3,
        position: "relative",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <IconButton aria-label="Закрыть панель" onClick={handleClose} sx={{ position: "absolute", top: 4, right: 4, zIndex: 1 }}>
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
            {room ? `Встреча ${room}` : "LiveKit Встреча"}
          </Typography>
        </Box>
      </Stack>

      <Divider />

      <Box sx={{ p: 1, flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {canManageRoom && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", alignItems: "center", flexShrink: 0 }}>
            {token ? (
              <Button variant="outlined" color="error" size="small" disabled={isRoomActive} component={RouterLink} to="/" startIcon={<DeleteOutlinedIcon />}>
                Удалить
              </Button>
            ) : (
              <Button
                variant="outlined"
                color="primary"
                size="small"
                disabled={isRoomActive || isCreating}
                onClick={handleCreateRoom}
                startIcon={isCreating ? <CircularProgress size={16} color="inherit" /> : <AddCircleOutlinedIcon />}
              >
                Создать
              </Button>
            )}

            {isOwnRoom &&
              (lkControlRdcr.displayLkToken ? (
                <LkToken {...props} />
              ) : (
                <Button variant="outlined" size="small" onClick={handleInvite} startIcon={<GroupAddIcon />}>
                  Пригласить
                </Button>
              ))}
          </Stack>
        )}

        {lkControlRdcr.createStatus === "error" && (
          <Alert severity="error" variant="standard" sx={{ py: 0, px: 1, fontSize: "0.8rem" }}>
            {lkControlRdcr.createMessage}
          </Alert>
        )}

        {isOwnRoom && invites.length > 0 && (
          // Строк может быть много: список ограничен по высоте и прокручивается, чтобы
          // не выдавливать кнопку подключения из панели
          <Stack spacing={0.25} sx={{ flexShrink: 0, maxHeight: 160, overflowY: "auto", pr: 0.5 }}>
            {invites.map((invite) => {
              const validUntil = formatInviteValidUntil(invite.expiresAt);

              return (
                <Stack key={invite.num} direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "center", flexWrap: "wrap" }}>
                  <Typography variant="body2" sx={{ color: "text.secondary" }}>
                    Приглашение для
                  </Typography>

                  <Link
                    component={RouterLink}
                    to={{ pathname: "/", search: buildRoomSearch(invite.room, invite.token) }}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Открыть встречу в новом окне"
                    sx={MEETING_LINK_SX}
                  >
                    <IconOpenInNew sx={{ fontSize: 14, flexShrink: 0 }} />
                    {invite.num}
                  </Link>

                  {validUntil && (
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {`до ${validUntil}`}
                    </Typography>
                  )}

                  <IconButton
                    size="small"
                    aria-label={`Убрать приглашение для ${invite.num}`}
                    title="Убрать из списка"
                    onClick={() => lkControlActions.handleRemoveInvite(invite.num)}
                    sx={{ color: "text.secondary" }}
                  >
                    <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                  </IconButton>
                </Stack>
              );
            })}
          </Stack>
        )}

        {Boolean(token) &&
          (isRoomActive ? (
            <>
              <GlobalStyles styles={lkStyles} />
              <LiveKitRoom
                data-lk-theme="default"
                token={token}
                serverUrl={lkControlRdcr.uriLk}
                connect={isRoomActive}
                video={false}
                audio={false}
                room={customRoom}
                onDisconnected={() => setIsRoomActive(false)}
                style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
              >
                <Box sx={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
                  <VideoGridSection />
                </Box>
                <MeetControlBar />
                <RoomAudioRenderer />
              </LiveKitRoom>
            </>
          ) : (
            <Box sx={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Button
                type="button"
                variant="contained"
                color="success"
                size="large"
                onClick={() => setIsRoomActive(true)}
                startIcon={<VideoCallOutlinedIcon />}
              >
                Подключиться к {room}
              </Button>
            </Box>
          ))}
      </Box>

      {/* Подвал панели: подсказка мелким текстом, тело остаётся рабочим (кнопки/комната).
          Цвет — через sx: проп color="text.secondary" в MUI 9 не матчится с вариантом
          (путь палитры там camelCase, textSecondary) и молча ничего не красит. */}
      {infoText && (
        <>
          <Divider />
          <Typography variant="caption" sx={{ display: "block", px: 1.5, py: 0.75, textAlign: "center", color: "text.secondary" }}>
            {infoText}
          </Typography>
        </>
      )}
    </Paper>
  );
}

LkMeet.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
  phoneControlActions: PropTypes.object.isRequired,
  lkControlRdcr: PropTypes.object,
  lkControlActions: PropTypes.object,
};

ParticipantTileBox.propTypes = {
  track: PropTypes.object.isRequired,
  columns: PropTypes.number.isRequired,
};

export default LkMeet;
