import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Popover,
  Menu,
  MenuItem,
  ListItemText,
} from '@mui/material'

import MenuIcon         from '@mui/icons-material/Menu';
import PhoneControlIco  from './PhoneControlIco.jsx'
import PhonePad         from './PhonePad.jsx'



function MenuAppBar(props) {
  const { phoneControlRdcr, phoneControlActions } = props

  const [anchorEl_phoneControl, setAnchorEl_phoneControl] = useState(null)
  const [anchorEl_mainMenu, setAnchorEl_mainMenu] = useState(null)
  const handleOpenMenu = (event) => setAnchorEl_mainMenu(event.currentTarget)
  const handleCloseMenu = () => setAnchorEl_mainMenu(null)

  const toggleDisplay = (keyName) => {
    phoneControlActions.handleChangeStore(keyName, !phoneControlRdcr[keyName])
    // handleCloseMenu()
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
            onClick={handleOpenMenu}
          >
            <MenuIcon />
          </IconButton>

          <Menu
            anchorEl={anchorEl_mainMenu}
            open={Boolean(anchorEl_mainMenu)}
            onClose={handleCloseMenu}
          >
            <MenuItem
              onClick={() => toggleDisplay('displayReg')}
              selected={phoneControlRdcr.displayReg}
              sx={{ 
                opacity: phoneControlRdcr.displayReg ? 1 : 0.5,
              }}
            >
              <ListItemText primary="Карточка регистрации" secondary="PhoneReg.jsx" />
            </MenuItem>
            <MenuItem
              onClick={() => toggleDisplay('displayPad')}
              selected={phoneControlRdcr.displayPad}
              sx={{ 
                opacity: phoneControlRdcr.displayPad ? 1 : 0.5,
              }}
            >
              <ListItemText primary="Телефон с кнопками" secondary="PhonePad.jsx" />
            </MenuItem>
            <MenuItem
              onClick={() => toggleDisplay('displayHistory')}
              selected={phoneControlRdcr.displayHistory}
              sx={{ 
                opacity: phoneControlRdcr.displayHistory ? 1 : 0.5,
              }}
            >
              <ListItemText primary="История звонков" secondary="PhoneHistory.jsx" />
            </MenuItem>
            <MenuItem
              onClick={() => toggleDisplay('displayControl')}
              selected={phoneControlRdcr.displayControl}
              sx={{ 
                opacity: phoneControlRdcr.displayControl ? 1 : 0.5,
              }}
            >
              <ListItemText primary="Кругляш состояния" secondary="PhoneControl.jsx" />
            </MenuItem>
          </Menu>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WebRTC
          </Typography>

          <Box sx={{ flexGrow: 1, textAlign: 'right' }}>
            {phoneControlRdcr.displayControl && (
              <div 
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }} 
                onClick={(e) => setAnchorEl_phoneControl(e.currentTarget)}
              >
                <Typography variant="caption" sx={{ mr: 1 }}>
                  {phoneControlRdcr.controlHeader}
                </Typography>
                <PhoneControlIco
                  phoneControlRdcr={phoneControlRdcr}
                  phoneControlActions={phoneControlActions}
                />
              </div>
            )}
          </Box>
        </Toolbar>
      </AppBar>

      <Popover
        id='phoneControl_id'
        open={Boolean(anchorEl_phoneControl)}
        anchorEl={anchorEl_phoneControl}
        onClose={() => setAnchorEl_phoneControl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >

        <Box
          sx={{ p: 1 }}
        >
          <Typography variant='body2'>{"wss://"+phoneControlRdcr.uriHost+":"+phoneControlRdcr.wssPort}</Typography>
          <PhonePad
            phoneControlRdcr={phoneControlRdcr}
            phoneControlActions={phoneControlActions}
            showInput={false}
          />
        </Box>

      </Popover>
    </Box>
  );
}

MenuAppBar.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
  phoneControlActions: PropTypes.object.isRequired
}

export default MenuAppBar
