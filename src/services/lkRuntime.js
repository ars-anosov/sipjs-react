import { Room, Track, VideoPresets } from "livekit-client";

let room = null;

const getLiveKitRoom = () => {
  if (!room) {
    room = new Room({
      adaptiveStream: false,
      dynacast: false,

      videoCaptureDefaults: {
        resolution: { width: 1920, height: 1080 },
      },

      screenShareCaptureDefaults: {
        resolution: {
          width: 2560,
          height: 1440,
          frameRate: 30,
        },
      },

      publishDefaults: {
        screenShareEncoding: VideoPresets.h1440.encoding,
        simulcast: false,
        videoCodec: "vp8",
        backupCodec: "h264",
      },
    });
  }

  return room;
};

export { getLiveKitRoom, Track, VideoPresets };
