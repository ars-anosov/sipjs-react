import * as React from 'react';
import PropTypes from 'prop-types';

import {
  Typography,
  IconButton,
} from '@mui/material'

import IconDialerSip from '@mui/icons-material/DialerSip';
import IconPhoneDisabled from '@mui/icons-material/PhoneDisabled';
import IconSettingsPhone from '@mui/icons-material/SettingsPhone';
import IconRingVolume from '@mui/icons-material/RingVolume';
import IconPhoneEnabled from '@mui/icons-material/PhoneEnabled';



function PhoneIcoBtn(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneIcoBtn hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props

  let icoImgComponent = <IconDialerSip />
  let icoBtnColor = 'inherit'
  let icoBtnBgColor = 'inherit'
  switch (phoneControlRdcr.status) {
    case 'Request':
      icoImgComponent = <IconSettingsPhone />
      icoBtnColor = 'inherit'
      icoBtnBgColor = 'inherit'
      break
    case 'Success':
      icoImgComponent = <IconDialerSip />
      icoBtnColor = 'inherit'
      icoBtnBgColor = 'inherit'
      break
    case 'Error':
      icoImgComponent = <IconPhoneDisabled />
      icoBtnColor = 'error'
      icoBtnBgColor = 'rgba(255, 0, 0, 0.2)'
      break
    case 'Reconnect':
      icoImgComponent = <IconSettingsPhone />
      icoBtnColor = 'warning'
      icoBtnBgColor = 'rgba(255, 255, 255, 0.2)'
      break
  }
  if (phoneControlRdcr.incomeDisplay) {
    icoImgComponent = <IconRingVolume />
    icoBtnColor = 'error'
    icoBtnBgColor = 'rgba(255, 255, 255, 0.9)'
  }
  if (phoneControlRdcr.incomeCallNow) {
    icoImgComponent = <IconPhoneEnabled />
    icoBtnColor = 'success'
    icoBtnBgColor = 'rgba(0, 255, 0, 0.7)'
  }
    if (phoneControlRdcr.outgoCallNow) {
    icoImgComponent = <IconPhoneEnabled />
    icoBtnColor = 'success'
    icoBtnBgColor = 'rgba(0, 255, 0, 0.7)'
  }

  return (
    <div>
      <Typography variant="caption" component="span">
        {phoneControlRdcr.phoneHeader}
      </Typography>
      <IconButton
        aria-label="account of current user"
        aria-controls="menu-appbar"
        aria-haspopup="true"
        color={icoBtnColor}
        sx={{ ml: 1, backgroundColor: icoBtnBgColor }}
      >
        {icoImgComponent}
      </IconButton>
    </div>
  );
}

PhoneIcoBtn.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneIcoBtn