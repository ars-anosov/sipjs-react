import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material'

import {
  Login as IconLogin,
  Close as IconClose,
} from '@mui/icons-material'

function AdAuth(props) {
  const {
    authControlRdcr,
    authControlActions,
  } = props
  
  // Подтягиваем adLogin из localStorage при инициализации
  const [login, setLogin] = useState(() => localStorage.getItem('adLogin') || '')
  const [password, setPassword] = useState('')
  const [uriAdAuth, setUriAdAuth] = useState('')

  const isLoading = authControlRdcr.status === 'loading'
  const isError = authControlRdcr.status === 'error'

  // Синхронизируем URI из стора при его изменении
  useEffect(() => {
    setUriAdAuth(authControlRdcr.uriAdAuth || '')
  }, [authControlRdcr.uriAdAuth])

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!login.trim() || !password.trim()) return
    authControlActions.handleAdRegister({ login, password, uriAdAuth })
  }

  const handleReset = () => {
    setLogin('')
    setPassword('')
    setUriAdAuth(authControlRdcr.uriAdAuth || '')
    authControlActions.handleAdAuthClear()
  }

  const handleClose = () => {
    authControlActions.handleChangeStore('displayAd', false)
  }

  // Валидация кнопки отправки
  const isSubmitDisabled = isLoading || !login.trim() || !password.trim() || (import.meta.env.DEV && !uriAdAuth.trim())

  return (
    <Paper elevation={8} sx={{ maxWidth: 480, width: '100%', mx: 'auto', p: 2, pt: 1, mt: 2 }}>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" color="primary">AD Авторизация</Typography>
        <IconButton onClick={handleClose} disabled={isLoading}>
          <IconClose color="error" />
        </IconButton>
      </Stack>

      <Box component="form" onSubmit={handleSubmit} noValidate>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              fullWidth
              required
              disabled={isLoading}
              id="adAuthLogin"
              label="Login"
              variant="outlined"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />

            <TextField
              fullWidth
              required
              disabled={isLoading}
              id="adAuthPassword"
              label="Password"
              type="password"
              variant="outlined"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Stack>

          {import.meta.env.DEV && (
            <TextField
              fullWidth
              required
              disabled={isLoading}
              id="uriAdAuth"
              label="API URI (Dev Only)"
              variant="outlined"
              value={uriAdAuth}
              onChange={(event) => setUriAdAuth(event.target.value)}
            />
          )}

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              color="primary"
              size="large"
              onClick={handleReset}
              disabled={isLoading}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<IconLogin />}
              size="large"
              disabled={isSubmitDisabled}
            >
              Login
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Collapse in={!!authControlRdcr.message}>
        <Alert severity={isError ? 'error' : 'success'} sx={{ mt: 2 }}>
          {authControlRdcr.message}
        </Alert>
      </Collapse>
    </Paper>
  )
}

AdAuth.propTypes = {
  authControlRdcr: PropTypes.shape({
    uriAdAuth: PropTypes.string,
    status: PropTypes.string,
    message: PropTypes.string,
  }).isRequired,
  authControlActions: PropTypes.shape({
    handleAdRegister: PropTypes.func.isRequired,
    handleChangeStore: PropTypes.func.isRequired,
    handleAdAuthClear: PropTypes.func.isRequired,
  }).isRequired,
}

export default AdAuth
