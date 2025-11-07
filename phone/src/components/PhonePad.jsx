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
  Grid,
  IconButton
} from '@mui/material'

import IconLogin from '@mui/icons-material/Login';
import IconCall from '@mui/icons-material/Call';
import IconCallEnd from '@mui/icons-material/CallEnd';
import BackspaceIcon from "@mui/icons-material/Backspace";



const PaperSt = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  // maxWidth: '600px'
}))

const ButtonCall = styled(Button)(({ theme }) => ({
  // backgroundColor: theme.palette.success.main,
  // marginRight: theme.spacing(2),
  width: theme.spacing(15),
}))
const ButtonEnd = styled(Button)(({ theme }) => ({
  // backgroundColor: theme.palette.primary.main,
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



  const handleClkSubmit = (event) => {
    event.preventDefault()  // Не перезагружать после form Submit

    if (phoneControlRdcr.incomeDisplay) {
      // Входящий
      phoneControlActions.handleClkSubmitIn(phoneControlRdcr)
    }
    else {
      // Исходящий
      phoneControlActions.handleClkSubmitOut(phoneControlRdcr)
    }

  }

  const handleClkReset = (event) => {
    phoneControlActions.handleClkReset(phoneControlRdcr.outgoingSession, phoneControlRdcr.incomingSession, callerUserNum)
  }

  const digits = [
    ["1", ""],
    ["2", "ABC"],
    ["3", "DEF"],
    ["4", "GHI"],
    ["5", "JKL"],
    ["6", "MNO"],
    ["7", "PQRS"],
    ["8", "TUV"],
    ["9", "WXYZ"],
    ["*", ""],
    ["0", "+"],
    ["#", ""],
  ]

  const [input, setInput] = React.useState("");

  const handleDigitClick = (digit) => {
    setInput((prev) => prev + digit);
  }

  const handleBackspace = () => {
    setInput((prev) => prev.slice(0, -1));
  }



  const finalTemplate =
  <PaperSt elevation={8}>
    <Typography variant="h6">{phoneControlRdcr.phoneHeader}</Typography>
    <Divider />

    <Box onSubmit={handleClkSubmit} onReset={handleClkReset}
      component="form"
      autoComplete="off"
    >
      <FormControl margin="normal" required fullWidth >
        <InputLabel htmlFor="calleePhoneNum">Номер</InputLabel>
        <Input onChange={phoneControlActions.handleChangeData}
          id="calleePhoneNum"
          aria-describedby="calleePhoneNum-helper-text"
          value={phoneControlRdcr.calleePhoneNum}
        />
      </FormControl>
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <ButtonCall
          color="success"
          type="submit"
          variant="contained"
          startIcon={<IconCall />}
          disabled={phoneControlRdcr.outgoCallNow || phoneControlRdcr.incomeCallNow}
        >
          { phoneControlRdcr.incomeDisplay ? 'Answer' : 'Call' }
        </ButtonCall>
        <ButtonEnd
          color="error"
          type="reset"
          variant="contained"
          startIcon={<IconCallEnd />}
        >
          End
        </ButtonEnd>
      </Stack>
    </Box>

    <Box sx={{ width: 260, margin: "auto", padding: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h5">{input || " "}</Typography>
        <IconButton onClick={handleBackspace} disabled={!input}>
          <BackspaceIcon />
        </IconButton>
      </Box>

      <Grid container spacing={2}>
        {digits.map(([digit, letters], index) => (
          <Grid item xs={4} key={index}>
            <Button
              variant="contained"
              onClick={() => handleDigitClick(digit)}
              sx={{
                width: "100%",
                height: 64,
                fontSize: 20,
                flexDirection: "column",
              }}
            >
              {digit}
              <Box sx={{ fontSize: 10, opacity: 0.7 }}>{letters}</Box>
            </Button>
          </Grid>
        ))}
      </Grid>
    </Box>

  </PaperSt>

  return finalTemplate
}



PhonePad.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhonePad