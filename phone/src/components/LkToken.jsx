import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Collapse,
  IconButton,
} from '@mui/material'

import {
  Login as IconLogin,
  Close as IconClose,
} from '@mui/icons-material'

function LkToken(props) {
  const {
    phoneControlRdcr,
    lkControlRdcr,
    lkControlActions,
  } = props

  const [num, setNum] = useState('')
  const [room, setRoom] = useState(phoneControlRdcr.callerUserNum || '')
  const [uriLkToken, setUriLkToken] = useState(lkControlRdcr.uriLkToken || '')

  const handleSubmit = (event) => {
    event.preventDefault()
    lkControlActions.handleLkTokenSubmit({ num, room, uriLkToken })
  }

  const handleReset = () => {
    setNum('')
    // setRoom('')
    // setUriLkToken('')
  }

  const handleClose = () => {
    lkControlActions.handleChangeStore('displayLkToken', false)
  }

  return (
    (lkControlRdcr.displayLkToken) && (
    <Paper elevation={8} sx={{ maxWidth: 300, width: '100%', mx: 'auto', p: 1, pt: 0, mt: 2 }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6">Пригласить участника</Typography>
        <IconButton onClick={handleClose}>
          <IconClose color="error" />
        </IconButton>
      </Stack>

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        autoComplete="off"
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <TextField
              fullWidth
              required
              id="lkTokenNum"
              label="Вн.номер"
              variant="outlined"
              value={num}
              onChange={(event) => setNum(event.target.value)}
            />

            <TextField
              fullWidth
              required
              id="lkTokenRoom"
              label="Room"
              variant="outlined"
              value={room}
              onChange={(event) => setRoom(event.target.value)}
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
              sx={{ display: 'none' }}
            />
          </Stack>

          <TextField
            fullWidth
            required
            id="uriLkToken"
            label="API URI"
            variant="outlined"
            value={uriLkToken}
            onChange={(event) => setUriLkToken(event.target.value)}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
            sx={{ display: 'none' }}
          />

          <Stack direction="row" spacing={2} sx={{ justifyContent: 'flex-end' }}>
            <Button
              type="button"
              variant="outlined"
              color="primary"
              size="large"
              onClick={handleReset}
            >
              Стереть
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              startIcon={<IconLogin />}
              size="large"
              disabled={lkControlRdcr.status === 'loading'}
            >
              Пригласить
            </Button>
          </Stack>
        </Stack>
      </Box>

      <Collapse in={!!lkControlRdcr.message}>
        <Alert severity={lkControlRdcr.status === 'error' ? 'error' : 'success'} sx={{ mt: 2 }}>
          {lkControlRdcr.message}
        </Alert>
      </Collapse>
    </Paper>
  ))
}

LkToken.propTypes = {
  lkControlRdcr: PropTypes.object.isRequired,
  lkControlActions: PropTypes.object.isRequired,
}

export default LkToken
