import { useState, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import {
  Autocomplete,
  createFilterOptions,
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

const filter = createFilterOptions()

function PhoneDir(props) {
  if (import.meta.env.DEV) console.log('PhoneDir hook')

  const { phoneControlRdcr, phoneControlActions } = props

  const [dirPart, setDirPart] = useState('')
  const [options, setOptions] = useState([])
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  })

  const getPhoneDirRef = useRef(phoneControlActions.getPhoneDir)
  useEffect(() => {
    getPhoneDirRef.current = phoneControlActions.getPhoneDir
  }, [phoneControlActions.getPhoneDir])

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') return
    setSnackbar((prev) => ({ ...prev, open: false }))
  }

  useEffect(() => {
    if (import.meta.env.DEV) console.log('PhoneDir MOUNT')
    
    const fetchData = async () => {
      const fetchFn = getPhoneDirRef.current
      if (fetchFn) {
        try {
          const data = await fetchFn()
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
      if (import.meta.env.DEV) console.log('PhoneDir UNMOUNT')
    }
  }, [])

  return (
    <>
      <Autocomplete
        freeSolo
        disablePortal
        options={options}
        size="small"
        forcePopupIcon={false}
        openOnFocus={false} // Запрещает открывать список при пустом клике мышкой
        disableClearable={dirPart.length === 0}
        
        inputValue={dirPart}
        onInputChange={(event, newInputValue, reason) => {
          if (reason === 'clear') {
            setDirPart('')
          } else {
            setDirPart(newInputValue)
          }
        }}
        
        // Условие "> 3" теперь живет в одном месте и управляет выдачей результатов
        filterOptions={(options, params) => {
          if (dirPart.length <= 3) return [] // Если символов мало — результатов нет
          return filter(options, {
            ...params,
            inputValue: dirPart,
          })
        }}

        getOptionLabel={(option) => {
          if (typeof option === 'string') return option
          return option.label || ''
        }}
        onChange={(event, newValue, reason) => {
          if (reason === 'selectOption') {
            event.preventDefault()
          }
        }}
        slotProps={{
          popper: {
            sx: {
              width: '350px !important',
              // Если результатов нет (длина < 4), полностью скрываем Popper, чтобы не было пустого окна
              display: dirPart.length <= 3 ? 'none !important' : 'block',
              '& .MuiAutocomplete-listbox': {
                width: '100%',
              }
            }
          },
          clearIndicator: {
            sx: { color: '#ffffff !important' }
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
              <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
                <Typography 
                  component="span"
                  variant="body2"
                  sx={{ 
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
                  sx={{ color: 'text.secondary' }}
                >
                  {targetValue} {option.email}
                </Typography>
              </Box>

              <Box 
                sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {option.num && (
                  <Tooltip title="В телефон" arrow>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        phoneControlActions.handleChangeStore('calleePhoneNum', option.num)
                        phoneControlActions.handleChangeStore('displayPad', true)
                      }}
                    >
                      <PhoneIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {option.prefix && (
                  <Tooltip title="В телефон" arrow>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        phoneControlActions.handleChangeStore('calleePrefix', option.prefix)
                        phoneControlActions.handleChangeStore('addPrefix', true)
                        phoneControlActions.handleChangeStore('displayPad', true)
                      }}
                    >
                      <DialpadIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}

                {option.email && (
                  <Tooltip title="Копировать email" arrow>
                    <IconButton
                      color="info"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard.writeText(option.email)
                          .then(() => {
                            setSnackbar({
                              open: true,
                              message: 'Email скопирован!',
                              severity: 'info'
                            })
                          })
                          .catch((err) => {
                            console.error('Ошибка копирования:', err)
                            setSnackbar({
                              open: true,
                              message: 'Не удалось скопировать email',
                              severity: 'error'
                            })
                          })
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
        autoHideDuration={1000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
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
    handleChangeStore: PropTypes.func.isRequired,
  }).isRequired,
}

export default PhoneDir
