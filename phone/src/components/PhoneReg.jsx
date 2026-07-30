import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  TextField,
  Box,
  Button,
  Paper,
  Typography,
  Stack,
  IconButton,
  Alert,
  Collapse,
  InputAdornment,
  Avatar
} from '@mui/material'

import {
  Login as IconLogin,
  Logout as IconLogout,
  Close as IconClose,
  PhoneInTalk, // Иконка для логотипа SIP
  DialerSip,
  Lock,
  Dns,
  SettingsEthernet
} from '@mui/icons-material'

function PhoneReg(props) {
  const { phoneControlRdcr, phoneControlActions } = props

  useEffect(() => {
    if (import.meta.env.DEV) console.log('PhoneReg MOUNT')
    return () => {
      if (import.meta.env.DEV) console.log('PhoneReg UNMOUNT')
    }
  }, [])

  const [callerUserNum, setCallerUserNum] = useState(phoneControlRdcr.callerUserNum)
  const [regUserPass, setRegUserPass] = useState(phoneControlRdcr.regUserPass)
  const [uriHost, setUriHost] = useState(phoneControlRdcr.uriHost)
  const [wssPort, setWssPort] = useState(phoneControlRdcr.wssPort)

  // Синхронизация полей, когда authControlActions присылает новые данные SIP после AD-логина
  useEffect(() => {
    setCallerUserNum(phoneControlRdcr.callerUserNum || '')
    setRegUserPass(phoneControlRdcr.regUserPass || '')
    setUriHost(phoneControlRdcr.uriHost || '')
    setWssPort(phoneControlRdcr.wssPort || '')
  }, [phoneControlRdcr.callerUserNum, phoneControlRdcr.regUserPass, phoneControlRdcr.uriHost, phoneControlRdcr.wssPort])

  const handleClose = () => {
    phoneControlActions.handleChangeStore('displayReg', false)
    if (phoneControlRdcr.errComponent === 'PhoneReg') {
      phoneControlActions.handleChangeStore('errComponent', '')
      phoneControlActions.handleChangeStore('errText', '')
    }
  }

  const handleRegister = (event) => {
    event.preventDefault()
    if (!callerUserNum.trim() || !regUserPass.trim()) return
    phoneControlActions.handleClkRegister(
      { callerUserNum, regUserPass, uriHost, wssPort }, 
      phoneControlRdcr
    )
  }

  const handleUnregister = () => {
    phoneControlActions.handleClkUnregister(phoneControlRdcr)
  }

  const isRegistered = phoneControlRdcr.regNow

  return (
    <Paper 
      elevation={12} 
      sx={{ 
        maxWidth: 400, 
        width: '100%', 
        mx: 'auto', 
        mt: 2,
        p: 4, 
        borderRadius: 3, 
        position: 'relative'
      }}
    >
      {/* Кнопка закрытия сверху справа */}
      <IconButton 
        onClick={handleClose} 
        sx={{ position: 'absolute', top: 12, right: 12 }}
      >
        <IconClose color="action" />
      </IconButton>

      {/* Блок Логотипа и Заголовка */}
      <Stack spacing={1} sx={{ alignItems: 'center', mb: 4 }}>
        <Avatar 
          sx={{ 
            width: 56, 
            height: 56, 
            backgroundColor: isRegistered ? 'success.light' : 'primary.light', 
            mb: 1,
            transition: 'background-color 0.3s ease'
          }}
        >
          <PhoneInTalk sx={{ fontSize: 32, color: isRegistered ? 'success.main' : 'primary.main' }} />
        </Avatar>
        <Typography variant="h5" fontWeight="600" color="text.primary">
          SIP Регистрация
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isRegistered ? 'Статус: Подключен' : 'Телефон не зарегистрирован'}
        </Typography>
      </Stack>

      <Box component="form" onSubmit={handleRegister} noValidate>
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
            type="password"
            variant="outlined"
            value={regUserPass}
            onChange={(e) => setRegUserPass(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Безопасный условный рендеринг: инпуты вырезаются из DOM в продакшене */}
          {import.meta.env.DEV && (
            <Stack direction="row" spacing={2}>
              <TextField
                fullWidth
                required
                disabled={isRegistered}
                id="uriHost"
                label="Host"
                variant="outlined"
                size="small"
                value={uriHost}
                onChange={(e) => setUriHost(e.target.value)}
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
              <TextField
                fullWidth
                required
                disabled={isRegistered}
                id="wssPort"
                label="Port"
                variant="outlined"
                size="small"
                value={wssPort}
                onChange={(e) => setWssPort(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SettingsEthernet color="action" style={{ fontSize: 18 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Stack>
          )}

          {/* Управляющие кнопки */}
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {!isRegistered ? (
              <Button
                type="submit"
                variant="contained"
                color="primary"
                startIcon={<IconLogin />}
                size="large"
                fullWidth
                sx={{ py: 1.3, fontWeight: 'bold', borderRadius: 2 }}
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
                sx={{ py: 1.3, fontWeight: 'bold', borderRadius: 2 }}
              >
                Отключить телефон
              </Button>
            )}
          </Stack>

        </Stack>
      </Box>

      {/* Ошибки компонента */}
      <Collapse in={phoneControlRdcr.errComponent === 'PhoneReg' && !!phoneControlRdcr.errText}>
        <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
          {phoneControlRdcr.errText}
        </Alert>
      </Collapse>
    </Paper>
  )
}

PhoneReg.propTypes = {
  phoneControlRdcr: PropTypes.shape({
    callerUserNum: PropTypes.string,
    regUserPass: PropTypes.string,
    uriHost: PropTypes.string,
    wssPort: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    regNow: PropTypes.bool,
    errComponent: PropTypes.string,
    errText: PropTypes.string,
  }).isRequired,
  phoneControlActions: PropTypes.shape({
    handleClkRegister: PropTypes.func.isRequired,
    handleClkUnregister: PropTypes.func.isRequired,
    handleChangeStore: PropTypes.func.isRequired,
  }).isRequired,
}

export default PhoneReg
