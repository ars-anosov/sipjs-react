import * as React from 'react';
import PropTypes from 'prop-types';

import {
  styled,

  AppBar,
  Box,
  Toolbar,
  Typography,
  IconButton,
  Menu,
} from '@mui/material'

import MenuIcon from '@mui/icons-material/Menu';
import IconDialerSip from '@mui/icons-material/DialerSip';
import IconPhoneDisabled from '@mui/icons-material/PhoneDisabled';
import IconSettingsPhone from '@mui/icons-material/SettingsPhone';
import IconRingVolume from '@mui/icons-material/RingVolume';
import IconPhoneEnabled from '@mui/icons-material/PhoneEnabled';


import PhoneControl                   from './PhoneControl.jsx'


function MenuAppBar(props) {
  if (process.env.NODE_ENV === 'development') console.log('MenuAppBar hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props

  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  let icoImgComponent = <IconDialerSip />
  let icoBtnColor = 'inherit'
  let icoBtnBgColor = 'inherit'
  switch (phoneControlRdcr.status) {
    case 'Request':
      icoImgComponent = <IconSettingsPhone />
      icoBtnColor = 'warning'
      icoBtnBgColor = 'rgba(255, 165, 0, 0.2)'
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
    icoBtnColor = 'warning'
  }
  if (phoneControlRdcr.incomeCallNow) {
    icoImgComponent = <IconPhoneEnabled />
    icoBtnColor = 'success'
    icoBtnBgColor = 'rgba(255, 255, 255, 0.9)'
  }
    if (phoneControlRdcr.outgoCallNow) {
    icoImgComponent = <IconPhoneEnabled />
    icoBtnColor = 'success'
    icoBtnBgColor = 'rgba(255, 255, 255, 0.9)'
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WebRTC
          </Typography>

          <div>
            <Typography variant="caption" component="span">
              {phoneControlRdcr.phoneHeader}
            </Typography>
            <IconButton
              size="medium"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color={icoBtnColor}
              sx={{ ml: 1, backgroundColor: icoBtnBgColor }}
            >
              {icoImgComponent}
            </IconButton>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <PhoneControl
                phoneControlRdcr      = {phoneControlRdcr}
                phoneControlActions   = {phoneControlActions}
              />
            </Menu>
          </div>

        </Toolbar>
      </AppBar>
    </Box>
  );
}

MenuAppBar.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default MenuAppBar