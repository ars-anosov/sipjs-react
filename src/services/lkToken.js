import ky from "ky";
import { LK_URI_KEY, LK_URI_TOKEN_KEY } from "../constants/storage";

// LiveKit: конфиг (uriLk — адрес сервера, uriLkToken — эндпоинт выдачи токена)
// и запрос токена. Хранилище и HTTP не выходят за пределы сервиса.

function getStoredLkUri() {
  return localStorage.getItem(LK_URI_KEY) || "";
}

function getStoredLkTokenUri() {
  return localStorage.getItem(LK_URI_TOKEN_KEY) || "";
}

function storeLkTokenUri(uriLkToken) {
  localStorage.setItem(LK_URI_TOKEN_KEY, uriLkToken);
}

async function requestLkToken({ num, room, uriLkToken }) {
  return ky.post(uriLkToken, { json: { num, room } }).json();
}

export { getStoredLkTokenUri, getStoredLkUri, requestLkToken, storeLkTokenUri };
