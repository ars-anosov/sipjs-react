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
} from '@mui/material'

import {
  Login   as IconLogin,
  Logout  as IconLogout,
  Close   as IconClose,
} from '@mui/icons-material'



function PhoneReg(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneReg hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props



  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhoneReg MOUNT')

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhoneReg UNMOUNT')
    }
  }, [])



  const handleClose = function() {
    phoneControlActions.handleChangeStore('displayReg', false)
  }

  const handleRegister = (event) => {
    event.preventDefault()
    const formData = { callerUserNum, regUserPass, uriHost, wssPort }
    phoneControlActions.handleClkRegister(formData, phoneControlRdcr)
  }

  const handleUnregister = () => {
    phoneControlActions.handleClkUnregister(phoneControlRdcr)
  }

  const [callerUserNum, setCallerUserNum] = useState(phoneControlRdcr.callerUserNum)
  const [regUserPass, setRegUserPass] = useState(phoneControlRdcr.regUserPass)
  const [uriHost, setUriHost] = useState(phoneControlRdcr.uriHost)
  const [wssPort, setWssPort] = useState(phoneControlRdcr.wssPort)
  const handleChange = (setter) => (event) => {
    setter(event.target.value)
  }

  const finalTemplate =
  <Paper elevation={8} sx={{ maxWidth: 480, mx: 'auto', p: 2, mt: 2 }}>
    <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
      <Typography variant="h6">Регистрация</Typography>
      <IconButton onClick={handleClose}>
        <IconClose color="error" />
      </IconButton>
    </Stack>

    <Box 
      component="form" 
      onSubmit={handleRegister} 
      noValidate 
      autoComplete="off"
    >
      <Stack spacing={2}>
        
        {/* Первый ряд */}
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            required
            id="callerUserNum"
            label="Number"
            variant="outlined"
            value={callerUserNum}
            onChange={handleChange(setCallerUserNum)}
          />
          <TextField
            fullWidth
            required
            id="regUserPass"
            label="Secret"
            type="password"
            variant="outlined"
            value={regUserPass}
            onChange={handleChange(setRegUserPass)}
          />
        </Stack>

        {/* Второй ряд */}
        <Stack direction="row" spacing={2}>
          <TextField
            fullWidth
            required
            id="uriHost"
            label="Host"
            variant="outlined"
            value={uriHost}
            onChange={handleChange(setUriHost)}
          />
          <TextField
            fullWidth
            required
            id="wssPort"
            label="Port"
            variant="outlined"
            value={wssPort}
            onChange={handleChange(setWssPort)}
          />
        </Stack>

        <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
          <Button
            type="button"
            variant="outlined"
            color="error"
            disabled={!phoneControlRdcr.regNow}
            onClick={handleUnregister}
            startIcon={<IconLogout />}
            size="large"
          >
            Unregister
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={phoneControlRdcr.regNow}
            startIcon={<IconLogin />}
            size="large"
          >
            Register
          </Button>
        </Stack>
      </Stack>
    </Box>

    <Collapse in={phoneControlRdcr.errComponent == 'PhoneReg' && phoneControlRdcr.errText}>
      <Alert severity="error" sx={{ mt: 2 }}>{phoneControlRdcr.errText}</Alert>
    </Collapse>
  </Paper>

  return finalTemplate
}



PhoneReg.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired,
}

export default PhoneReg