import * as React from 'react';
import PropTypes from 'prop-types';

import {
  styled,

  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Popover
} from '@mui/material'

import MenuIcon from '@mui/icons-material/Menu';

import PhoneControlIco                from './PhoneControlIco.jsx'
import PhoneControl                   from './PhoneControl.jsx'



const DivStRight = styled('div')(({ theme }) => ({
  flexGrow: 1,
  textAlign: 'right'
}))



function MenuAppBar(props) {
  if (process.env.NODE_ENV === 'development') console.log('MenuAppBar hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props

  React.useEffect(() => {
    console.log('MenuAppBar MOUNT')
    return () => {
      console.log('MenuAppBar UNMOUNT')
    }
    // second parameter the useEffect hook MUST BE !!!
  }, [])


  const [anchorEl_phoneControl, setAnchorEl_phoneControl] = React.useState(null)

  function handleClickAnchorEl(event) {
    if ( event.currentTarget.getAttribute('popover_flag') === 'phoneControl_id' )  { setAnchorEl_phoneControl(event.currentTarget)  }
  }

  function handleCloseAnchorEl(event) {
    setAnchorEl_phoneControl(null)
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

          <DivStRight>
            {phoneControlRdcr.displayIco ?
              <div popover_flag="phoneControl_id" onClick={handleClickAnchorEl}>
                <Typography variant="caption" component="span">
                  {phoneControlRdcr.phoneHeader}
                </Typography>
                <PhoneControlIco
                  phoneControlRdcr      = {phoneControlRdcr}
                  phoneControlActions   = {phoneControlActions}
                />
              </div>
            :
              <div></div>
            }
          </DivStRight>

        </Toolbar>
      </AppBar>



      <Popover
        id='phoneControl_id'
        open={Boolean(anchorEl_phoneControl)}
        anchorEl={anchorEl_phoneControl}
        onClose={handleCloseAnchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'center',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'center',
        }}
      >
        <PhoneControl
          phoneControlRdcr      = {phoneControlRdcr}
          phoneControlActions   = {phoneControlActions}
        />
      </Popover>

    </Box>
  );
}

MenuAppBar.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default MenuAppBar