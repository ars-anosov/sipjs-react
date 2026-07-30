import { useState, useEffect } from 'react'
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
  Alert,
  Collapse,
  Tooltip,
} from '@mui/material'

import {
  Backspace     as IconBackspace,
  Phone         as IconPhone,
  History       as IconPhoneHistory,
  RingVolume    as IconPhoneRing,
  PhoneDisabled as IconHangup,
  Pause         as IconHold,
  PlayArrow     as IconResume,
  Close         as IconClose,
  Mail          as IconMail,
  WifiOff       as IconOffline,
  Wifi          as IconOnline,
  Dialpad       as IconDialpad,
} from '@mui/icons-material'



function PhonePad(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhonePad hook')

  const {
    phoneControlRdcr, phoneControlActions,
    showInput
  } = props



  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhonePad MOUNT')
    phoneControlActions.CallsArrUpdate()

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhonePad UNMOUNT')
    }
  }, [])



  const handleClose = function() {
    phoneControlActions.handleChangeStore('displayPad', false)
  }

  const callNow = phoneControlRdcr.incomeCallNow || phoneControlRdcr.outgoCallNow

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
    {showInput && (
    <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="h6" color="primary">SIP Телефон</Typography>
      <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 4, right: 4 }}>
        <IconClose color="action" />
      </IconButton>
    </Stack>
    )}
    <Typography variant="body2" color="primary" sx={{ mb: 2 }}>
      {phoneControlRdcr.phoneHeader}
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
              variant="contained" // Сплошной цветной фон
              color="success"
              sx={{
                minWidth: 56,      // Делаем кнопку идеально круглой, как Fab
                height: 56,
                borderRadius: '50%',
                p: 0,
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)' },
                  '70%': { transform: 'scale(1.1)', boxShadow: '0 0 0 15px rgba(76, 175, 80, 0)' },
                  '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' },
                },
                animation: 'pulse 1.5s infinite'
              }}
            >
              <IconPhoneRing />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={!isRegistered || phoneControlRdcr.outgoCallNow || phoneControlRdcr.incomeCallNow}
              sx={{
                minWidth: 56,
                height: 56,
                borderRadius: '50%',
                p: 0
              }}
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
                sx={{
                  minWidth: 56,
                  height: 56,
                  borderRadius: '50%',
                  p: 0
                }}
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
            sx={{
              minWidth: 56,
              height: 56,
              borderRadius: '50%',
              p: 0
            }}
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
        <Tooltip title="Регистрация">
          <IconButton
            color={regButtonColor}
            onClick={toggleReg}
          >
            {isRegistered ? <IconOnline /> : <IconOffline />}
          </IconButton>
        </Tooltip>

        {showInput && (
        <Stack direction="row" spacing={1}>
          <Tooltip title="Префикс">
            <IconButton
              color={phoneControlRdcr.addPrefix ? 'primary' : 'default'}
              onClick={togglePrefix}
            >
              <IconDialpad />
            </IconButton>
          </Tooltip>

          <Badge
            badgeContent={phoneControlRdcr.callUnread}
            color="error"
            overlap="circular"
            invisible={!phoneControlRdcr.callUnread || phoneControlRdcr.displayHistory}
            sx={{ '& .MuiBadge-badge': { top: 6, right: 6 } }}
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
            sx={{ '& .MuiBadge-badge': { top: 6, right: 6 } }}
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
        )}
      </Stack>

    </Box>

    <Collapse in={phoneControlRdcr.errComponent == 'PhonePad' && phoneControlRdcr.errText}>
      <Alert severity="error" sx={{ mt: 2 }}>{phoneControlRdcr.errText}</Alert>
    </Collapse>
  </Paper>



  return finalTemplate
}



PhonePad.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired,
  showInput             : PropTypes.bool.isRequired,
}

export default PhonePad
