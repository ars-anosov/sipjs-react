import * as React from 'react';
import PropTypes from 'prop-types';

import {
  TextField,
  Box,
  Button,
  Paper,
  Stack,
  IconButton,
  Alert,
  Collapse,
} from '@mui/material'

import {
  Login as IconLogin,
  Close as IconClose,
} from '@mui/icons-material'



function PhoneReg(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneReg hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props



  React.useEffect(() => {
    console.log('PhoneReg MOUNT')

    return () => {
      console.log('PhoneReg UNMOUNT')
    }
  }, [])



  const handleClose = function() {
    phoneControlActions.handleChangeData({'target':{'id':'displayReg', 'value':false}})
  }

  const handleRegister = (event) => {
    event.preventDefault()
    const formData = { callerUserNum, regUserPass, uriHost, wssPort }
    phoneControlActions.handleClkRegister(formData, phoneControlRdcr)
  }

  const [callerUserNum, setCallerUserNum] = React.useState(phoneControlRdcr.callerUserNum)
  const [regUserPass, setRegUserPass] = React.useState(phoneControlRdcr.regUserPass)
  const [uriHost, setUriHost] = React.useState(phoneControlRdcr.uriHost)
  const [wssPort, setWssPort] = React.useState(phoneControlRdcr.wssPort)
  const handleChange = (setter) => (event) => {
    setter(event.target.value);
  }

  // Добавить анимацию алерта TO DO !!!
  const finalTemplate =
  <Paper elevation={8} sx={{ p: 1, mt: 2 }}>
    <Stack direction="row" justifyContent="flex-end">
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

        <Stack direction="row" justifyContent="flex-end">
          <Button
            type="submit"
            variant="contained"
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
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneReg