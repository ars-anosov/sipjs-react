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
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Divider,
} from '@mui/material'

import { useTheme } from '@mui/material/styles'

import MenuIcon         from '@mui/icons-material/Menu'
import ChevronLeftIcon  from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

import PhoneIco         from './PhoneIco'
import AuthIco          from './AuthIco'
import PhonePad         from './PhonePad'



const MENU_ITEMS_PHONE = [
  { key: 'displayReg', primary: 'SIP Регистрация', secondary: 'PhoneReg.jsx' },
  { key: 'displayPad', primary: 'SIP Телефон', secondary: 'PhonePad.jsx' },
  { key: 'displayHistory', primary: 'SIP Звонки', secondary: 'PhoneHistory.jsx' },
  { key: 'displayChat', primary: 'SIP Сообщения', secondary: 'PhoneChat.jsx' },
  { key: 'displayControl', primary: 'SIP Кругляш', secondary: 'PhoneIco.jsx' },
]

const MENU_ITEMS_AUTH = [
  { key: 'displayAd', primary: 'AD Авторизация', secondary: 'AuthAd.jsx' },
  { key: 'displayControl', primary: 'AD Кругляш', secondary: 'AuthIco.jsx' },
]

const MENU_ITEMS_LK = [
  { key: 'displayLkToken', primary: 'LiveKit Приглашение', secondary: 'LkToken.jsx' },
]

function MenuAppBar(props) {
  const { phoneControlRdcr, phoneControlActions, authControlRdcr, authControlActions, lkControlRdcr, lkControlActions } = props

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('MenuAppBar MOUNT')

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('MenuAppBar UNMOUNT')
    }
  }, [])

  const theme = useTheme()

  const rawToolbarHeight = theme?.mixins?.toolbar?.maxHeight
  const toolbarHeight = typeof rawToolbarHeight === 'number'
    ? rawToolbarHeight
    : (rawToolbarHeight ? parseInt(String(rawToolbarHeight).replace('px', ''), 10) : 64)

  const [anchorEl_phoneControl, setAnchorEl_phoneControl] = useState(null)
  const [anchorEl_adControl, setAnchorEl_adControl] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleOpenMenu = () => setDrawerOpen(true)
  const handleCloseMenu = () => setDrawerOpen(false)

  const toggleDisplayPhone = (keyName) => {
    phoneControlActions.handleChangeStore(keyName, !phoneControlRdcr[keyName])
  }
  const toggleDisplayAuth = (keyName) => {
    authControlActions.handleChangeStore(keyName, !authControlRdcr[keyName])
  }
  const toggleDisplayLk = (keyName) => {
    lkControlActions.handleChangeStore(keyName, !lkControlRdcr[keyName])
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

          <Drawer
            anchor="left"
            variant="persistent"
            open={drawerOpen}
            onClose={handleCloseMenu}
          >
            <Stack direction="row" spacing={2}
              sx={{ p: 1, height: toolbarHeight }}
            >
              <Box component="img" src="img/Vite.png" sx={{ height: '100%', width: 'auto' }} alt="Vite" />
              <Box component="img" src="img/React.png" sx={{ height: '100%', width: 'auto' }} alt="React" />
              <Box sx={{ flexGrow: 1 }} />
              <IconButton onClick={handleCloseMenu} >
                <ChevronLeftIcon color='primary' sx={{ height: '100%', width: 'auto' }} />
              </IconButton>
            </Stack>
            
            <Divider />

            <List>
              {MENU_ITEMS_PHONE.map((item) => {
                const isChecked = !!phoneControlRdcr[item.key];
                const labelId = `checkbox-list-label-${item.key}`;
                return (
                  <ListItemButton
                    key={item.key}
                    onClick={() => toggleDisplayPhone(item.key)}
                    sx={{ alignItems: 'flex-start' }}
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
                  </ListItemButton>
                )
              })}
            </List>

            <Divider />

            <List>
              {MENU_ITEMS_AUTH.map((item) => {
                const isChecked = !!authControlRdcr[item.key];
                const labelId = `checkbox-list-label-${item.key}`;
                return (
                  <ListItemButton
                    key={item.key}
                    onClick={() => toggleDisplayAuth(item.key)}
                    sx={{ alignItems: 'flex-start' }}
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
                  </ListItemButton>
                )
              })}
            </List>

            <Divider />

            <List>
              {MENU_ITEMS_LK.map((item) => {
                const isChecked = !!lkControlRdcr[item.key];
                const labelId = `checkbox-list-label-${item.key}`;
                return (
                  <ListItemButton
                    key={item.key}
                    onClick={() => toggleDisplayLk(item.key)}
                    sx={{ alignItems: 'flex-start' }}
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
                  </ListItemButton>
                )
              })}
            </List>
          </Drawer>



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
              <Typography variant="caption" sx={{ pl: 1 }}>
                {phoneControlRdcr.icoHeader}
              </Typography>
              <PhoneIco phoneControlRdcr={phoneControlRdcr} />
            </Stack>
          )}

          {authControlRdcr.displayControl && (
            <Stack 
              direction="row" 
              spacing={1} 
              sx={{ cursor: 'pointer', alignItems: 'center' }}
              onClick={(e) => setAnchorEl_adControl(e.currentTarget)}
            >
              <Typography variant="caption" sx={{ pl: 1 }}>
                {authControlRdcr?.responseData?.ad_login}
              </Typography>
              <AuthIco authControlRdcr={authControlRdcr} />
            </Stack>
          )}

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
          <Divider />
          <PhonePad
            phoneControlRdcr={phoneControlRdcr}
            phoneControlActions={phoneControlActions}
            showInput={false}
          />
        </Box>
      </Popover>

      <Popover
        id='adControl_id'
        open={Boolean(anchorEl_adControl)}
        anchorEl={anchorEl_adControl}
        onClose={() => setAnchorEl_adControl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Box
          sx={{ p: 1 }}
        >
          <Typography variant='body2'>{authControlRdcr.uriAdAuth}</Typography>
          <Divider />
          <Typography variant='body2' component="pre">
            {"\n"}cn{"\t"}{"\t"}{"\t"}{authControlRdcr?.responseData?.ad_cn}
            {"\n"}title:{"\t"}{"\t"}{authControlRdcr?.responseData?.ad_title}
            {"\n"}department:{"\t"}{authControlRdcr?.responseData?.ad_department}
            {"\n"}
            {"\n"}SIP num:{"\t"}{authControlRdcr?.responseData?.sip_username}
          </Typography>
        </Box>
      </Popover>

    </Box>
  )
}

MenuAppBar.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
  phoneControlActions: PropTypes.object.isRequired,
  authControlRdcr: PropTypes.object,
  authControlActions: PropTypes.object,
  lkControlRdcr: PropTypes.object,
  lkControlActions: PropTypes.object,
}

export default MenuAppBar
