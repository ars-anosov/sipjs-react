import ky from "ky";
import { LK_INVITES_KEY, LK_MAX_INVITES, LK_URI_KEY, LK_URI_TOKEN_KEY } from "../constants/storage";

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

// Срок действия токена: claim `exp` читаем из самого JWT (base64url-пейлоад), без библиотек.
// Возвращаем миллисекунды или null — если токена/поля нет или он битый.
function getLkTokenExpiresAt(token) {
  if (typeof token !== "string") return null;

  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const claims = JSON.parse(atob(padded));

    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

// Список приглашений в свою комнату. В localStorage — объект по номеру приглашённого:
// на номер хранится одно актуальное приглашение (повторное вытесняет прежнее), запись —
// { num, room, token, expiresAt, createdAt }. Лимит LK_MAX_INVITES отсекает самые старые.
const readLkInvitesMap = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(LK_INVITES_KEY));
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) return {};

    return stored;
  } catch {
    return {};
  }
};

const normalizeLkInvitesMap = (stored) =>
  Object.fromEntries(
    Object.entries(stored)
      .map(([key, raw]) => {
        const num = typeof raw?.num === "string" && raw.num ? raw.num : key;
        const room = typeof raw?.room === "string" ? raw.room : "";
        const token = typeof raw?.token === "string" ? raw.token : "";
        const expiresAt = typeof raw?.expiresAt === "number" ? raw.expiresAt : null;
        const createdAt = typeof raw?.createdAt === "number" ? raw.createdAt : 0;

        return num && token ? [num, { num, room, token, expiresAt, createdAt }] : null;
      })
      .filter(Boolean),
  );

// Новые сверху: последнее приглашение видно в панели первым
const sortLkInvites = (invitesMap) => Object.values(invitesMap).sort((a, b) => b.createdAt - a.createdAt);

const writeLkInvitesMap = (invitesMap) => {
  sortLkInvites(invitesMap)
    .slice(LK_MAX_INVITES)
    .forEach((invite) => {
      delete invitesMap[invite.num];
    });

  localStorage.setItem(LK_INVITES_KEY, JSON.stringify(invitesMap));
  return sortLkInvites(invitesMap);
};

const getStoredLkInvites = () => sortLkInvites(normalizeLkInvitesMap(readLkInvitesMap()));

const storeLkInvite = (invite) => {
  const invitesMap = normalizeLkInvitesMap(readLkInvitesMap());
  if (invite?.num && invite?.token) invitesMap[invite.num] = invite;

  return writeLkInvitesMap(invitesMap);
};

const removeStoredLkInvite = (num) => {
  const invitesMap = normalizeLkInvitesMap(readLkInvitesMap());
  delete invitesMap[num];

  return writeLkInvitesMap(invitesMap);
};

export { getLkTokenExpiresAt, getStoredLkInvites, getStoredLkTokenUri, getStoredLkUri, removeStoredLkInvite, requestLkToken, storeLkInvite, storeLkTokenUri };
