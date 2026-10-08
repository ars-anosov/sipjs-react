import ky from "ky";
import { REST_AUTH_EXPIRE_TIME_KEY, REST_LOGIN_KEY, REST_URI_AUTH_KEY, REST_URI_PHP_AUTH_KEY } from "../constants/storage";

const REST_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const REST_REQUEST_TIMEOUT_MS = 5000;

// REST-сессия и адрес сервиса авторизации живут только здесь: actions вызывают
// доменный API, configureStore и store/preloadedState.js — геттеры, компоненты —
// getStoredRestLogin.

function getStoredRestAuthUri() {
  return localStorage.getItem(REST_URI_AUTH_KEY) || "";
}

function getStoredRestLogin() {
  return localStorage.getItem(REST_LOGIN_KEY) || "";
}

function getStoredRestPhpAuthUri() {
  return localStorage.getItem(REST_URI_PHP_AUTH_KEY) || "";
}

// Идентификатор PHP-сессии ищем в cookie вручную: он уходит параметром запроса
// (PHPSESSID), а не заголовком Cookie — тот браузер поставит сам и только своему origin.
function getPhpSessId() {
  const match = document.cookie.match(/(?:^|;\s*)PHPSESSID=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function storeRestAuthUri(uriRestAuth) {
  localStorage.setItem(REST_URI_AUTH_KEY, uriRestAuth);
}

function persistRestAuthSession({ login }) {
  localStorage.setItem(REST_LOGIN_KEY, login);
  localStorage.setItem(REST_AUTH_EXPIRE_TIME_KEY, String(Date.now() + REST_SESSION_TTL_MS));
}

function clearRestAuthSession() {
  localStorage.removeItem(REST_AUTH_EXPIRE_TIME_KEY);
}

function isRestAuthSessionExpired() {
  const raw = localStorage.getItem(REST_AUTH_EXPIRE_TIME_KEY);
  if (!raw) return false;

  const expireTime = Number(raw);
  return Number.isFinite(expireTime) && Date.now() > expireTime;
}

// Адрес сохраняем до запроса, сессию — только после успеха.
async function loginRest({ login, password, uriRestAuth }) {
  storeRestAuthUri(uriRestAuth);

  const responseData = await ky
    .post(uriRestAuth, {
      json: { login, password },
      timeout: REST_REQUEST_TIMEOUT_MS,
    })
    .json();

  persistRestAuthSession({ login });

  return responseData;
}

// Пробивка живой PHP-сессии: GET uriRestPhpAuth?PHPSESSID=<cookie>. Успех — тот же JSON,
// что у REST-входа; без PHPSESSID в cookie пробивать нечего, поэтому запроса нет.
async function probeRestPhpSession(uriRestPhpAuth) {
  const phpSessId = getPhpSessId();

  if (!phpSessId) {
    throw new Error("В cookie нет PHPSESSID");
  }

  return await ky
    .get(uriRestPhpAuth, {
      searchParams: { PHPSESSID: phpSessId },
      timeout: REST_REQUEST_TIMEOUT_MS,
    })
    .json();
}

export { clearRestAuthSession, getStoredRestAuthUri, getStoredRestLogin, getStoredRestPhpAuthUri, isRestAuthSessionExpired, loginRest, probeRestPhpSession };
