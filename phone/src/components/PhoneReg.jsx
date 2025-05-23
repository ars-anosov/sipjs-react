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
} from '@mui/material'

import IconLogin from '@mui/icons-material/Login';



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



function PhonePad(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhonePad hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props

  const callerUserNum     = phoneControlRdcr.callerUserNum



  React.useEffect(() => {
    console.log('PhonePad MOUNT')
    // Рисую историю звонков из LocalStorage
    phoneControlActions.CallsArrUpdate()

    return () => {
      console.log('PhonePad UNMOUNT')
    }
  }, [])



  // sipjs --------------------------------------
  let uri = undefined
  if (callerUserNum) {
    uri = UserAgent.makeURI("sip:"+callerUserNum+"@"+window.localStorage.getItem('uas_uri'))
    if (!uri) {
      // throw new Error("Failed to create URI")
      console.log("Failed to create UserAgent URI for:","sip:"+callerUserNum+"@"+window.localStorage.getItem('uas_uri'))
    }
  }

  const userAgentOptions = {
    uri,
    authorizationUsername: callerUserNum,
    authorizationPassword: phoneControlRdcr.regUserPass,
    displayName: "WebRTC user "+callerUserNum,
    hackIpInContact: true,
    transportOptions: {
      server: "wss://"+window.localStorage.getItem('uas_uri')+":"+window.localStorage.getItem('wss_port')
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



  const handleClkRegister = (event) => {
    event.preventDefault()  // Не перезагружать после form Submit

    if (userAgentOptions.authorizationUsername) {
      phoneControlActions.handleClkRegister(userAgentOptions, sessionOptions)
    }
  }



  const finalTemplate =
  <PaperSt elevation={8}>
    <Typography variant="h6">{phoneControlRdcr.phoneHeader}</Typography>
    <Divider />
    <br />
    <Box onSubmit={handleClkRegister}
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
          value={callerUserNum}
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



PhonePad.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhonePad