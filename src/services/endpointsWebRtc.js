import { Web } from "sip.js";

// ============================================================
// WebRTC endpoints
// ============================================================
// sipDomain (AOR) и транспорт — разные вещи: домен берётся из domainWebRtc, а
// WebSocket может подключаться к любому эндпоинту из списка. Список задаётся
// явно (JSON-массив или строка через запятую); без него используется
// DEFAULT_ENDPOINT_WEBRTC.

const DEFAULT_ENDPOINT_WEBRTC = "wss://sbc.pecom.ru:9443";
const WSS_PROTOCOLS = new Set(["wss:", "ws:"]);

const normalizeEndpointWebRtc = (value) => {
  if (typeof value !== "string") return "";

  const trimmed = value.trim();
  if (!trimmed) return "";

  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `wss://${trimmed}`;

  let url;
  try {
    url = new URL(candidate);
  } catch {
    return "";
  }

  if (!WSS_PROTOCOLS.has(url.protocol) || !url.hostname) return "";

  const pathname = url.pathname === "/" ? "" : url.pathname;
  return `${url.protocol}//${url.host}${pathname}${url.search}`;
};

const normalizeEndpointWebRtcList = (items) => {
  const seen = new Set();

  return items.map(normalizeEndpointWebRtc).filter((endpoint) => {
    if (!endpoint || seen.has(endpoint)) return false;
    seen.add(endpoint);
    return true;
  });
};

const parseEndpointsWebRtc = (value) => {
  if (Array.isArray(value)) {
    return normalizeEndpointWebRtcList(value);
  }

  if (typeof value !== "string") {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return normalizeEndpointWebRtcList(parsed);
      }
    } catch {
      // Ниже попробуем разобрать как список через разделители.
    }
  }

  return normalizeEndpointWebRtcList(trimmed.split(/[\s,;]+/));
};

// Явный список приоритетнее; пустой или некорректный — дефолтный эндпоинт.
const resolveEndpointsWebRtc = (endpointsWebRtc) => {
  const configured = parseEndpointsWebRtc(endpointsWebRtc);
  return configured.length > 0 ? configured : [DEFAULT_ENDPOINT_WEBRTC];
};

// ============================================================
// WebRTC transport с перебором эндпоинтов
// ============================================================

const pickRandomEndpointIndex = (count, random = Math.random) => {
  if (!Number.isInteger(count) || count <= 1) return 0;

  const value = typeof random === "function" ? random() : Math.random();
  const index = Number.isFinite(value) ? Math.floor(value * count) : 0;

  return index >= 0 && index < count ? index : 0;
};

// Стартовый эндпоинт выбирается случайно; при неудаче следующий connect()
// переключается на следующий адрес по списку. Так работают и старт, и
// реконнект sip.js: приложение само решает, сколько попыток сделать.
class EndpointsWebRtcTransport extends Web.Transport {
  constructor(logger, options = {}) {
    const { endpoints: configuredEndpoints, random, ...transportOptions } = options;
    const endpoints = resolveEndpointsWebRtc(configuredEndpoints);
    const endpointIndex = pickRandomEndpointIndex(endpoints.length, random);

    super(logger, {
      ...transportOptions,
      server: endpoints[endpointIndex],
    });

    this.endpoints = endpoints;
    this.endpointIndex = endpointIndex;
    this.previousAttemptFailed = false;
  }

  get endpoint() {
    return this.configuration.server;
  }

  get endpointCount() {
    return this.endpoints.length;
  }

  _connect() {
    if (this.endpoints.length === 0) {
      return Promise.reject(new Error("WebRTC endpoints are not configured."));
    }

    if (this.previousAttemptFailed) {
      this.endpointIndex = (this.endpointIndex + 1) % this.endpoints.length;
      this.previousAttemptFailed = false;
    }

    this.configuration.server = this.endpoints[this.endpointIndex];
    this.logger.log(`Connecting WebRTC endpoint ${this.endpointIndex + 1}/${this.endpoints.length}: ${this.configuration.server}`);

    let connectPromise;
    try {
      connectPromise = super._connect();
    } catch (error) {
      this.previousAttemptFailed = true;
      throw error;
    }

    connectPromise.then(
      () => {
        this.previousAttemptFailed = false;
      },
      () => {
        this.previousAttemptFailed = true;
      },
    );

    return connectPromise;
  }
}

export { DEFAULT_ENDPOINT_WEBRTC, EndpointsWebRtcTransport, normalizeEndpointWebRtc, parseEndpointsWebRtc, pickRandomEndpointIndex, resolveEndpointsWebRtc };
