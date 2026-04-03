import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

import {
  Paper,
  Typography,

  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material'

import { format } from 'date-fns'



function PhoneHistory(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneHistory hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props



  useEffect(() => {
    console.log('PhoneHistory MOUNT')
    phoneControlActions.CallsArrUpdate()

    return () => {
      console.log('PhoneHistory UNMOUNT')
    }
  }, [])

  const handleCallLogClk = (phoneNum) => {
    const cleanNum = phoneNum.split(" ")[0]; 
    phoneControlActions.handleChangeStore('calleePhoneNum', cleanNum);
  }



  const callComonentsArr = []
  for (const row of phoneControlRdcr.callsArr) {
    callComonentsArr.push(
      <TableRow
        key={row.start}
        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
      >
        <TableCell component="th" scope="row"><small>{row.start ? format(new Date(row.start), 'yyyy-MM-dd HH:mm:ss') : '—'}</small></TableCell>
        <TableCell><span onClick={() => handleCallLogClk(row.uri)}>{row.uri}</span></TableCell>
        <TableCell align="right"><small>{row.flow + ' ' + row.status}</small></TableCell>
      </TableRow>
    )
  }

  const finalTemplate =
  <Paper elevation={8} sx={{ p: 1, mt: 2 }}>
    <Typography variant="h6">История звонков</Typography>

    <TableContainer >
      <Table size="small" aria-label="История звонков">
        <TableHead>
          <TableRow>
            <TableCell>Время</TableCell>
            <TableCell>Абонент</TableCell>
            <TableCell align="right">Статус</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {callComonentsArr}
        </TableBody>
      </Table>
    </TableContainer>

  </Paper>

  return finalTemplate
}



PhoneHistory.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneHistory