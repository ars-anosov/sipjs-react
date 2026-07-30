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
}                         from '@mui/icons-material'

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
    return <IconMicOff sx={{ fontSize: 14, color: 'error.main' }} />
  }

  return (
    <IconMicOn 
      sx={{ 
        fontSize: 14, 
        color: isSpeaking ? 'success.main' : 'white',
        animation: isSpeaking ? 'lkPulse 1s infinite alternate' : 'none',
        '@keyframes lkPulse': {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.15)' },
        },
      }} 
    />
  )
}

function ParticipantTileBox({ track }) {
  const containerRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isScreenShare = track.source === Track.Source.ScreenShare

  // Извлекаем флаг активности голоса напрямую из объекта участника LiveKit
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
          borderRadius: isFullscreen ? 0 : 4, 
          backgroundColor: 'black',
          position: 'relative',
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          isolation: 'isolate',
          backgroundClip: 'padding-box',

          // ПЛАВНАЯ ЗЕЛЕНАЯ ПОДСВЕТКА ПРИ РАЗГОВОРЕ:
          // Анимация перехода для тени и обводки
          transition: 'box-shadow 0.25s ease-in-out, outline-color 0.25s ease-in-out',
          
          // Внешняя неоновая обводка (меняет цвет на зеленый, если говорит, иначе — черный фикс)
          outline: '2px solid',
          outlineColor: isSpeaking ? '#4caf50' : 'black', 
          outlineOffset: '-2px',

          // Мягкое внутреннее свечение, чтобы подсветить края видео
          boxShadow: isFullscreen 
            ? 0 
            : (isSpeaking 
                ? 'inset 0 0 20px rgba(76, 175, 80, 0.6), 0 4px 20px rgba(76, 175, 80, 0.3)' 
                : 3
              ),
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
              backgroundColor: 'black',
              borderRadius: isFullscreen ? 0 : '16px', 
              overflow: 'hidden',
            }}
          />

          {/* Плашка с именем и статусом микрофона */}
          <Stack
            direction="row"
            spacing={0.5}
            sx={{
              position: 'absolute',
              bottom: 12,
              left: 12,
              zIndex: 2,
              alignItems: 'center',
              color: 'white',
              px: 1,
              py: 0.3,
              borderRadius: 1,
              pointerEvents: 'none',
              backgroundColor: 'rgba(0, 0, 0, 0.4)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              
              // Дополнительно подсветим плашку имени говорящего
              transition: 'background-color 0.25s ease',
              backgroundColor: isSpeaking ? 'rgba(76, 175, 80, 0.3)' : 'rgba(0, 0, 0, 0.4)',
              border: isSpeaking ? '1px solid rgba(76, 175, 80, 0.5)' : '1px solid transparent',
            }}
          >
            <MicrophoneStatusIcon trackRef={track} />
            <ParticipantName component="span" sx={{ typography: 'caption', lineHeight: 1 }} />
          </Stack>

          {/* Кнопка полноэкранного режима */}
          <IconButton 
            onClick={toggleFullscreen} 
            size="small" 
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 2,
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.8)' },
            }}
          >
            {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
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
    <Grid container spacing={2} sx={{ justifyContent: 'center', width: '100%' }}>
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
      videoCodec: 'av1', 
      backupCodec: 'vp9',
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
    <Paper 
      elevation={8} 
      sx={{ 
        maxWidth: 300, 
        width: '100%', 
        mx: 'auto', 
        mt: 2,
        p: 1, 
        borderRadius: 3, 
        position: 'relative'
      }}
    >
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" color="primary">Встреча {room}</Typography>
        <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 4, right: 4 }}>
          <IconClose color="action" />
        </IconButton>
      </Stack>

      <Grid container direction="column" spacing={2} sx={{ justifyContent: 'center' }}>
      
        {authControlRdcr?.responseData?.sip_username && authControlRdcr?.responseData?.lk_token && (
        <Grid size={{ xs: 'auto' }} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
          {token ? (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            component={RouterLink} 
            to={'/'} 
          >
            Удалить
          </Button>
          ) : (
          <Button
            variant="outlined"
            color="primary"
            size="small"
            component={RouterLink} 
            to={`/?lk_room=${authControlRdcr.responseData.sip_username}&lk_token=${authControlRdcr.responseData.lk_token}`} 
          >
            Создать
          </Button>
          )}
          {!lkControlRdcr.displayLkToken && (
          <Button
            type="button"
            variant="outlined"
            color="primary"
            size="small"
            onClick={handleInvite}
          >
            Пригласить
          </Button>
          )}
          <LkToken {...props}/>
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
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <Button
              type="button"
              variant="contained"
              color="success"
              size="large"
              onClick={() => setIsRoomActive(true)}
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
            video={true}
            audio={true}
            room={customRoom}
            onDisconnected={() => setIsRoomActive(false)}
          >
            
            <VideoGridSection />
            <ControlBar 
              controls={{
                screenShare: true,
                chat: false, // пример отключения ненужных кнопок, если требуется
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
