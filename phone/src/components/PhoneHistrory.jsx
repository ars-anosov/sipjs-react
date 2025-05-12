import React, { useState, useEffect} from 'react';
import PropTypes from 'prop-types';

import {
  styled,

  Divider,
  Paper,
  Typography,

  TableContainer,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow
} from '@mui/material'

const PaperSt = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  // maxWidth: '600px'
}))

function dateStrFromTimestamp(intStamp, format='ISO', tzone='+03:00') {
  let dateStr = ''

  if (intStamp) {
    const dateObj = new Date(intStamp)
    const dateArr = new Date( dateObj.getTime() - dateObj.getTimezoneOffset() * 60000 ).toISOString().split('T')
    // toISOString (https://ru.wikipedia.org/wiki/ISO_8601) -> "2011-10-05T14:48:00.000Z"
    // Часовой пояс всегда равен UTC, что обозначено суффиксом "Z"

    switch (format) {
      case 'ISO':
        dateStr = dateArr[0]+'T'+dateArr[1].substring(0, 8)+tzone
        break
      case 'date_dig_only':
        dateStr = dateArr[0].replace(/\-/g, '')
        break

      case 'time_only':
        dateStr = dateArr[1].substring(0, 8)
        break

      case 'mysql':
        dateStr = dateArr[0]+' '+dateArr[1].substring(0, 8)
        break

      default:
        dateStr = dateArr[0]+' '+dateArr[1].substring(0, 8)
        break
    }
  }

  return dateStr
}



function PhoneHistrory(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneHistrory hook')

  const {
    phoneControlRdcr, phoneControlActions
  } = props



  useEffect(() => {
    console.log('PhoneHistrory MOUNT')
    // Рисую историю звонков из LocalStorage
    phoneControlActions.CallsArrUpdate()

    return () => {
      console.log('PhoneHistrory UNMOUNT')
    }
  }, [])

  const handleCallLogClk = (event) => {
    const textSplit = event.target.textContent.split(" ")
    phoneControlActions.handleChangeData({'target':{'id':'calleePhoneNum', 'value':textSplit[0]}})
  }



  const callComonentsArr = []
  for (const row of phoneControlRdcr.callsArr) {
    callComonentsArr.push(
      <TableRow
        key={row.start}
        sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
      >
        <TableCell component="th" scope="row"><small>{dateStrFromTimestamp(row.start,'mysql')}</small></TableCell>
        <TableCell><span onClick={handleCallLogClk}>{row.uri}</span></TableCell>
        <TableCell align="right"><small>{row.flow + ' ' + row.status}</small></TableCell>
      </TableRow>
    )
  }

  const finalTemplate =
  <PaperSt elevation={8}>
    <Typography variant="h6">История звонков</Typography>
    <Divider />

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

  </PaperSt>

  return finalTemplate
}



PhoneHistrory.propTypes = {
  phoneControlRdcr      : PropTypes.object.isRequired,
  phoneControlActions   : PropTypes.object.isRequired
}

export default PhoneHistrory