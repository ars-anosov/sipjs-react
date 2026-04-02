import * as React from 'react';
import PropTypes from 'prop-types';

import {
  TextField,
  Box,
  Button,
  Paper,
  Stack,
  IconButton,
} from '@mui/material'

import {
  Login as IconLogin,
  Close as IconClose,
} from '@mui/icons-material'

// https://github.com/onsip/SIP.js/blob/main/docs/api.md
import {
  UserAgent,
} from "sip.js";



function PhoneReg(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneReg hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props



  React.useEffect(() => {
    console.log('PhoneReg MOUNT')
    // Рисую историю звонков из LocalStorage
    phoneControlActions.CallsArrUpdate()

    return () => {
      console.log('PhoneReg UNMOUNT')
    }
  }, [])



  // (+) sipjs --------------------------------------
  let uri = undefined
  if (phoneControlRdcr.callerUserNum) {
    uri = UserAgent.makeURI("sip:"+phoneControlRdcr.callerUserNum+"@"+phoneControlRdcr.uriHost)
    if (!uri) {
      // throw new Error("Failed to create URI")
      console.log("Failed to create UserAgent URI for:","sip:"+phoneControlRdcr.callerUserNum+"@"+phoneControlRdcr.uriHost)
    }
  }

  const userAgentOptions = {
    uri,
    authorizationUsername: phoneControlRdcr.callerUserNum,
    authorizationPassword: phoneControlRdcr.regUserPass,
    displayName: phoneControlRdcr.callerUserNum,
    hackIpInContact: true,
    transportOptions: {
      server: "wss://"+phoneControlRdcr.uriHost+":"+phoneControlRdcr.wssPort
    },
    logLevel: process.env.NODE_ENV === 'production' ? "error" : "debug"
  }

  const constrainsDefault = {
    audio: true,
    video: false,
  }

  const sessionOptions = {
    sessionDescriptionHandlerOptions: {
      constraints: constrainsDefault,
    }
  }
  // (-) sipjs --------------------------------------



  const handleClose = function() {
    phoneControlActions.handleChangeData({'target':{'id':'displayReg', 'value':false}})
  }

  const handleRegister = (event) => {
    event.preventDefault()
    if (userAgentOptions.authorizationUsername) {
      phoneControlActions.handleClkRegister(userAgentOptions, sessionOptions, phoneControlRdcr)
    }
  }



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
            value={phoneControlRdcr.callerUserNum}
            onChange={phoneControlActions.handleChangeData}
          />
          <TextField
            fullWidth
            required
            id="regUserPass"
            label="Secret"
            type="password"
            variant="outlined"
            value={phoneControlRdcr.regUserPass}
            onChange={phoneControlActions.handleChangeData}
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
            value={phoneControlRdcr.uriHost}
            onChange={phoneControlActions.handleChangeData}
          />
          <TextField
            fullWidth
            required
            id="wssPort"
            label="Port"
            variant="outlined"
            value={phoneControlRdcr.wssPort}
            onChange={phoneControlActions.handleChangeData}
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
  </Paper>

  return finalTemplate
}



PhoneReg.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneReg