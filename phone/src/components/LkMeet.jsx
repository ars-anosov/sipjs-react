import {
  useState,
  useEffect,
  useRef,
}                         from 'react'
import PropTypes          from 'prop-types'
import {
  useLocation,
  Link as RouterLink,
}                         from 'react-router-dom'

import {
  Box,
  Grid,
  Paper,
  Stack,
  Button,
  Typography,
  Link,
  IconButton,
  GlobalStyles,
}                         from '@mui/material'

import {
  Close as IconClose,
  Fullscreen as IconFullscreen,
  FullscreenExit as IconFullscreenExit,
  Mic as IconMicOn,
  MicOff as IconMicOff,
  DeleteOutlined as DeleteOutlinedIcon,
  AddCircleOutlined as AddCircleOutlinedIcon,
  GroupAdd as GroupAddIcon,
  VideoCallOutlined as VideoCallOutlinedIcon,
}                         from '@mui/icons-material';


import { 
  LiveKitRoom, 
  GridLayout, 
  ParticipantTile,
  ParticipantContext,
  ParticipantName,
  VideoTrack, 
  AudioTrack, 
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useTrackMutedIndicator,
}                         from '@livekit/components-react'
import {
  Room,
  Track,
  VideoPresets,
}                         from 'livekit-client'
import                    '@livekit/components-styles'
import { useTheme }       from '@mui/material/styles'
import { getLiveKitMuiStyles } from './LkThemeStyles'

import LkToken            from './LkToken'

function MicrophoneStatusIcon({ trackRef }) {
  const participant = trackRef?.participant
  if (!participant) return null
  const isMuted = !participant.isMicrophoneEnabled
  const isSpeaking = participant.isSpeaking

  if (isMuted) {
    // Используем CSS-переменную ошибки v9 и более утонченный размер
    return <IconMicOff sx={{ fontSize: 13, color: 'var(--mui-palette-error-main)' }} />
  }

  return (
    <IconMicOn 
      sx={{ 
        fontSize: 13, 
        // Используем CSS-переменную успеха v9
        color: isSpeaking ? 'var(--mui-palette-success-main)' : '#ffffff',
        animation: isSpeaking ? 'lkPulse 1.4s infinite cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        '@keyframes lkPulse': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.18)' },
          '100%': { transform: 'scale(1)' },
        },
      }} 
    />
  )
}

function ParticipantTileBox({ track }) {
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isScreenShare = track.source === Track.Source.ScreenShare
  const isSpeaking = track.participant?.isSpeaking

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!containerRef.current) return
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen?.()
      } else {
        await document.exitFullscreen?.()
      }
    } catch (err) {
      console.error("Ошибка переключения полноэкранного режима:", err)
    }
  }

  return (
    <Grid 
      size={isScreenShare ? { xs: 12 } : { xs: 12, md: 'auto' }}
      sx={{ border: 'none', boxShadow: 'none', overflow: 'visible' }}
    >
      <Box
        ref={containerRef}
        sx={{
          width: '100%',
          height: isFullscreen ? '100vh' : (isScreenShare ? 'auto' : '100%'),
          maxWidth: isFullscreen ? 'none' : 800,
          maxHeight: isFullscreen ? 'none' : 600,
          aspectRatio: isScreenShare ? 'unset' : '16/9',
          
          // ТРЕНД: Увеличенный современный радиус скругления (16px) вместо жестких углов
          borderRadius: isFullscreen ? 0 : '16px', 
          
          // Смягчаем фоновый цвет: глубокий графитовый вместо глухого черного
          backgroundColor: '#0f172a', 
          position: 'relative',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          isolation: 'isolate',
          backgroundClip: 'padding-box',

          // СОВРЕМЕННАЯ ИНДИКАЦИЯ ГОЛОСА:
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '1px solid',
          borderColor: isSpeaking ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255, 255, 255, 0.08)',

          // Динамическое неоновое свечение (Glow effect) вокруг карточки говорящего
          boxShadow: isFullscreen 
            ? 'none' 
            : (isSpeaking 
                ? '0 0 0 2px rgba(74, 222, 128, 0.2), 0 10px 30px -10px rgba(74, 222, 128, 0.3)' 
                : '0 4px 20px -5px rgba(0, 0, 0, 0.3)'
              ),

          '&:hover': {
            // Мягкий интерактивный подъем карточки при наведении, если нет полноэкранного режима
            transform: isFullscreen ? 'none' : 'translateY(-2px)',
            borderColor: isSpeaking ? 'rgba(74, 222, 128, 0.6)' : 'rgba(255, 255, 255, 0.2)',
          }
        }}
      >
        <ParticipantContext.Provider value={track.participant}>
          <AudioTrack trackRef={track} />
          
          <VideoTrack 
            trackRef={track}
            priority={(isFullscreen || isScreenShare) ? 'high' : 'low'} 
            style={{ 
              width: '100%',
              height: isFullscreen ? '100%' : (isScreenShare ? 'auto' : '100%'),
              maxHeight: isFullscreen ? 'none' : '600px',
              objectFit: (isFullscreen || isScreenShare) ? 'contain' : 'cover',
              backgroundColor: 'transparent',
              // Наследуем скругление родителя
              borderRadius: 'inherit', 
              overflow: 'hidden',
            }}
          />

          {/* Плашка с именем (Стиль: Glassmorphism / Матовое стекло) */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              position: 'absolute',
              bottom: 14,
              left: 14,
              zIndex: 2,
              alignItems: 'center',
              color: '#ffffff',
              px: 1.5,
              py: 0.6,
              borderRadius: '20px', // Полностью скругленная pill-плашка
              pointerEvents: 'none',
              
              // Размытие заднего плана (Glassmorphism)
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              
              // Эволюция цвета при разговоре через CSS-переменные v9
              transition: 'all 0.25s ease',
              backgroundColor: isSpeaking ? 'rgba(34, 197, 94, 0.2)' : 'rgba(15, 23, 42, 0.6)',
              border: '1px solid',
              borderColor: isSpeaking ? 'rgba(74, 222, 128, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            }}
          >
            <MicrophoneStatusIcon trackRef={track} />
            <ParticipantName 
              component="span" 
              sx={{ 
                typography: 'caption', 
                fontWeight: 500, // Чуть более плотный современный шрифт
                letterSpacing: '0.02em',
                lineHeight: 1 
              }} 
            />
          </Stack>

          {/* Кнопка полноэкранного режима (Утонченный стеклянный дизайн) */}
          <IconButton 
            onClick={toggleFullscreen} 
            size="small" 
            sx={{
              position: 'absolute',
              top: 14,
              right: 14,
              zIndex: 2,
              color: '#ffffff',
              borderRadius: '10px',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              backgroundColor: 'rgba(15, 23, 42, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              transition: 'all 0.2s ease',
              '&:hover': { 
                backgroundColor: 'rgba(15, 23, 42, 0.8)',
                transform: 'scale(1.05)'
              },
            }}
          >
            {isFullscreen ? <IconFullscreenExit sx={{ fontSize: 18 }} /> : <IconFullscreen sx={{ fontSize: 18 }} />}
          </IconButton>
        </ParticipantContext.Provider>
      </Box>
    </Grid>
  )
}

function VideoGridSection() {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false }
  ])

  return (
    // Увеличенное расстояние между карточками (spacing={3}) добавляет интерфейсу "воздуха"
    <Grid container spacing={3} sx={{ justifyContent: 'center', width: '100%', p: 2 }}>
      {tracks.map((track, uniqueKey) => (
        <ParticipantTileBox key={uniqueKey} track={track} />
      ))}
    </Grid>
  )
}

function LkMeet(props) {
  const { authControlRdcr, lkControlRdcr, lkControlActions } = props
  const [isRoomActive, setIsRoomActive] = useState(false)
  const [room, setRoom]                 = useState('')
  const [token, setToken]               = useState('')
  const [customRoom] = useState(() => new Room({
    adaptiveStream: false, 
    dynacast: false,       

    videoCaptureDefaults: {
      resolution: { width: 1920, height: 1080 },
    },

    screenShareCaptureDefaults: {
      resolution: {
        width: 2560,
        height: 1440,
        frameRate: 30,
      },
    },

    publishDefaults: {
      screenShareEncoding: VideoPresets.h1440.encoding, 
      simulcast: false, 
      videoCodec: 'vp8', 
      backupCodec: 'h264',
    }
  }))
  const location                        = useLocation()
  const theme                           = useTheme()
  const lkStyles                        = getLiveKitMuiStyles(theme)

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const lk_room = searchParams.get('lk_room') || ''
    const lk_token = searchParams.get('lk_token') || ''

    setRoom(lk_room)
    setToken(lk_token)
    // if (lk_room && lk_token) {
    //   setIsRoomActive(true)
    // }
  }, [location])

  const handleInvite = () => {
    lkControlActions.handleChangeStore('displayLkToken', true)
  }
  const handleClose = () => {
    lkControlActions.handleChangeStore('displayControl', false)
  }

  return (
    (lkControlRdcr.displayControl && (authControlRdcr?.responseData?.lk_token || token) && (
    <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
    <Paper elevation={8} sx={{ minWidth: 320, p: 1, pt: 0, mt: 2, borderRadius: 3, display: 'inline-block' }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" color="primary">Встреча {room}</Typography>
        <IconButton onClick={handleClose}>
          <IconClose color="action" />
        </IconButton>
      </Stack>

      <Grid 
        container 
        direction="column" 
        spacing={2} 
      >
        {authControlRdcr?.responseData?.sip_username && authControlRdcr?.responseData?.lk_token && (
        <Grid 
          size={{ xs: 'auto' }} 
          sx={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: 1.5,
          }}
        >
          {token ? (
          <Button
            variant="outlined"
            color="error"
            size="medium"
            disabled={isRoomActive}
            component={RouterLink} 
            to="/" 
            startIcon={<DeleteOutlinedIcon />}
          >
            Удалить
          </Button>
          ) : (
          <Button
            variant="outlined"
            color="primary" 
            size="medium"
            component={RouterLink} 
            to={`/?lk_room=${authControlRdcr.responseData.sip_username}&lk_token=${authControlRdcr.responseData.lk_token}`} 
            startIcon={<AddCircleOutlinedIcon />}
          >
            Создать
          </Button>
          )}

          {authControlRdcr.responseData.sip_username == room && (
            !lkControlRdcr.displayLkToken ? (
            <Button
              type="button"
              variant="outlined"
              color="primary" 
              size="medium"
              onClick={handleInvite}
              startIcon={<GroupAddIcon />}
            >
              Пригласить
            </Button>
            ) : (
            <LkToken {...props} />
            )
          )}

        </Grid>
        )}

        {lkControlRdcr?.responseData?.lk_token && token && (
        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          <Typography>
            Приглашение для
          </Typography>
          <Link 
            component={RouterLink}
            to={`/?lk_room=${authControlRdcr.responseData.sip_username}&lk_token=${lkControlRdcr.responseData.lk_token}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {lkControlRdcr.responseData.lk_num}
          </Link>
        </Grid>
        )}

        {token && (
        <Grid size={{ xs: 12 }} sx={{ display: 'flex', justifyContent: 'center' }}>
          {!isRoomActive ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 1 }}>
            <Button
              type="button"
              size="large"
              variant="contained"
              color="success"
              onClick={() => setIsRoomActive(true)}
              startIcon={<VideoCallOutlinedIcon />}
              sx={{ bgcolor: 'success.light', p: 2, borderRadius: 2 }}
            >
              Подключиться к {room}
            </Button>
          </Box>
          ) : (
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
          >
            
            <VideoGridSection />
            <ControlBar 
              controls={{
                screenShare: true,
                chat: false,
              }}
            />
            <RoomAudioRenderer />
          </LiveKitRoom>
          </>
          )}
        </Grid>
        )}

      </Grid>
    </Paper>
    </Box>
    ))
  )
}

LkMeet.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
  phoneControlActions: PropTypes.object.isRequired,
  authControlRdcr: PropTypes.object,
  authControlActions: PropTypes.object,
}

ParticipantTileBox.propTypes = {
  track: PropTypes.object.isRequired,
}

export default LkMeet
