import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  Box,
  Stack,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Popover,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
} from '@mui/material'

import MenuIcon         from '@mui/icons-material/Menu';
import PhoneIco         from './PhoneIco'
// import AdIco            from './AdIco'
import PhonePad         from './PhonePad'



const MENU_ITEMS = [
  { key: 'displayReg', primary: 'Карточка регистрации', secondary: 'PhoneReg.jsx' },
  { key: 'displayPad', primary: 'Телефон с кнопками', secondary: 'PhonePad.jsx' },
  { key: 'displayHistory', primary: 'История звонков', secondary: 'PhoneHistory.jsx' },
  { key: 'displayChat', primary: 'SIP Сообщения', secondary: 'PhoneChat.jsx' },
  { key: 'displayControl', primary: 'Кругляш состояния', secondary: 'PhoneIco.jsx' },
]

function MenuAppBar(props) {
  const { phoneControlRdcr, phoneControlActions, authControlRdcr } = props

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('MenuAppBar MOUNT')

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('MenuAppBar UNMOUNT')
    }
  }, [])

  const [anchorEl_phoneControl, setAnchorEl_phoneControl] = useState(null)
  const [anchorEl_mainMenu, setAnchorEl_mainMenu] = useState(null)
  const handleOpenMenu = (event) => setAnchorEl_mainMenu(event.currentTarget)
  const handleCloseMenu = () => setAnchorEl_mainMenu(null)

  const toggleDisplay = (keyName) => {
    phoneControlActions.handleChangeStore(keyName, !phoneControlRdcr[keyName])
    handleCloseMenu()
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
            {MENU_ITEMS.map((item) => {
              const isChecked = !!phoneControlRdcr[item.key];
              const labelId = `checkbox-list-label-${item.key}`;

              return (
                <MenuItem
                  key={item.key}
                  onClick={() => toggleDisplay(item.key)}
                  sx={{ minWidth: 250 }}
                >
                  <ListItemIcon>
                    <Checkbox
                      edge="start"
                      checked={isChecked}
                      tabIndex={-1}
                      disableRipple
                      slotProps={{ input: { 'aria-labelledby': labelId } }}
                    />
                  </ListItemIcon>
                  <ListItemText 
                    id={labelId}
                    primary={item.primary} 
                    secondary={item.secondary} 
                  />
                </MenuItem>
              );
            })}
          </Menu>


          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            WebRTC
          </Typography>

          {phoneControlRdcr.displayControl && (
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ cursor: 'pointer', alignItems: 'center' }}
              onClick={(e) => setAnchorEl_phoneControl(e.currentTarget)}
            >
              <Typography variant="caption" sx={{ mr: 1 }}>
                {phoneControlRdcr.icoHeader}
              </Typography>
              <PhoneIco phoneControlRdcr={phoneControlRdcr} />
            </Stack>
          )}

          {/* {authControlRdcr && (
            <AdIco authControlRdcr={authControlRdcr} />
          )} */}

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
  phoneControlActions: PropTypes.object.isRequired,
  authControlRdcr: PropTypes.object,
}

export default MenuAppBar
