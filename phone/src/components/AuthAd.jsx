import { useState } from 'react'
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

  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [uriAdAuth, setUriAdAuth] = useState(authControlRdcr.uriAdAuth || '')

  const handleSubmit = (event) => {
    event.preventDefault()
    authControlActions.handleAdRegister({ login, password, uriAdAuth })
  }

  const handleReset = () => {
    setLogin('')
    setPassword('')
    setUriAdAuth(authControlRdcr.uriAdAuth || '')
    // authControlActions.handleAdAuthClear()
  }

  const handleClose = () => {
    authControlActions.handleChangeStore('displayAd', false)
  }

  return (
    <Paper elevation={8} sx={{ maxWidth: 480, width: '100%', mx: 'auto', p: 1, pt: 0, mt: 2 }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" color="primary">AD Авторизация</Typography>
        <IconButton onClick={handleClose}>
            <IconClose color="error" />
        </IconButton>
      </Stack>

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        autoComplete="off"
      >
        <Stack spacing={2}>

          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              required
              id="adAuthLogin"
              label="Login"
              variant="outlined"
              value={login}
              onChange={(event) => setLogin(event.target.value)}
            />

            <TextField
              fullWidth
              required
              id="adAuthPassword"
              label="Password"
              type="password"
              variant="outlined"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Stack>

          <TextField
            fullWidth
            required
            id="uriAdAuth"
            label="API URI"
            variant="outlined"
            value={uriAdAuth}
            onChange={(event) => setUriAdAuth(event.target.value)}
            sx={{ display: import.meta.env.DEV ? 'block' : 'none' }}
          />

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              color="primary"
              size="large"
              onClick={handleReset}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<IconLogin />}
              size="large"
              disabled={authControlRdcr.status === 'loading'}
            >
              Login
            </Button>
          </Stack>

        </Stack>
      </Box>

      <Collapse in={!!authControlRdcr.message}>
        <Alert severity={authControlRdcr.status === 'error' ? 'error' : 'success'} sx={{ mt: 2 }}>
          {authControlRdcr.message}
        </Alert>
      </Collapse>
    </Paper>
  )
}

AdAuth.propTypes = {
  authControlRdcr: PropTypes.object.isRequired,
  authControlActions: PropTypes.object.isRequired,
}

export default AdAuth
