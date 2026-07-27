import { alpha } from '@mui/material/styles'

export const getLiveKitMuiStyles = (theme) => ({
  "[data-lk-theme='default']": {
    // Основные фоны и текст (светлая тема)
    '--lk-bg': theme.palette.background.paper,
    '--lk-bg-transparent': alpha(theme.palette.background.paper, 0.85),
    '--lk-text-color': theme.palette.text.primary,
    '--lk-text-color-secondary': theme.palette.text.secondary,

    // Акценты
    '--lk-accent-color': theme.palette.primary.main,
    '--lk-accent-bg': alpha(theme.palette.primary.main, 1.0),
    '--lk-danger-color': theme.palette.error.main,
    
    // Светлый стиль панели и кнопок
    '--lk-control-bar-bg': theme.palette.background.default, 

    // Стандартные кнопки управления
    '& .lk-button': {
      backgroundColor: theme.palette.action.hover,
      color: theme.palette.text.primary,
      border: `1px solid ${theme.palette.divider} !important`,
      transition: 'all 0.15s ease-in-out',

      '&:hover': {
        backgroundColor: theme.palette.action.selected,
        color: theme.palette.primary.main,
      },

      '&[data-lk-active="true"], &.lk-button-active': {
        backgroundColor: alpha(theme.palette.primary.main, 0.1), 
        color: theme.palette.primary.main,
        borderColor: `${alpha(theme.palette.primary.main, 0.3)} !important`,
        
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, 0.2),
        },
      },
    },

    // СВЕТЛАЯ КНОПКА LEAVE (ОТКЛЮЧЕНИЕ)
    '& .lk-disconnect-button, & .lk-button.lk-disconnect-button': {
      backgroundColor: alpha(theme.palette.error.main, 0.06) + ' !important', // легкий красный оттенок
      color: theme.palette.error.main + ' !important',                      // красный текст и иконка
      borderColor: alpha(theme.palette.error.main, 0.2) + ' !important',    // мягкая красная рамка

      '&:hover': {
        backgroundColor: alpha(theme.palette.error.main, 0.15) + ' !important', // более насыщенный фон при наведении
        color: theme.palette.error.dark + ' !important',
        borderColor: alpha(theme.palette.error.main, 0.4) + ' !important',
      },
    },

    // Радикальный фикс рамок и теней для видео-сетки
    '--lk-border-color': 'transparent !important',
    '--lk-border-radius': `${theme.shape.borderRadius}px`,

    '& .lk-grid-layout, & .lk-carousel, & .lk-grid-layout *, & .lk-carousel *': {
      border: 'none !important',
      boxShadow: 'none !important',
      outline: 'none !important',
    },

    '& .lk-video-container, & .lk-participant-tile, & .lk-focus-layout, & video': {
      borderRadius: 'inherit',
      overflow: 'hidden',
      border: 'none !important',
      boxShadow: 'none !important',
      outline: 'none !important',
      backgroundClip: 'padding-box',
      WebkitMaskImage: 'radial-gradient(circle, white 100%, black 100%)',
      maskImage: 'radial-gradient(circle, white 100%, black 100%)',
    },

    // Светлые выпадающие меню и поповеры
    '--lk-dropdown-bg': theme.palette.background.paper,
    '--lk-dropdown-text-color': theme.palette.text.primary,
    '--lk-popover-bg': theme.palette.background.paper,

    '& .lk-device-menu, & .lk-popover': {
      backgroundColor: `${theme.palette.background.paper} !important`,
      border: `1px solid ${theme.palette.divider} !important`,
      boxShadow: `${theme.shadows[4]} !important`, 
      borderRadius: `${theme.shape.borderRadius}px !important`,
    },

    // Элементы списка внутри меню
    '& .lk-device-menu-item, & [role="menuitem"]': {
      transition: 'background-color 0.15s ease',
      color: `${theme.palette.text.primary} !important`,
      padding: '8px 12px',
      
      '&:hover': {
        backgroundColor: `${theme.palette.action.hover} !important`,
        color: `${theme.palette.primary.main} !important`,
      },
      
      '&[aria-checked="true"], &[data-active="true"], &.lk-active': {
        backgroundColor: `${theme.palette.primary.main} !important`,
        color: `${theme.palette.primary.contrastText} !important`,
        fontWeight: theme.typography.fontWeightMedium,
        
        '&:hover': {
          backgroundColor: `${theme.palette.primary.dark} !important`,
        },
      },
    },
  },
})
