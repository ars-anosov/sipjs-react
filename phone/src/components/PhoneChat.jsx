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
  InputAdornment,
  Fab,
} from '@mui/material'

import {
  Send          as IconSend,
  Close         as IconClose,
  Delete        as IconDelete,
  Backspace     as IconBackspace,
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

  const handlePeerSelect = (peer) => {
    setPeerTxt(formatPhoneDigits(peer))
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

  const renderMessageBody = (body) => {
    if (!body) return null

    const parts = body.split(/(<a\s+href="[^"]+">.*?<\/a>)/gi)
    if (parts.length === 1) return body

    const normalizeLinkHref = (href) => {
      if (!href) return '#'
      if (href.startsWith('#')) return href
      if (/^(https?:|mailto:|tel:)/i.test(href)) return href
      return `#/${href.replace(/^\/+/, '')}`
    }

    return parts.map((part, index) => {
      const match = part.match(/^<a\s+href="([^"]+)">([^<]+)<\/a>$/i)
      if (!match) return <span key={`message-body-${index}`}>{part}</span>

      const [, href, text] = match
      return (
        <a
          key={`message-body-${index}`}
          href={normalizeLinkHref(href)}
          style={{ color: 'inherit', textDecoration: 'underline' }}
        >
          {text}
        </a>
      )
    })
  }

  const deliveryStatusColor = (msg) => {
    if (msg.status === 'delivered') return 'success.main'
    if (msg.status === 'error') return 'error.main'
    return 'text.secondary'
  }

  return (
    <Paper elevation={8} sx={{ minWidth: 300, maxWidth: 480, width: '100%', mx: 'auto', p: 1, pt: 0, mt: 2 }}>
      <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
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
          label="Вн.номер"
          variant="standard"
          id="phone-chat-peer"
          value={peerTxt}
          onChange={(event) => setPeerTxt(event.target.value)}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setPeerTxt('')} size="small">
                    <IconBackspace />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={{ width: '12ch', mb: 1 }}
        />

        <Box
          sx={{
            height: 336,
            overflowY: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            mb: 1,
            backgroundColor: alpha(theme.palette.background.default, 0.5),
          }}
        >
          {visibleMessages.length > 0 ? (
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
                    cursor: 'pointer',
                  }}
                  onClick={() => handlePeerSelect(msg.peer)}
                >
                  <Stack direction="row" spacing={1} sx={{ mb: 0.5, justifyContent: 'space-between' }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      {isOutbound ? `Вы → ${msg.peer}` : msg.peer}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format(new Date(msg.time), 'HH:mm:ss')}
                    </Typography>
                  </Stack>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {renderMessageBody(msg.body)}
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
          <Fab 
            type="submit" 
            color="success" 
            disabled={!phoneControlRdcr.regNow}
            sx={{ 
              width: 52, 
              height: 52, 
              minWidth: 52 
            }}
          >
            <IconSend />
          </Fab>
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
