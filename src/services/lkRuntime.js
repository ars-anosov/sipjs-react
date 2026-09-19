import { Room, Track } from "livekit-client";

let room = null;

// Захват демонстрации экрана — 2K. Опции `screenShareCaptureDefaults` в `livekit-client`
// нет, поэтому их передаёт сам тумблер (`TrackToggle captureOptions`), см. `docs/LIVEKIT.md`.
const screenShareCaptureOptions = {
  audio: true,
  selfBrowserSurface: "include",
  resolution: { width: 2560, height: 1440, frameRate: 30 },
};

// Публикация демонстрации — VP9 (SVC): для экранного текста он заметно лучше VP8,
// который библиотека берёт по умолчанию. `backupCodec: true` добавляет дубль VP8
// для клиентов без VP9 (решение regression/multi-codec принимает SFU).
const screenSharePublishOptions = {
  videoCodec: "vp9",
  backupCodec: true,
};

const getLiveKitRoom = () => {
  if (!room) {
    room = new Room({
      adaptiveStream: false,
      dynacast: false,

      // Камера — FullHD и VP8: совместимость и CPU важнее, 2K нужен только показу экрана.
      // Браузер трактует resolution как пожелание (`ideal`), поэтому 2K с камеры
      // потребовал бы отдельного значения 2560×1440
      videoCaptureDefaults: {
        resolution: { width: 1920, height: 1080 },
      },

      publishDefaults: {
        // Битрейт под 1440p: у `VideoPresets.h1440.encoding` всего 5 Мбит/с,
        // на такой полосе Chrome сам поджимает картинку (quality scaler)
        screenShareEncoding: { maxBitrate: 8_000_000, maxFramerate: 30 },
        simulcast: false,
        videoCodec: "vp8",
      },
    });
  }

  return room;
};

export { getLiveKitRoom, screenShareCaptureOptions, screenSharePublishOptions, Track };
