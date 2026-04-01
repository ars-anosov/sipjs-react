import * as React from 'react';
import PropTypes from 'prop-types';

import {
  styled,

  Divider,
  Box,
  FormControl,
  FormHelperText,
  Button,
  Input,
  InputLabel,
  Paper,
  Typography,
  Stack,
  IconButton,
} from '@mui/material'

import IconLogin from '@mui/icons-material/Login'
import IconClose from '@mui/icons-material/Close'



const PaperSt = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  // maxWidth: '600px'
}))

const ButtonRegister = styled(Button)(({ theme }) => ({
  // backgroundColor: theme.palette.warning.main,
  // marginRight: theme.spacing(2),
  width: theme.spacing(15),
}))


// sip.js
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



  // sipjs --------------------------------------
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
  <PaperSt elevation={8}>
    <Stack direction="row" spacing={2} justifyContent="flex-end">
      <IconButton onClick={handleClose}>
        <IconClose color='error' />
      </IconButton>
    </Stack>

    <Box onSubmit={handleRegister}
      component="form"
      autoComplete="off"
    >
      <Stack direction="row" spacing={2} justifyContent="flex-start">
      <FormControl margin="normal" required fullWidth >
        <InputLabel htmlFor="callerUserNum">Number</InputLabel>
        <Input onChange={phoneControlActions.handleChangeData}
          id="callerUserNum"
          aria-describedby="callerUserNum-helper-text"
          variant="outlined"
          value={phoneControlRdcr.callerUserNum}
        />
        {/* <FormHelperText id="callerUserNum-helper-tex">Вн.номер</FormHelperText> */}
      </FormControl>
      <FormControl margin="normal" required fullWidth >
        <InputLabel htmlFor="regUserPass">Secret</InputLabel>
        <Input onChange={phoneControlActions.handleChangeData}
          id="regUserPass"
          type="password"
          aria-describedby="regUserPass-helper-text"
          variant="outlined"
          value={phoneControlRdcr.regUserPass}
        />
        {/* <FormHelperText id="regUserPass-helper-tex">Пароль</FormHelperText> */}
      </FormControl>
      </Stack>

      <br />

      <Stack direction="row" spacing={2} justifyContent="flex-start">
      <FormControl margin="normal" required fullWidth >
        <InputLabel htmlFor="uriHost">Host</InputLabel>
        <Input onChange={phoneControlActions.handleChangeData}
          id="uriHost"
          aria-describedby="uriHost-helper-text"
          variant="outlined"
          value={phoneControlRdcr.uriHost}
        />
        {/* <FormHelperText id="uriHost-helper-tex">Вн.номер</FormHelperText> */}
      </FormControl>
      <FormControl margin="normal" required fullWidth >
        <InputLabel htmlFor="wssPort">Port</InputLabel>
        <Input onChange={phoneControlActions.handleChangeData}
          id="wssPort"
          aria-describedby="wssPort-helper-text"
          variant="outlined"
          value={phoneControlRdcr.wssPort}
        />
        {/* <FormHelperText id="wssPort-helper-tex">Пароль</FormHelperText> */}
      </FormControl>
      </Stack>

      <br />

      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <ButtonRegister
          type="submit"
          variant="contained"
          startIcon={<IconLogin />}
        >
          Register
        </ButtonRegister>
      </Stack>
    </Box>

  </PaperSt>

  return finalTemplate
}



PhoneReg.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneReg