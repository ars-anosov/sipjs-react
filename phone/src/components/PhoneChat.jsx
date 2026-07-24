import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import {
  Paper,
  Typography,
  TextField,
  Box,
  Stack,
  IconButton,
  Alert,
  Collapse,
  Badge,
} from '@mui/material'

import {
  Send as IconSend,
  Close as IconClose,
  Delete as IconDelete,
} from '@mui/icons-material'

import { useTheme, alpha } from '@mui/material/styles'
import { format } from 'date-fns'



function PhoneChat(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneChat hook')

  const { phoneControlRdcr, phoneControlActions } = props
  const theme = useTheme()
  const messagesEndRef = useRef(null)

  const formatPhoneDigits = (value) => (value || '').replace(/\D/g, '')
  const [peerTxt, setPeerTxt] = useState(formatPhoneDigits(phoneControlRdcr.calleePhoneNum))
  const [messageTxt, setMessageTxt] = useState('')

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhoneChat MOUNT')
    phoneControlActions.MessagesArrUpdate()
    phoneControlActions.handleChatUnreadClear()

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhoneChat UNMOUNT')
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [phoneControlRdcr.chatMessages])

  const visibleMessages = peerTxt.trim()
    ? phoneControlRdcr.chatMessages.filter((msg) => msg.peer === peerTxt.trim())
    : phoneControlRdcr.chatMessages

  const handleClose = () => {
    phoneControlActions.handleChangeStore('displayChat', false)
    phoneControlActions.handleChangeStore('errComponent', '')
    phoneControlActions.handleChangeStore('errText', '')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    phoneControlActions.handleSendMessage(peerTxt, messageTxt, phoneControlRdcr)
    setMessageTxt('')
  }

  const title = phoneControlRdcr.chatUnread > 0
    ? `SIP Сообщения (${phoneControlRdcr.chatUnread})`
    : 'SIP Сообщения'

  const formatDeliveryStatus = (msg) => {
    if (msg.direction !== 'out' || !msg.status) return null

    if (msg.status === 'sending') return 'отправка...'
    if (msg.statusCode) {
      return msg.statusText ? `${msg.statusCode} ${msg.statusText}` : String(msg.statusCode)
    }
    if (msg.status === 'delivered') return 'доставлено'
    if (msg.status === 'error') return msg.statusText || 'ошибка'
    return null
  }

  const deliveryStatusColor = (msg) => {
    if (msg.status === 'delivered') return 'success.main'
    if (msg.status === 'error') return 'error.main'
    return 'text.secondary'
  }

  return (
    <Paper elevation={8} sx={{ minWidth: 300, maxWidth: 480, width: '100%', mx: 'auto', p: 1, pt: 0, mt: 2 }}>
      <Stack direction="row" sx={{ mb: 1, alignItems: 'center', justifyContent: 'space-between' }}>
        <Badge color="error" badgeContent={phoneControlRdcr.chatUnread} invisible={!phoneControlRdcr.chatUnread}>
          <Typography variant="h6">{title}</Typography>
        </Badge>
        <Stack direction="row" spacing={0} sx={{ alignItems: 'center' }}>
          <IconButton onClick={phoneControlActions.handleClearChat}>
            <IconDelete color="action" />
          </IconButton>
          <IconButton onClick={handleClose}>
            <IconClose color="error" />
          </IconButton>
        </Stack>
      </Stack>

      <Box component="form" onSubmit={handleSubmit}>
        <TextField
          required
          label="Вн.номер"
          variant="outlined"
          id="phone-chat-peer"
          value={peerTxt}
          onChange={(event) => setPeerTxt(event.target.value)}
          sx={{ mb: 1 }}
        />

        <Box
          sx={{
            height: 302,
            overflowY: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            mb: 1,
            backgroundColor: alpha(theme.palette.background.default, 0.5),
          }}
        >
          {peerTxt.trim() && visibleMessages.length > 0 ? (
            visibleMessages.map((msg) => {
              const isOutbound = msg.direction === 'out'
              const deliveryStatus = formatDeliveryStatus(msg)
              const bubbleColor = isOutbound
                ? alpha(theme.palette.info.main, 0.12)
                : alpha(theme.palette.success.main, 0.12)

              return (
                <Box
                  key={msg.id}
                  sx={{
                    mb: 1,
                    p: 1,
                    borderRadius: 1,
                    backgroundColor: bubbleColor,
                  }}
                >
                  <Stack direction="row" spacing={1} sx={{ mb: 0.5, justifyContent: 'space-between' }}>
                    <Typography variant="caption" color="text.secondary">
                      {isOutbound ? 'Вы' : msg.peer}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(msg.time), 'HH:mm:ss')}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {msg.body}
                  </Typography>
                  {deliveryStatus && (
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        mt: 0.5,
                        textAlign: 'right',
                        color: deliveryStatusColor(msg),
                        fontStyle: msg.status === 'sending' ? 'italic' : 'normal',
                      }}
                    >
                      {deliveryStatus}
                    </Typography>
                  )}
                </Box>
              )
            })
          ) : null}
          <div ref={messagesEndRef} />
        </Box>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            label="Сообщение"
            variant="standard"
            id="phone-chat-message"
            value={messageTxt}
            onChange={(event) => setMessageTxt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && event.ctrlKey) {
                event.preventDefault()
                handleSubmit(event)
              }
            }}
            multiline
            maxRows={4}
          />
          <IconButton
            type="submit"
            variant="contained"
            color="success"
            disabled={!phoneControlRdcr.regNow}
            sx={{ borderRadius: '50%', minWidth: 56, height: 56 }}
          >
            <IconSend />
          </IconButton>
        </Stack>
      </Box>

      <Collapse in={phoneControlRdcr.errComponent === 'PhoneChat' && phoneControlRdcr.errText}>
        <Alert severity="error" sx={{ mt: 2 }}>{phoneControlRdcr.errText}</Alert>
      </Collapse>
    </Paper>
  )
}



PhoneChat.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
  phoneControlActions: PropTypes.object.isRequired,
}

export default PhoneChat
