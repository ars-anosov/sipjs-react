import React, { useState } from 'react'
import PropTypes from 'prop-types'

import {
  Box,
  Stack,
  InputBase,
  Alert,
  Collapse,
  IconButton,
  CircularProgress,
} from '@mui/material'

// Импортируем современные иконки Outlined
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'

function LkToken(props) {
  const {
    phoneControlRdcr,
    lkControlRdcr,
    lkControlActions,
  } = props

  const [num, setNum] = useState('')
  const [room, setRoom] = useState(phoneControlRdcr?.callerUserNum || '')
  const [uriLkToken, setUriLkToken] = useState(lkControlRdcr?.uriLkToken || '')

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!num.trim()) return
    lkControlActions.handleLkTokenSubmit({ num, room, uriLkToken })
  }

  const handleClose = () => {
    lkControlActions.handleChangeStore('displayLkToken', false)
  }

  if (!lkControlRdcr.displayLkToken) return null

  const isLoading = lkControlRdcr.status === 'loading'
  
  // Единый стандарт размера для всех интерактивных элементов панели (MUI v9 / MD3)
  const elementSize = 32 

  return (
    <Box 
      component="form"
      onSubmit={handleSubmit}
      noValidate
      autoComplete="off"
      sx={{ 
        display: 'inline-flex',
        flexDirection: 'column',
        width: 'max-content'
      }}
    >
      <Stack 
        direction="row" 
        spacing={0.5}
        sx={{ 
          p: '2px',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'transparent', // Компонент стал полностью сквозным
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:focus-within': {
            borderColor: 'primary.main',
            boxShadow: '0 0 0 1px var(--mui-palette-primary-main, #1976d2)' 
          }
        }}
      >
        <InputBase
          required
          id="lkTokenNum"
          type="tel"
          placeholder="Вн. номер"
          size="small"
          value={num}
          onChange={(event) => setNum(event.target.value)}
          autoFocus
          disabled={isLoading}
          sx={{ width: '8ch', pl: 1 }} // Добавили небольшой отступ слева для текста
        />

        {/* Кнопка отправки (Человечек). Геометрия 1 в 1 как у крестика */}
        <IconButton
          type="submit"
          color="primary"
          disabled={isLoading}
          sx={{ 
            p: 0,
            width: elementSize,       
            height: elementSize,      
            minWidth: elementSize,    
            borderRadius: '50%',      
            flexShrink: 0,
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          {isLoading ? (
            <CircularProgress size={16} color="inherit" />
          ) : (
            <PersonAddOutlinedIcon fontSize="small" />
          )}
        </IconButton>

        {/* Разделитель или скрытые поля (не влияют на верстку) */}
        <input type="hidden" id="lkTokenRoom" value={room} readOnly />
        <input type="hidden" id="uriLkToken" value={uriLkToken} readOnly />

        {/* Кнопка закрытия (Крестик). Идентична по размерам кнопке отправки */}
        <IconButton 
          onClick={handleClose} 
          size="small" 
          sx={{ 
            p: 0,
            color: 'text.secondary', 
            width: elementSize,          
            height: elementSize,         
            minWidth: elementSize,       
            borderRadius: '50%',
            flexShrink: 0,      
            '&:hover': { backgroundColor: 'action.hover' }
          }}
        >
          <CloseOutlinedIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Collapse in={!!lkControlRdcr.message && lkControlRdcr.status === 'error'}>
        <Alert 
          severity="error" 
          variant="standard"
          sx={{ 
            py: 0, 
            px: 1, 
            fontSize: '0.72rem',
            backgroundColor: 'transparent', // Делаем алерт тоже прозрачным под стать форме
            '& .MuiAlert-icon': { fontSize: '0.9rem', mr: 0.5 } 
          }}
        >
          {lkControlRdcr.message}
        </Alert>
      </Collapse>

    </Box>
  )
}

LkToken.propTypes = {
  phoneControlRdcr: PropTypes.object,
  lkControlRdcr: PropTypes.object.isRequired,
  lkControlActions: PropTypes.object.isRequired,
}

export default LkToken
