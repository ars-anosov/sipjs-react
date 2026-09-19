import { alpha } from "@mui/material/styles";

// Стили LiveKit-компонентов через палитру MUI: панель управления, меню устройств и
// подложки. Имена CSS-переменных — из установленного `@livekit/components-styles`
// (general/themes/default.css); устаревшие (--lk-text-color, --lk-control-bar-bg,
// --lk-popover-bg и т. п.) в этой версии не читаются и здесь не задаются.
export const getLiveKitMuiStyles = (theme) => ({
  "[data-lk-theme='default']": {
    colorScheme: "light",

    // Поверхности и текст
    "--lk-bg": theme.palette.background.paper,
    "--lk-bg2": theme.palette.grey[100],
    "--lk-bg3": theme.palette.grey[200],
    "--lk-bg4": theme.palette.grey[300],
    "--lk-bg5": theme.palette.grey[400],
    "--lk-fg": theme.palette.text.primary,
    "--lk-fg2": theme.palette.text.primary,
    "--lk-fg3": theme.palette.text.primary,
    "--lk-fg4": theme.palette.text.primary,
    "--lk-fg5": theme.palette.text.primary,
    "--lk-border-color": theme.palette.divider,
    "--lk-box-shadow": theme.shadows[4],

    // Типографика и геометрия — как у кнопок MUI
    "--lk-font-family": theme.typography.fontFamily,
    "--lk-font-size": "0.875rem",
    "--lk-border-radius": `${theme.shape.borderRadius * 2}px`,

    // Кнопки управления: нейтральная outlined-кнопка, активное состояние — primary
    "--lk-control-fg": theme.palette.text.primary,
    "--lk-control-bg": "transparent",
    "--lk-control-hover-bg": theme.palette.action.hover,
    "--lk-control-active-bg": alpha(theme.palette.primary.main, 0.12),
    "--lk-control-active-hover-bg": alpha(theme.palette.primary.main, 0.2),
    "--lk-accent-bg": theme.palette.primary.main,
    "--lk-accent-fg": theme.palette.primary.contrastText,
    "--lk-accent2": theme.palette.primary.dark,
    "--lk-accent3": theme.palette.primary.dark,
    "--lk-danger": theme.palette.error.main,
    "--lk-danger-fg": theme.palette.error.contrastText,
    "--lk-success": theme.palette.success.main,

    // Панель управления: без своей полосы и рамки — кнопки несут стиль панели
    "& .lk-control-bar": {
      padding: theme.spacing(1.25),
      borderTop: "none",
      backgroundColor: "transparent",
    },

    "& .lk-button, & .lk-start-audio-button, & .lk-chat-toggle, & .lk-disconnect-button": {
      minHeight: 40,
      padding: theme.spacing(1, 1.75),
      fontFamily: theme.typography.fontFamily,
      fontSize: "0.875rem",
      fontWeight: theme.typography.button.fontWeight,
      lineHeight: 1.5,
      textTransform: "none",
      borderRadius: `${theme.shape.borderRadius * 2}px`,
      border: `1px solid ${theme.palette.divider}`,
      backgroundColor: "transparent",
      color: theme.palette.text.primary,
      boxShadow: "none",
      transition: theme.transitions.create(["background-color", "border-color", "color"]),

      "&:hover": {
        backgroundColor: alpha(theme.palette.primary.main, 0.06),
        borderColor: alpha(theme.palette.primary.main, 0.4),
        color: theme.palette.primary.main,
      },

      // Микрофон/камера включены: активная кнопка в акценте темы
      "&[aria-pressed='true'], &[data-lk-active='true'], &.lk-button-active": {
        backgroundColor: alpha(theme.palette.primary.main, 0.12),
        borderColor: alpha(theme.palette.primary.main, 0.4),
        color: theme.palette.primary.main,

        "&:hover": {
          backgroundColor: alpha(theme.palette.primary.main, 0.2),
        },
      },

      "&:disabled": {
        opacity: 0.5,
      },
    },

    // Демонстрация экрана включена — акцентная (залитая) кнопка, как contained в MUI
    "& .lk-button[data-lk-source='screen_share'][data-lk-enabled='true']": {
      backgroundColor: theme.palette.primary.main,
      borderColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,

      "&:hover": {
        backgroundColor: theme.palette.primary.dark,
        borderColor: theme.palette.primary.dark,
        color: theme.palette.primary.contrastText,
      },
    },

    // Группы «кнопка + меню устройств»: рамка общая, внутренние радиусы прямые
    // (шеврон живёт в обёртке .lk-button-group-menu, а не рядом с кнопкой)
    "& .lk-button-group > .lk-button:first-of-type": {
      borderTopRightRadius: 0,
      borderBottomRightRadius: 0,
    },

    "& .lk-button-group .lk-button-group-menu > .lk-button": {
      borderTopLeftRadius: 0,
      borderBottomLeftRadius: 0,
      borderLeft: "none",
    },

    // Отключение — outlined error, как «Удалить» в панели встречи
    "& .lk-disconnect-button, & .lk-button.lk-disconnect-button": {
      backgroundColor: `${alpha(theme.palette.error.main, 0.06)} !important`,
      borderColor: `${alpha(theme.palette.error.main, 0.5)} !important`,
      color: `${theme.palette.error.main} !important`,

      "&:hover": {
        backgroundColor: `${alpha(theme.palette.error.main, 0.15)} !important`,
        borderColor: `${theme.palette.error.main} !important`,
        color: `${theme.palette.error.dark} !important`,
      },
    },

    // Меню выбора устройств
    "& .lk-device-menu": {
      minWidth: 200,
      padding: theme.spacing(0.5),
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.borderRadius * 2}px`,
      boxShadow: theme.shadows[8],
    },

    "& .lk-device-menu-heading": {
      padding: theme.spacing(0.5, 1),
      color: theme.palette.text.secondary,
      fontWeight: theme.typography.fontWeightMedium,
      opacity: 1,
    },

    "& .lk-media-device-select li > .lk-button": {
      width: "100%",
      justifyContent: "flex-start",
      paddingBlock: theme.spacing(0.5),
      fontWeight: theme.typography.fontWeightRegular,
    },

    "& .lk-media-device-select [data-lk-active='true'] > .lk-button": {
      backgroundColor: alpha(theme.palette.primary.main, 0.12),
      color: theme.palette.primary.main,
      fontWeight: theme.typography.fontWeightMedium,
    },

    // Подложка-заглушка LiveKit не должна светлым пятном ложиться на тёмную плитку
    "& .lk-participant-placeholder": {
      backgroundColor: "transparent",
    },

    "& .lk-toast": {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
      borderRadius: `${theme.shape.borderRadius * 2}px`,
      color: theme.palette.text.primary,
      boxShadow: theme.shadows[4],
    },
  },
});
