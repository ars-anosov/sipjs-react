import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import {
  Box,
  Typography,
  Divider,
  IconButton,
  Stack,
} from '@mui/material'

import IconCall from '@mui/icons-material/Call';
import IconCallEnd from '@mui/icons-material/CallEnd';



function PhoneControl(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneControl hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props



  useEffect(() => {
    console.log('phoneControl MOUNT')
    return () => {
      console.log('phoneControl UNMOUNT')
    }
    // second parameter the useEffect hook MUST BE !!!
  }, [])



  function handleClkSubmitIn(event) {
    phoneControlActions.handleClkSubmitIn(phoneControlRdcr)
  }

  function handleClkReset(event) {
    phoneControlActions.handleClkReset(phoneControlRdcr.outgoingSession, phoneControlRdcr.incomingSession, phoneControlRdcr.callerUserNum)
  }


  const finalTemplate =
  <Box sx={{
    padding: 1,
    }}
  >
    <Typography variant='h6'>Телефон</Typography>
    { (phoneControlRdcr.incomeDisplay) ?
      <Stack direction="row" spacing={2} justifyContent="space-evenly">
        <IconButton onClick={handleClkSubmitIn}>
          <IconCall color='success' />
        </IconButton>
        <IconButton onClick={handleClkReset}>
          <IconCallEnd color='error' />
        </IconButton>
      </Stack>
    :
      <span></span>
    }
    { (phoneControlRdcr.outgoCallNow || phoneControlRdcr.incomeCallNow) ?
      <Stack direction="row" spacing={2} justifyContent="space-evenly">
        <IconButton onClick={handleClkReset}>
          <IconCallEnd color='error' />
        </IconButton>
      </Stack>
    :
      <span></span>
    }
    <Divider />
    <Typography variant='caption'>{phoneControlRdcr.phoneHeader}</Typography>
  </Box>

  return finalTemplate
}



PhoneControl.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneControl