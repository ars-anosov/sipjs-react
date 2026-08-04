import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import {
  TextField,
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  Grid,
  IconButton,
  Badge,
  InputAdornment,
  Collapse,
  Tooltip,
  Snackbar,
  Alert,
  AlertTitle,
} from '@mui/material'

import {
  Backspace     as IconBackspace,
  Phone         as IconPhone,
  History       as IconPhoneHistory,
  PhoneInTalk   as IconPhoneInTalk,
  PhoneDisabled as IconHangup,
  Pause         as IconHold,
  PlayArrow     as IconResume,
  Close         as IconClose,
  InfoOutlined  as IconInfoOutlined,
  Mail          as IconMail,
  WifiOff       as IconOffline,
  Wifi          as IconOnline,
  Dialpad       as IconDialpad,
} from '@mui/icons-material'



function PhonePad(props) {
  if (import.meta.env.DEV) console.log('PhonePad hook')

  const {
    phoneControlRdcr, phoneControlActions,
    showInput
  } = props
  const callNow = phoneControlRdcr.incomeCallNow || phoneControlRdcr.outgoCallNow
  const callStartRef = useRef(null)

  useEffect(() => {
    if (import.meta.env.DEV) console.log('PhonePad MOUNT')
    phoneControlActions.CallsArrUpdate()

    return () => {
      if (import.meta.env.DEV) console.log('PhonePad UNMOUNT')
    }
  }, [])

  useEffect(() => {
    if (!callNow) {
      setCallDuration(0)
      callStartRef.current = null
      return undefined
    }

    if (!callStartRef.current) {
      callStartRef.current = Date.now()
    }

    const intervalId = window.setInterval(() => {
      const elapsedSeconds = Math.floor((Date.now() - callStartRef.current) / 1000)
      setCallDuration(elapsedSeconds)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [callNow])

  const [callDuration, setCallDuration] = useState(0)
  const [info, setInfo] = useState({
    open: false,
  })

  const handleClose = function() {
    phoneControlActions.handleChangeStore('displayPad', false)
  }
  const handleCloseInfo = (event, reason) => {
    if (reason === 'clickaway') return
    setInfo((prev) => ({ ...prev, open: !prev.open }))
  }

  const formatDuration = (seconds = 0) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0')
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0')
    return `${minutes}:${remainingSeconds}`
  }

  const handlePrefix = (event) => {
    phoneControlActions.handleChangeStore('calleePrefix', event.target.value)
  }
  const updateCalleeStore = (newValue) => {
    phoneControlActions.handleChangeStore('calleePhoneNum', newValue)
  }
  const handleInput = (event) => {
    updateCalleeStore(event.target.value)
  }
  const handleKey = (digit) => {
    if (callNow) {
      phoneControlActions.handleClkDtmf(digit, phoneControlRdcr)
      return
    }
    updateCalleeStore(phoneControlRdcr.calleePhoneNum + digit)
  }
  const handleBackspace = () => {
    updateCalleeStore(phoneControlRdcr.calleePhoneNum.slice(0, -1));
  }
  const handleSubmit = (event) => {
    event.preventDefault()
    if (phoneControlRdcr.incomeDisplay) {
      phoneControlActions.handleClkSubmitIn(phoneControlRdcr)
    } else {
      phoneControlActions.handleClkSubmitOut(phoneControlRdcr.addPrefix ? phoneControlRdcr.calleePrefix+phoneControlRdcr.calleePhoneNum : phoneControlRdcr.calleePhoneNum, phoneControlRdcr)
    }
  }
  const handleReset = () => {
    updateCalleeStore('')
    const callData = {
      phoneHeader: phoneControlRdcr.callerUserNum,
    }
    phoneControlActions.handleClkReset(callData, phoneControlRdcr)
  }
  const handleHold = () => {
    phoneControlActions.handleClkHold(phoneControlRdcr, !phoneControlRdcr.callHoldNow)
  }

  const toggleHistory = () => {
    const nextDisplayHistory = !phoneControlRdcr.displayHistory
    phoneControlActions.handleChangeStore('displayHistory', nextDisplayHistory)

    if (nextDisplayHistory) {
      phoneControlActions.handleChangeStore('callUnread', 0)
    }
  }

  const toggleChat = () => {
    phoneControlActions.handleChangeStore('displayChat', !phoneControlRdcr.displayChat)
  }

  const togglePrefix = () => {
    phoneControlActions.handleChangeStore('addPrefix', !phoneControlRdcr.addPrefix)
  }

  const toggleReg = () => {
    phoneControlActions.handleChangeStore('displayReg', !phoneControlRdcr.displayReg)
  }

  const isRegistered = phoneControlRdcr.regNow
  const regButtonColor = isRegistered ? 'success' : 'error'

  const callActionSx = {
    minWidth: 64,
    height: 64,
    borderRadius: '50%',
    p: 0,
    boxShadow: 6,
    transition: 'transform 120ms ease, box-shadow 120ms ease, filter 120ms ease',
    '&:hover': {
      transform: 'translateY(-1px) scale(1.03)',
      boxShadow: 10,
      filter: 'brightness(1.04)'
    },
    '&:active': {
      transform: 'scale(0.98)',
      boxShadow: 4,
    },
  }

  const keys = [
    ['1', ''],
    ['2', 'abc'],
    ['3', 'def'],
    ['4', 'ghi'],
    ['5', 'jkl'],
    ['6', 'mno'],
    ['7', 'pqrs'],
    ['8', 'tuv'],
    ['9', 'wxyz'],
    ['*', ''],
    ['0', '+'],
    ['#', '']
  ]

  const finalTemplate =
    <Paper 
      elevation={ showInput ? 8 : 0 } 
      sx={{ 
        maxWidth: 320, 
        width: '100%', 
        mx: 'auto', 
        mt: 2,
        p: showInput ? 1 : 0, 
        borderRadius: 3, 
        position: 'relative'
      }}
    >
    {showInput && (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="h6" color="primary">SIP Телефон</Typography>
      <IconButton onClick={handleCloseInfo} sx={{ position: 'absolute', top: 4, right: 54  }}>
        <IconInfoOutlined color="action" />
      </IconButton>
      <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 4, right: 4 }}>
        <IconClose color="action" />
      </IconButton>
    </Stack>
    )}
    <Typography variant="body2" color="primary" sx={{ mb: 0.5 }}>
      {callNow && (formatDuration(callDuration))} {phoneControlRdcr.phoneHeader}
    </Typography>

    <Box component="form" onSubmit={handleSubmit} onReset={handleReset}>
      {/* Строчка ввода номера */}
      {showInput && (
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {phoneControlRdcr.addPrefix && (
        <TextField
          id="phone-pad-prefix"
          variant="standard"
          label="Префикс"
          type="tel"
          value={phoneControlRdcr.calleePrefix }
          onChange={handlePrefix}
          sx={{ width: '8ch' }}
        />
        )}
        <TextField
          fullWidth
          id="phone-pad-num"
          variant="standard"
          label="Номер телефона"
          type="tel"
          value={phoneControlRdcr.calleePhoneNum}
          onChange={handleInput}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleBackspace} size="small">
                    <IconBackspace />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
      </Stack>
      )}

      <Grid container spacing={2} sx={{ mb: 2, justifyContent: 'center', alignItems: 'center' }}>
        {/* Кнопка Вызов / Ответить */}
        <Grid size={callNow ? 4 : 6} sx={{ display: 'flex', justifyContent: 'center' }}>
          {phoneControlRdcr.incomeDisplay ? (
            <Button
              type="submit"
              variant="contained"
              color="success"
              sx={{
                ...callActionSx,
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)' },
                  '70%': { transform: 'scale(1.1)', boxShadow: '0 0 0 15px rgba(76, 175, 80, 0)' },
                  '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' },
                },
                animation: 'pulse 1.5s infinite'
              }}
            >
              <IconPhoneInTalk />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={!isRegistered || phoneControlRdcr.outgoCallNow || phoneControlRdcr.incomeCallNow}
              sx={callActionSx}
            >
              <IconPhone />
            </Button>
          )}
        </Grid>

        {/* Кнопка Удержания (Hold / Resume) */}
        {callNow && (
          <Grid size={4} sx={{ display: 'flex', justifyContent: 'center' }}>
            <Tooltip title={phoneControlRdcr.callHoldNow ? 'Resume' : 'Hold'}>
              <Button
                type="button"
                variant="contained"
                color={phoneControlRdcr.callHoldNow ? 'success' : 'info'}
                onClick={handleHold}
                sx={callActionSx}
              >
                {phoneControlRdcr.callHoldNow ? <IconResume /> : <IconHold />}
              </Button>
            </Tooltip>
          </Grid>
        )}

        {/* Кнопка Сброс */}
        <Grid size={callNow ? 4 : 6} sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            type="reset"
            variant="contained"
            color="error"
            disabled={!isRegistered}
            sx={callActionSx}
          >
            <IconHangup />
          </Button>
        </Grid>
      </Grid>


      {/* Цифровая панель */}
      {showInput && (
      <Grid container spacing={1}>
        {keys.map(([num, letters]) => (
          <Grid size={4} key={num} sx={{ textAlign: 'center' }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleKey(num)}
              sx={{
                height: 50,
                display: 'flex',
                flexDirection: 'column',
                textTransform: 'none',
                borderColor: 'divider',
                borderRadius: 2,
                color: 'text.primary'
              }}
            >
              <Typography variant="body1" sx={{ lineHeight: 1, fontWeight: 'bold' }}>
                {num}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {letters}
              </Typography>
            </Button>
          </Grid>
        ))}
      </Grid>
      )}

      <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <Tooltip title={isRegistered ? "Разрегистрироваться" : "Зарегистрироваться"}>
          <IconButton
            color={regButtonColor}
            onClick={toggleReg}
          >
            {isRegistered ? <IconOnline /> : <IconOffline />}
          </IconButton>
        </Tooltip>
       
        <Stack direction="row" spacing={1}>
          {showInput && (
          <Tooltip title="Префикс">
            <IconButton
              color={phoneControlRdcr.addPrefix ? 'primary' : 'default'}
              onClick={togglePrefix}
            >
              <IconDialpad />
            </IconButton>
          </Tooltip>
          )}
          <Badge
            badgeContent={phoneControlRdcr.callUnread}
            color="error"
            overlap="circular"
            invisible={!phoneControlRdcr.callUnread || phoneControlRdcr.displayHistory}
          >
            <Tooltip title="История">
              <IconButton
                color={phoneControlRdcr.displayHistory ? 'primary' : 'default'}
                onClick={toggleHistory}
              >
                <IconPhoneHistory />
              </IconButton>
            </Tooltip>
          </Badge>
          <Badge
            badgeContent={phoneControlRdcr.chatUnread}
            color="error"
            overlap="circular"
            invisible={!phoneControlRdcr.chatUnread || phoneControlRdcr.displayChat}
          >
            <Tooltip title="Сообщения">
              <IconButton
                color={phoneControlRdcr.displayChat ? 'primary' : 'default'}
                onClick={toggleChat}
              >
                <IconMail />
              </IconButton>
            </Tooltip>
          </Badge>
        </Stack>

      </Stack>

    </Box>

    <Collapse in={phoneControlRdcr.errComponent == 'PhonePad' && phoneControlRdcr.errText}>
      <Alert severity="error" sx={{ mt: 2 }}>{phoneControlRdcr.errText}</Alert>
    </Collapse>

    <Snackbar 
      open={info.open}
      onClose={handleCloseInfo}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
    >
      <Alert 
        onClose={handleCloseInfo}
        severity="info"
        sx={{ width: '100%' }}
      >
        <AlertTitle>Если нет системных уведомлений о звонках:</AlertTitle>
        Проверьте настройки вашей Windows:
        <ol style={{ margin: '8px 0 0 20px', padding: 0 }}>
          <li>
            <strong>Режим «Не беспокоить» (Focus Assist)</strong>: 
            Нажмите комбинацию клавиш <kbd>Win + N</kbd>. 
            Убедитесь, что значок колокольчика / полумесяца <strong>выключен</strong>.
          </li>
          <li>
            <strong>Системные разрешения для браузера</strong>: 
            Нажмите комбинацию клавиш <kbd>Win + I</kbd> → Система → Уведомления. 
            Найдите в списке ваш браузер (Chrome / Edge) и убедитесь, что переключатель для него находится в положении <strong>«Вкл»</strong>.
          </li>
          <li>
            <strong>Приоритет баннеров</strong>: 
            Там же нажмите на стрелочку рядом с браузером и проверьте, стоит ли галочка на пункте 
            <em>«Показывать баннеры уведомлений»</em>, иначе пуши будут падать в историю скрытно.
          </li>
        </ol>
      </Alert>
    </Snackbar>
  </Paper>

  return finalTemplate
}



PhonePad.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired,
  showInput             : PropTypes.bool.isRequired,
}

export default PhonePad
