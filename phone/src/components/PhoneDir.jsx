import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import {
  Autocomplete,
  TextField,
  Box,
  IconButton,
  Typography,
  Snackbar,
  Alert,
  Tooltip,
}                   from '@mui/material'
import PhoneIcon    from '@mui/icons-material/Phone'
import DialpadIcon  from '@mui/icons-material/Dialpad'
import MailIcon     from '@mui/icons-material/Mail'



function PhoneDir(props) {
  if (process.env.NODE_ENV === 'development') console.log('PhoneDir hook')

  const { phoneControlRdcr, phoneControlActions } = props

  const [dirPart, setDirPart] = useState('')
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState([])
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' // 'success' или 'error'
  })

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return
    setSnackbar({ ...snackbar, open: false })
  }

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') console.log('PhoneDir MOUNT')
    
    const fetchData = async () => {
      if (phoneControlActions?.getPhoneDir) {
        try {
          const data = await phoneControlActions.getPhoneDir()
          if (Array.isArray(data)) {
            setOptions(data)
          }
        } catch (error) {
          console.error('Ошибка загрузки справочника:', error)
        }
      }
    }
    fetchData()

    return () => {
      if (process.env.NODE_ENV === 'development') console.log('PhoneDir UNMOUNT')
    }
  }, [phoneControlActions?.getPhoneDir])


  const handleInputChange = (event, newInputValue) => {
    setDirPart(newInputValue)
    setOpen(newInputValue.length > 3)
  }

  return (
    <>
      <Autocomplete
        disablePortal
        options={options}
        size="small"
        forcePopupIcon={false}
        open={open}
        onOpen={() => {
          if (dirPart.length > 3) setOpen(true)
        }}
        onClose={(event, reason) => {
          if (reason === 'toggleInput' || reason === 'escape' || reason === 'blur') {
            setOpen(false)
          }
        }}
        inputValue={dirPart}
        onInputChange={handleInputChange}
        getOptionLabel={(option) => option.label || ''}
        onChange={(event, newValue, reason) => {
          if (reason === 'selectOption') {
            event.preventDefault()
          }
        }}
        slotProps={{
          popper: {
            sx: {
              width: '350px !important',
              '& .MuiAutocomplete-listbox': {
                width: '100%',
              }
            }
          }
        }}
        sx={{ 
          width: 200, 
          mx: 2, 
          '& .MuiIconButton-root': { color: '#ffffff' } 
        }}
        renderOption={(propsOption, option) => {
          const { key, ...optionProps } = propsOption
          const targetValue = option.num || option.prefix || ''
          const isPrefixType = !option.num && option.prefix

          return (
            <Box
              key={key}
              component="li"
              {...optionProps}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                gap: 1
              }}
            >
              {/* Текст контакта */}
              <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                <Typography 
                  component="span"
                  variant="body2"
                  style={{ 
                    fontWeight: 'bold', 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    whiteSpace: 'nowrap' 
                  }}
                >
                  {option.label}
                </Typography>
                <Typography 
                  component="span"
                  variant="caption"
                  style={{ color: 'gray' }}
                >
                  {targetValue} {option.email}
                </Typography>
              </Box>

              {/* Кнопки действий */}
              <Box 
                sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Tooltip title="Набрать в телефоне" arrow>
                  <IconButton
                    color="primary"
                    onClick={() => {
                      phoneControlActions.handleChangeStore('calleePhoneNum', targetValue)
                      phoneControlActions.handleChangeStore('displayPad', true)
                    }}
                  >
                    {isPrefixType ? <DialpadIcon fontSize="small" /> : <PhoneIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>

                {/* Проверка наличия email */}
                {option.email && (
                  <Tooltip title="Копировать email" arrow>
                    <IconButton
                      color="info"
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        navigator.clipboard.writeText(option.email)
                          .then(() => {
                            setSnackbar({
                              open: true,
                              message: 'Email скопирован!',
                              severity: 'info'
                            });
                          })
                          .catch((err) => {
                            console.error('Ошибка копирования:', err);
                            // Включаем уведомление об ошибке
                            setSnackbar({
                              open: true,
                              message: 'Не удалось скопировать email',
                              severity: 'error'
                            });
                          });
                      }}
                    >
                      <MailIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
          )
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Поиск"
            sx={{
              '& .MuiInputLabel-root': { color: '#ffffff' },
              '& .MuiInputLabel-root.Mui-focused': { color: '#ffffff' },
              '& .MuiInputBase-input': { color: '#ffffff' },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: '#ffffff' },
                '&:hover fieldset': { borderColor: '#ffffff !important' },
                '&.Mui-focused fieldset': { borderColor: '#ffffff' },
              },
            }}
          />
        )}
      />



      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} // Скроется через 3 секунды
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} // Позиция на экране
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          variant="filled" 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  )
}

PhoneDir.propTypes = {
  phoneControlRdcr: PropTypes.object.isRequired,
  phoneControlActions: PropTypes.shape({
    getPhoneDir: PropTypes.func.isRequired,
  }).isRequired,
}


export default PhoneDir
