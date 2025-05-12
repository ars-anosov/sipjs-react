import * as React from 'react';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Menu from '@mui/material/Menu';

import IconDialerSip from '@mui/icons-material/DialerSip';
import IconPhoneDisabled from '@mui/icons-material/PhoneDisabled';
import IconSettingsPhone from '@mui/icons-material/SettingsPhone';

import PhoneControl                   from './PhoneControl.jsx'

export default function MenuAppBar(props) {
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

  let phoneControlIcoComponent = ''
  switch (phoneControlRdcr.status) {
    case 'Request':
      phoneControlIcoComponent = <IconSettingsPhone color='warning' />
      break
    case 'Success':
      phoneControlIcoComponent = <IconDialerSip color='inherit' />
      break
    case 'Error':
      phoneControlIcoComponent = <IconPhoneDisabled color='error' />
      break
    case 'Reconnect':
      phoneControlIcoComponent = <IconSettingsPhone color='warning' />
      break
    default:
      phoneControlIcoComponent = <IconDialerSip />
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
            {phoneControlRdcr.phoneHeader}
            <IconButton
              size="large"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleMenu}
              color="inherit"
            >
              {phoneControlIcoComponent}
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