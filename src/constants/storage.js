export const CHAT_STORAGE_KEY = "sipMessages";
export const CHAT_MAX_MESSAGES = 50;

export const CALLS_STORAGE_KEY = "sipCalls";
export const CALLS_MAX_CALLS = 50;

export const AD_URI_AUTH_KEY = "uriAdAuth";
// Адрес PHP-пробивки: GET uriAdPhpAuth?PHPSESSID=<cookie> вместо формы AuthAd
export const AD_URI_PHP_AUTH_KEY = "uriAdPhpAuth";
export const AD_LOGIN_KEY = "adLogin";
export const AD_AUTH_EXPIRE_TIME_KEY = "adAuthExpireTime";

export const PHONE_URI_WEBRTC_KEY = "uriWebRtc";
export const PHONE_CALLER_USER_NUM_KEY = "callerUserNum";
export const PHONE_USE_ICE_KEY = "useIce";
export const PHONE_URI_DIR_KEY = "uriPhoneDir";

export const LK_URI_KEY = "uriLk";
export const LK_URI_TOKEN_KEY = "uriLkToken";
// Список приглашений в свою комнату: в localStorage одно актуальное приглашение на номер
export const LK_INVITES_KEY = "lkInvites";
export const LK_MAX_INVITES = 20;
