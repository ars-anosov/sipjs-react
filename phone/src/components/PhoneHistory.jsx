import { useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  Paper,
  Typography,
  Stack,
  IconButton,
  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Box,
} from '@mui/material'

import {
  ArrowBack as IcoIncome,
  ArrowForward as IcoOutgo,
  Close as IconClose,
} from '@mui/icons-material'

import { useTheme, alpha, keyframes } from '@mui/material/styles'

import { format } from 'date-fns'



function PhoneHistory(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneHistory hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props
  const theme = useTheme()



  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhoneHistory MOUNT')
    phoneControlActions.CallsArrUpdate()

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhoneHistory UNMOUNT')
    }
  }, [])

  const handleClose = () => {
    phoneControlActions.handleChangeStore('displayHistory', false)
  }

  const handleCallLogClk = (phoneNum) => {
    if (!phoneControlRdcr.incomeDisplay && !phoneControlRdcr.outgoCallNow && !phoneControlRdcr.incomeCallNow ) {
      const cleanNum = phoneNum.split(" ")[0]
      phoneControlActions.handleChangeStore('calleePhoneNum', cleanNum)
      phoneControlActions.handleClkSubmitOut(cleanNum, phoneControlRdcr)
    }
  }

  const blink = keyframes`
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  `



  return (
    <Paper elevation={8} sx={{ width: 480, mx: 'auto', p: 1, pt: 0, mt: 2 }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">SIP Звонки</Typography>
        <IconButton onClick={handleClose}>
          <IconClose color="error" />
        </IconButton>
      </Stack>

      <TableContainer
        sx={{
          height: 380,
          overflowY: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          backgroundColor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Table size="small" aria-label="История звонков" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Время</TableCell>
              <TableCell></TableCell>
              <TableCell sx={{ width: '100%' }}>Абонент</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {phoneControlRdcr.callsArr.map((row) => {
              const isRinging = row.callState?.toLowerCase().includes('ringing')
              const isInCall  = row.callState?.toLowerCase().includes('incall')
              const isLost    = row.callState?.toLowerCase().includes('lost')
              const isInbound = row.flow?.toLowerCase().includes('in')

              const basePalette = isInbound ? theme.palette.success : theme.palette.info

              let rowBgColor = 'transparent'
              let rowTextColor = basePalette.main

              if (isInCall) {
                rowBgColor = basePalette.main 
                rowTextColor = basePalette.contrastText
              } else if (isLost) {
                rowBgColor = alpha(theme.palette.error.main, 0.08)
                rowTextColor = theme.palette.error.dark 
              } else if (isRinging) {
                rowBgColor = alpha(theme.palette.warning.light, 0.4)
                rowTextColor = theme.palette.warning.dark
              } else {
                rowBgColor = alpha(basePalette.light, 0.05)
                rowTextColor = alpha(basePalette.dark, 0.8) 
              }

              return (
                <TableRow
                  key={row.start + row.uri}
                  onClick={() => handleCallLogClk(row.uri)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: rowBgColor,
                    transition: theme.transitions.create(['background-color', 'color']),
                    animation: isRinging ? `${blink} 1s infinite ease-in-out` : 'none',
                    '& .MuiTableCell-root': { 
                      color: rowTextColor,
                      fontWeight: isLost ? 'medium' : 'normal' 
                    },
                    '&:hover': {
                      backgroundColor: isInCall 
                        ? basePalette.dark 
                        : (isLost ? alpha(theme.palette.error.main, 0.15) : alpha(basePalette.light, 0.25))
                    }
                  }}
                >
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    <small>{row.start ? format(new Date(row.start), 'yyyy-MM-dd HH:mm') : '—'}</small>
                  </TableCell>

                  <TableCell align="right">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                      {isInbound ? (
                        <IcoIncome 
                          fontSize="small" 
                          sx={{ color: isInCall ? 'inherit' : 'success.main' }} 
                        />
                      ) : (
                        <IcoOutgo 
                          fontSize="small" 
                          sx={{ color: isInCall ? 'inherit' : 'info.main' }} 
                        />
                      )}
                    </Box>
                  </TableCell>

                  <TableCell sx={{ width: '100%', color: rowTextColor, pl: 2 }}>
                    {row.uri}
                  </TableCell>

                </TableRow>
              )
            })}
          </TableBody>

        </Table>
      </TableContainer>
    </Paper>
  )
}



PhoneHistory.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneHistory