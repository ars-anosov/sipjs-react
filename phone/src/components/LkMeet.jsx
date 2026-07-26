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
}                         from '@mui/material'

import {
  Close as IconClose,
  Fullscreen as IconFullscreen,
  FullscreenExit as IconFullscreenExit,
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
  useTracks ,
}                         from '@livekit/components-react'
import { Track }          from 'livekit-client'
import                    '@livekit/components-styles'

import LkToken            from './LkToken'



function ParticipantTileBox({ track }) {
  const containerRef              = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  return (
    <Grid
      size={{ xs: 12, md: 'auto' }}
      sx={{
        width: '100%',
        height: '100%',
        aspectRatio: '16/9',
        maxWidth: 800,
        maxHeight: 600,
        borderRadius: 2,
        overflow: 'hidden',
        boxShadow: 3,
        backgroundColor: 'black',
        position: 'relative' // Критически важно для дочернего zIndex!
      }}
      ref={containerRef}
    >
      <ParticipantContext.Provider value={track.participant}>
        <AudioTrack trackRef={track} />

        {/* Видео занимает весь контейнер */}
        <VideoTrack
          trackRef={track}
          style={{
            width: '100%',
            height: '100%',
            objectFit: isFullscreen ? 'contain' : 'cover',
            backgroundColor: 'black'
          }}
        />

        {/* Плашка с именем */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          left: '12px',
          zIndex: 2, // Поднимаем над тегом video
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontFamily: 'sans-serif',
          fontSize: '14px',
          pointerEvents: 'none'
        }}>
          <ParticipantName />
        </div>

        {/* Кнопка полноэкранного режима */}
        <IconButton
          onClick={toggleFullscreen}
          size="small"
          sx={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            zIndex: 2,
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
            }
          }}
        >
          {isFullscreen ? <IconFullscreenExit /> : <IconFullscreen />}
        </IconButton>
      </ParticipantContext.Provider>
    </Grid>
  )
}

ParticipantTileBox.propTypes = {
  track: PropTypes.object.isRequired,
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
  const location                        = useLocation()

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
    <style>{`
      [data-lk-theme='default'] {
        --lk-bg: #fff;
      }
    `}</style>
    <Paper elevation={8} sx={{ p: 1, pt: 0, mt: 2, display: 'inline-block' }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Встреча {room}</Typography>
        <IconButton onClick={handleClose}>
          <IconClose color="error" />
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
          <LiveKitRoom
            data-lk-theme="default"
            token={token}
            serverUrl={lkControlRdcr.uriLk}
            connect={isRoomActive}
            video={true}
            audio={true}
            onDisconnected={() => setIsRoomActive(false)}
          >
            <VideoGridSection />
              <ControlBar />
            <RoomAudioRenderer />
          </LiveKitRoom>
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

export default LkMeet
