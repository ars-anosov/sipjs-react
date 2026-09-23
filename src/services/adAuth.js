import ky from "ky";
import { AD_AUTH_EXPIRE_TIME_KEY, AD_LOGIN_KEY, AD_URI_AUTH_KEY, AD_URI_PHP_AUTH_KEY } from "../constants/storage";

const AD_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const AD_REQUEST_TIMEOUT_MS = 5000;

// AD-сессия и адрес сервиса авторизации живут только здесь: actions вызывают
// доменный API, configureStore и store/preloadedState.js — геттеры, компоненты —
// getStoredAdLogin.

function getStoredAdAuthUri() {
  return localStorage.getItem(AD_URI_AUTH_KEY) || "";
}

function getStoredAdLogin() {
  return localStorage.getItem(AD_LOGIN_KEY) || "";
}

function getStoredAdPhpAuthUri() {
  return localStorage.getItem(AD_URI_PHP_AUTH_KEY) || "";
}

// Идентификатор PHP-сессии ищем в cookie вручную: он уходит параметром запроса
// (PHPSESSID), а не заголовком Cookie — тот браузер поставит сам и только своему origin.
function getPhpSessId() {
  const match = document.cookie.match(/(?:^|;\s*)PHPSESSID=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
}

function storeAdAuthUri(uriAdAuth) {
  localStorage.setItem(AD_URI_AUTH_KEY, uriAdAuth);
}

function persistAdAuthSession({ login }) {
  localStorage.setItem(AD_LOGIN_KEY, login);
  localStorage.setItem(AD_AUTH_EXPIRE_TIME_KEY, String(Date.now() + AD_SESSION_TTL_MS));
}

function clearAdAuthSession() {
  localStorage.removeItem(AD_AUTH_EXPIRE_TIME_KEY);
}

function isAdAuthSessionExpired() {
  const raw = localStorage.getItem(AD_AUTH_EXPIRE_TIME_KEY);
  if (!raw) return false;

  const expireTime = Number(raw);
  return Number.isFinite(expireTime) && Date.now() > expireTime;
}

// Адрес сохраняем до запроса, сессию — только после успеха.
async function loginAd({ login, password, uriAdAuth }) {
  storeAdAuthUri(uriAdAuth);

  const responseData = await ky
    .post(uriAdAuth, {
      json: { login, password },
      timeout: AD_REQUEST_TIMEOUT_MS,
    })
    .json();

  persistAdAuthSession({ login });

  return responseData;
}

// Пробивка живой PHP-сессии: GET uriAdPhpAuth?PHPSESSID=<cookie>. Успех — тот же JSON,
// что у AD-входа; без PHPSESSID в cookie пробивать нечего, поэтому запроса нет.
async function probeAdPhpSession(uriAdPhpAuth) {
  const phpSessId = getPhpSessId();

  if (!phpSessId) {
    throw new Error("В cookie нет PHPSESSID");
  }

  return await ky
    .get(uriAdPhpAuth, {
      searchParams: { PHPSESSID: phpSessId },
      timeout: AD_REQUEST_TIMEOUT_MS,
    })
    .json();
}

export { clearAdAuthSession, getStoredAdAuthUri, getStoredAdLogin, getStoredAdPhpAuthUri, isAdAuthSessionExpired, loginAd, probeAdPhpSession };
