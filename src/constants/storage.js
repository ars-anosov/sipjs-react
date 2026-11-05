export const CHAT_STORAGE_KEY = "sipMessages";
export const CHAT_MAX_MESSAGES = 50;

export const CALLS_STORAGE_KEY = "sipCalls";
export const CALLS_MAX_CALLS = 50;

export const REST_URI_AUTH_KEY = "uriRestAuth";
// Адрес PHP-пробивки: GET uriRestPhpAuth?PHPSESSID=<cookie> вместо формы AuthRest
export const REST_URI_PHP_AUTH_KEY = "uriRestPhpAuth";
export const REST_LOGIN_KEY = "restLogin";

export const PHONE_DOMAIN_WEBRTC_KEY = "domainWebRtc";
// Список WebRTC-эндпоинтов (JSON-массив или строка через запятую).
// Пусто — используется DEFAULT_ENDPOINT_WEBRTC.
export const PHONE_ENDPOINTS_WEBRTC_KEY = "endpointsWebRtc";
export const PHONE_CALLER_USER_NUM_KEY = "callerUserNum";
export const PHONE_USE_ICE_KEY = "useIce";
export const PHONE_URI_DIR_KEY = "uriPhoneDir";

export const LK_URI_KEY = "uriLk";
export const LK_URI_TOKEN_KEY = "uriLkToken";
// Список приглашений в свою комнату: в localStorage одно актуальное приглашение на номер
export const LK_INVITES_KEY = "lkInvites";
export const LK_MAX_INVITES = 20;
