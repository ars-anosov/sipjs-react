import { useEffect, useMemo } from 'react'
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
  Delete as IconDelete,
} from '@mui/icons-material'

import { useTheme, alpha, keyframes } from '@mui/material/styles'

import { format, isValid, parseISO } from 'date-fns'


const formatCallDate = (dateVal) => {
  if (!dateVal) return '—'

  let dateObj

  if (dateVal instanceof Date) {
    dateObj = dateVal
  } else if (typeof dateVal === 'number') {
    dateObj = new Date(dateVal)
  } else if (typeof dateVal === 'string') {
    dateObj = dateVal.includes('T') ? parseISO(dateVal) : new Date(dateVal)
  } else {
    return '—'
  }

  return isValid(dateObj) ? format(dateObj, 'yyyy-MM-dd HH:mm') : '—'
}

const formatCallDuration = (durationMs) => {
  if (!Number.isFinite(durationMs) || durationMs < 0) return '—'

  const totalSeconds = Math.max(0, Math.round(durationMs / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function PhoneHistory(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneHistory hook')

  const { phoneControlRdcr, phoneControlActions } = props
  const theme = useTheme()

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhoneHistory MOUNT')
    phoneControlActions.CallsArrUpdate()

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhoneHistory UNMOUNT')
    }
  }, [phoneControlActions])

  const handleClose = () => {
    phoneControlActions.handleChangeStore('displayHistory', false)
  }

  const handleCallLogClk = (phoneNum) => {
    const { incomeDisplay, outgoCallNow, incomeCallNow } = phoneControlRdcr
    if (!incomeDisplay && !outgoCallNow && !incomeCallNow && phoneNum) {
      const cleanNum = phoneNum.split(" ")[0]
      phoneControlActions.handleChangeStore('calleePhoneNum', cleanNum)
    }
  }

  const blink = useMemo(() => keyframes`
    0% { opacity: 1; }
    50% { opacity: 0.5; }
    100% { opacity: 1; }
  `, [])

  const processedCalls = useMemo(() => {
    return (phoneControlRdcr.callsArr || []).map((row, index) => {
      const state = row.callState?.toLowerCase() || ''
      const flow = row.flow?.toLowerCase() || ''

      const isRinging = state.includes('ringing')
      const isInCall  = state.includes('incall')
      const isLost    = state.includes('lost')
      const isInbound = flow.includes('in')

      const basePalette = isInbound ? theme.palette.success : theme.palette.info

      let rowBgColor = 'transparent'
      let rowTextColor = basePalette.main

      if (isInCall) {
        // 1. Активный разговор
        rowBgColor = basePalette.main 
        rowTextColor = basePalette.contrastText
      } else if (isLost && isInbound) {
        // 2. Входящий НЕОТВЕЧЕННЫЙ (Красная строка)
        rowBgColor = alpha(theme.palette.error.main, 0.05)
        rowTextColor = theme.palette.error.dark 
      } else if (isLost && !isInbound) {
        // 3. Исходящий НЕОТВЕЧЕННЫЙ (Серая строка)
        rowBgColor = alpha(theme.palette.action.disabledBackground || '#dddddd', 0.02)
        rowTextColor = theme.palette.text.disabled
      } else if (isRinging) {
        // 4. Идет вызов/мигание
        rowBgColor = alpha(theme.palette.warning.light, 0.4)
        rowTextColor = theme.palette.warning.dark
      } else {
        // 5. Успешный завершенный звонок
        rowBgColor = alpha(basePalette.light, 0.05)
        rowTextColor = alpha(basePalette.dark, 0.8) 
      }

      return {
        ...row,
        id: row.id || `${row.start || index}-${row.uri || index}`,
        isRinging,
        isInCall,
        isLost,
        isInbound,
        basePalette,
        rowBgColor,
        rowTextColor,
        formattedDate: formatCallDate(row.start),
        formattedDuration: formatCallDuration(row.duration)
      }
    })
  }, [phoneControlRdcr.callsArr, theme])

  return (
    <Paper 
      elevation={8} 
      sx={{ 
        minWidth: 350, maxWidth: 500,
        width: '100%', 
        mx: 'auto', 
        mt: 2,
        p: 1, 
        borderRadius: 3, 
        position: 'relative'
      }}
    >
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" color="primary">SIP Звонки</Typography>
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => phoneControlActions.handleClearHistory()} sx={{ position: 'absolute', top: 4, right: 54 }}>
            <IconDelete color="action" />
          </IconButton>
          <IconButton onClick={handleClose} sx={{ position: 'absolute', top: 4, right: 4 }}>
            <IconClose color="action" />
          </IconButton>
        </Stack>
      </Stack>

      <TableContainer
        sx={{
          height: 440,
          overflowY: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          backgroundColor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        <Table size="small" aria-label="История звонков" stickyHeader sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: 110, py: 0.5 }}>Время</TableCell>
              <TableCell sx={{ width: 50, py: 0.5 }}></TableCell>
              <TableCell sx={{ width: 34, py: 0.5 }}></TableCell>
              <TableCell sx={{ width: '100%', py: 0.5 }}>Абонент</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {processedCalls.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => handleCallLogClk(row.uri)}
                sx={{
                  cursor: 'pointer',
                  backgroundColor: row.rowBgColor,
                  transition: theme.transitions.create(['background-color', 'color']),
                  animation: row.isRinging ? `${blink} 1s infinite ease-in-out` : 'none',
                  '& .MuiTableCell-root': { 
                    color: row.rowTextColor,
                    fontWeight: row.isLost ? 'medium' : 'normal' 
                  },
                  '&:hover': {
                    backgroundColor: row.isInCall 
                      ? row.basePalette.dark 
                      : (row.isLost && row.isInbound 
                          ? alpha(theme.palette.error.main, 0.15) 
                          : (row.isLost && !row.isInbound 
                              ? alpha(theme.palette.action.disabledBackground || '#dddddd', 0.2)
                              : alpha(row.basePalette.light, 0.25)))
                  }
                }}
              >
                <TableCell sx={{ whiteSpace: 'nowrap', py: 0.5 }}>
                  <small>{row.formattedDate}</small>
                </TableCell>

                <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', py: 0.5 }}>
                  <small>{row.formattedDuration}</small>
                </TableCell>

                <TableCell align="right" sx={{ py: 0.25, px: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.25 }}>
                    {row.isInbound ? (
                      <IcoIncome 
                        fontSize="small" 
                        sx={{ 
                          color: row.isInCall ? 'inherit' : (row.isLost ? 'error.dark' : 'success.main')
                        }} 
                      />
                    ) : (
                      <IcoOutgo 
                        fontSize="small" 
                        sx={{ 
                          color: row.isInCall ? 'inherit' : (row.isLost ? 'text.disabled' : 'info.main')
                        }} 
                      />
                    )}
                  </Box>
                </TableCell>

                <TableCell sx={{ width: '100%', pl: 1.5, py: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {row.uri}
                </TableCell>
              </TableRow>
            ))}
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
