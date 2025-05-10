import React, { useState, useEffect} from 'react';
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

  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material'

import IconLogin from '@mui/icons-material/Login';
import IconCall from '@mui/icons-material/Call';
import IconCallEnd from '@mui/icons-material/CallEnd';


const PaperSt = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  maxWidth: '600px'
}))

const ButtonCall = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.success.main,
  // marginRight: theme.spacing(2),
  width: theme.spacing(14),
}))
const ButtonEnd = styled(Button)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  // marginRight: theme.spacing(2),
  width: theme.spacing(14),
}))
const ButtonRegister = styled(Button)(({ theme }) => ({
  // backgroundColor: theme.palette.warning.main,
  // marginRight: theme.spacing(2),
}))


// sip.js
// https://github.com/onsip/SIP.js/blob/main/docs/api.md
import {
  UserAgent,
} from "sip.js";


const dateStrFromTimestamp = function(intStamp, format='ISO', tzone='+03:00') {
  let dateStr = ''

  if (intStamp) {
    const dateObj = new Date(intStamp)
    const dateArr = new Date( dateObj.getTime() - dateObj.getTimezoneOffset() * 60000 ).toISOString().split('T')
    // toISOString (https://ru.wikipedia.org/wiki/ISO_8601) -> "2011-10-05T14:48:00.000Z"
    // Часовой пояс всегда равен UTC, что обозначено суффиксом "Z"

    switch (format) {
      case 'ISO':
        dateStr = dateArr[0]+'T'+dateArr[1].substring(0, 8)+tzone
        break
      case 'date_dig_only':
        dateStr = dateArr[0].replace(/\-/g, '')
        break

      case 'time_only':
        dateStr = dateArr[1].substring(0, 8)
        break

      case 'mysql':
        dateStr = dateArr[0]+' '+dateArr[1].substring(0, 8)
        break

      default:
        dateStr = dateArr[0]+' '+dateArr[1].substring(0, 8)
        break
    }
  }

  return dateStr
}



function PhoneWin(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneWin hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props

  const callerUserNum     = phoneControlRdcr.callerUserNum



  useEffect(() => {
    console.log('PhoneWin MOUNT')
    // Рисую историю звонков из LocalStorage
    phoneControlActions.CallsArrUpdate()

    return () => {
      console.log('PhoneWin UNMOUNT')
    }
  }, [])



  // sipjs --------------------------------------
  let uri = undefined
  if (callerUserNum) {
    uri = UserAgent.makeURI("sip:"+callerUserNum+"@osips.pecom.local");
    if (!uri) {
      throw new Error("Failed to create URI");
    }
  }

  const userAgentOptions = {
    uri,
    authorizationUsername: callerUserNum,
    authorizationPassword: phoneControlRdcr.regUserPass,
    displayName: "WebRTC user "+callerUserNum,
    hackIpInContact: true,
    transportOptions: {
      server: "wss://osips.pecom.local:9443"
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


  const handleCallLogClk = (event) => {
    const textSplit = event.target.textContent.split(" ")
    phoneControlActions.handleChangeData({'target':{'id':'calleePhoneNum', 'value':textSplit[0]}})
  }


  const callComonentsArr = []
  for (const row of phoneControlRdcr.callsArr) {
    callComonentsArr.push(
      <TableRow
        key={row.start}
        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
      >
        <TableCell component="th" scope="row"><small>{dateStrFromTimestamp(row.start,'mysql')}</small></TableCell>
        <TableCell><span onClick={handleCallLogClk}>{row.uri}</span></TableCell>
        <TableCell align="right"><small>{row.flow + ' ' + row.status}</small></TableCell>
      </TableRow>
    )
  }


  const finalTemplate =
  <PaperSt elevation={8}>
    <Typography variant="h6">{phoneControlRdcr.phoneHeader}</Typography>
    <Divider />

    <br />

    {phoneControlRdcr.registerDisplay ?
    <Box onSubmit={handleClkRegister}
      component="form"
      autoComplete="off"
    >
      <Stack direction="row" spacing={2} justifyContent="flex-start">
      <FormControl margin="normal" required fullWidth >
        <InputLabel htmlFor="callerUserNum">User num</InputLabel>
        <Input onChange={phoneControlActions.handleChangeData}
          id="callerUserNum"
          aria-describedby="callerUserNum-helper-text"
          variant="outlined"
          value={callerUserNum}
        />
        <FormHelperText id="callerUserNum-helper-tex">Вн.номер</FormHelperText>
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
        <FormHelperText id="regUserPass-helper-tex">Пароль</FormHelperText>
      </FormControl>
      </Stack>

      <br />

      <Stack direction="row" spacing={2} justifyContent="flex-start">
        <ButtonRegister
          type="submit"
          variant="contained"
          startIcon={<IconLogin />}
        >
          Register
        </ButtonRegister>
      </Stack>
    </Box>
    :
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
          type="submit"
          variant="contained"
          startIcon={<IconCall />}
          disabled={phoneControlRdcr.outgoCallNow || phoneControlRdcr.incomeCallNow}
        >
          { phoneControlRdcr.incomeDisplay ? 'Answer' : 'Call' }
        </ButtonCall>
        <ButtonEnd
          type="reset"
          variant="contained"
          startIcon={<IconCallEnd />}
        >
          End
        </ButtonEnd>
      </Stack>

      <br />

      <TableContainer >
        <Table size="small" aria-label="История звонков">
          <TableHead>
            <TableRow>
              <TableCell>Время</TableCell>
              <TableCell>Абонент</TableCell>
              <TableCell align="right">Статус</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {callComonentsArr}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
    }


  </PaperSt>

  return finalTemplate
}



PhoneWin.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneWin