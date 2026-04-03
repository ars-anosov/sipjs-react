import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  TextField,
  Box,
  Button,
  Paper,
  Typography,
  Grid,
  IconButton,
  InputAdornment
} from '@mui/material'

import {
  Backspace     as IconBackspace,
  Phone         as IconPhone, 
  PhoneInTalk   as IconPhoneRing,
  PhoneDisabled as IconHangup 
} from '@mui/icons-material'



function PhonePad(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhonePad hook')

  const {
    phoneControlRdcr, phoneControlActions,
    showInput
  } = props



  useEffect(() => {
    console.log('PhonePad MOUNT')
    phoneControlActions.CallsArrUpdate()

    return () => {
      console.log('PhonePad UNMOUNT')
    }
  }, [])



  const handleSubmit = (event) => {
    event.preventDefault()
    if (phoneControlRdcr.incomeDisplay) { // Входящий
      phoneControlActions.handleClkSubmitIn(phoneControlRdcr)
    }
    else { // Исходящий
      phoneControlActions.handleChangeStore('calleePhoneNum', calleeTxt)
      phoneControlActions.handleClkSubmitOut(calleeTxt, phoneControlRdcr)
    }
  }

  const handleReset = () => {
    setCalleeTxt('')
    phoneControlActions.handleClkReset(phoneControlRdcr.outgoingSession, phoneControlRdcr.incomingSession, phoneControlRdcr.callerUserNum, phoneControlRdcr)
  }

  const [calleeTxt, setCalleeTxt] = useState("")
  const handleInput = (event) => {
    setCalleeTxt(event.target.value)
  }
  const handleKey = (digit) => {
    setCalleeTxt((prev) => prev + digit)
  }
  const handleBackspace = () => {
    setCalleeTxt((prev) => prev.slice(0, -1))
  }

  const keys = [
    ['1', ''],
    ['2', 'abc'],
    ['3', 'def'],
    ['4', 'ghi'],
    ['5', 'jkl'],
    ['6', 'mno'],
    ['7', 'pqrs'],
    ['8', 'tuv'],
    ['9', 'wxyz'],
    ['*', ''],
    ['0', '+'],
    ['#', '']
  ]

  const finalTemplate =
  <Paper elevation={8} sx={{ maxWidth: 300, mx: 'auto', p: 2, mt: 2 }}>
    <Typography variant="h6" sx={{ mb: 2 }}>
      {phoneControlRdcr.phoneHeader}
    </Typography>

    <Box component="form" onSubmit={handleSubmit} onReset={handleReset}>
      {/* Строчка ввода номера */}
      {showInput && (
      <TextField
        fullWidth
        // label="98..."
        variant="standard"
        value={calleeTxt}
        onChange={handleInput}
        slotProps={{
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={handleBackspace} size="small">
                  <IconBackspace />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{ mb: 2 }}
      />
      )}

      {/* Кнопки Вызов / Сброс */}
      <Grid container spacing={2} justifyContent="center" sx={{ mb: 2 }}>
        <Grid size={6} textAlign="center">
          {phoneControlRdcr.incomeDisplay ? (
            <Button
              type="submit"
              variant="contained"
              color="success"
              sx={{ 
                borderRadius: '50%', 
                minWidth: 56, 
                height: 56,
                '@keyframes pulse': {
                  '0%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.7)' },
                  '70%': { transform: 'scale(1.1)', boxShadow: '0 0 0 15px rgba(76, 175, 80, 0)' },
                  '100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' },
                },
                animation: 'pulse 1.5s infinite' 
              }}
            >
              <IconPhoneRing />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              color="success"
              disabled={phoneControlRdcr.outgoCallNow || phoneControlRdcr.incomeCallNow}
              sx={{ borderRadius: '50%', minWidth: 56, height: 56 }}
            >
              <IconPhone />
            </Button>
          )}
        </Grid>
        <Grid size={6} textAlign="center">
          <Button
            type="reset"
            variant="contained"
            color="error"
            sx={{ borderRadius: '50%', minWidth: 56, height: 56 }}
          >
            <IconHangup />
          </Button>
        </Grid>
      </Grid>

      {/* Цифровая панель */}
      {showInput && (
      <Grid container spacing={1}>
        {keys.map(([num, letters]) => (
          <Grid size={4} key={num} textAlign="center">
            <Button
              fullWidth
              variant="outlined"
              onClick={() => handleKey(num)}
              sx={{ 
                height: 50, 
                display: 'flex', 
                flexDirection: 'column',
                textTransform: 'none',
                borderColor: 'divider',
                borderRadius: 2,
                color: 'text.primary'
              }}
            >
              <Typography variant="body1" sx={{ lineHeight: 1, fontWeight: 'bold' }}>
                {num}
              </Typography>
              <Typography variant="caption" sx={{ fontSize: '0.7rem', color: 'text.secondary' }}>
                {letters}
              </Typography>
            </Button>
          </Grid>
        ))}
      </Grid>
      )}

    </Box>
  </Paper>



  return finalTemplate
}



PhonePad.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired,
  showInput             : PropTypes.bool.isRequired,
}

export default PhonePad