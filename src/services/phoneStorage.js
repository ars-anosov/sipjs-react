import {
  CALLS_MAX_CALLS,
  CALLS_STORAGE_KEY,
  CHAT_MAX_MESSAGES,
  CHAT_STORAGE_KEY,
} from "../constants/storage";

// ============================================================
// Call Log Persistence
// ============================================================

const normalizeCallLog = (calllog = {}) => {
  if (!calllog || typeof calllog !== "object" || Array.isArray(calllog)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(calllog).map(([callId, callRecord]) => {
      const normalizedRecord = {
        ...callRecord,
        id: callId,
        read: typeof callRecord.read === "boolean" ? callRecord.read : true,
      };

      return [callId, normalizedRecord];
    }),
  );
};

const logCall = (session, callState, direction) => {
  const log = {
    id: session.id,
    clid: session.displayName,
    uri:
      session.remoteIdentity.uri.raw.user +
      (session.remoteIdentity.displayName
        ? ` "${session.remoteIdentity.displayName}"`
        : ""),
    time: Date.now(),
  };
  const calllog = normalizeCallLog(
    JSON.parse(localStorage.getItem(CALLS_STORAGE_KEY)),
  );

  if (!Object.hasOwn(calllog, session.id)) {
    calllog[log.id] = {
      id: log.id,
      clid: log.clid,
      uri: log.uri,
      start: log.time,
      flow: direction,
      read: true,
    };
  }

  if (callState === "complete") {
    const stop = log.time;
    const start = calllog[log.id].start ?? stop;

    calllog[log.id].stop = stop;
    calllog[log.id].duration = Math.max(0, stop - start);
  }

  if (callState === "complete" && calllog[log.id].callState === "ringing") {
    calllog[log.id].callState = "lost";
    calllog[log.id].read = false;
  } else {
    calllog[log.id].callState = callState;
    if (callState === "incall" || callState === "complete") {
      calllog[log.id].read = true;
    }
  }

  localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calllog));
};

const loadCallsArr = () => {
  const calllog = normalizeCallLog(
    JSON.parse(localStorage.getItem(CALLS_STORAGE_KEY)),
  );
  const rows = Object.values(calllog);

  // Удаляю первую строчку лога (самую старую)
  if (rows.length > CALLS_MAX_CALLS) {
    delete calllog[rows[0].id];
    localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calllog));
  }

  rows.sort((a, b) => (a.start > b.start ? -1 : 1));
  return rows;
};

const markCallsRead = () => {
  const calllog = normalizeCallLog(
    JSON.parse(localStorage.getItem(CALLS_STORAGE_KEY)),
  );
  const rows = Object.values(calllog);

  if (rows.length > 0) {
    Object.values(calllog).forEach((callRecord) => {
      callRecord.read = true;
    });

    localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(calllog));
  }

  rows.sort((a, b) => (a.start > b.start ? -1 : 1));
  return rows.map((row) => ({ ...row, read: true }));
};

const saveCallsArr = (callsArr = []) => {
  const storageObject = (callsArr || []).reduce((accumulator, row) => {
    accumulator[row.id] = row;
    return accumulator;
  }, {});

  localStorage.setItem(CALLS_STORAGE_KEY, JSON.stringify(storageObject));
};

const clearCallsArr = () => {
  localStorage.removeItem(CALLS_STORAGE_KEY);
  return [];
};

// ============================================================
// Chat Persistence
// ============================================================

const loadChatMessages = () => {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY));
  if (!stored) return [];

  const rows = Object.values(stored);
  rows.sort((a, b) => a.time - b.time);
  return rows.slice(-CHAT_MAX_MESSAGES);
};

const saveChatMessage = (message) => {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
  stored[message.id] = message;

  const rows = Object.values(stored).sort((a, b) => a.time - b.time);
  if (rows.length > CHAT_MAX_MESSAGES) {
    rows.slice(0, rows.length - CHAT_MAX_MESSAGES).forEach((row) => {
      delete stored[row.id];
    });
  }

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
  return Object.values(stored).sort((a, b) => a.time - b.time);
};

const clearChatMessages = () => {
  localStorage.removeItem(CHAT_STORAGE_KEY);
  return [];
};

const updateChatMessageStatus = (messageId, status, statusCode, statusText) => {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
  if (!stored[messageId]) return loadChatMessages();

  stored[messageId] = {
    ...stored[messageId],
    status,
    statusCode: statusCode ?? null,
    statusText: statusText ?? null,
  };

  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(stored));
  return Object.values(stored).sort((a, b) => a.time - b.time);
};

const getChatMessageStatus = (messageId) => {
  const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY)) || {};
  return stored[messageId]?.status;
};

export {
  clearCallsArr,
  clearChatMessages,
  getChatMessageStatus,
  loadCallsArr,
  loadChatMessages,
  logCall,
  markCallsRead,
  saveCallsArr,
  saveChatMessage,
  updateChatMessageStatus,
};
