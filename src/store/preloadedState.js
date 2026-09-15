import { initialState as authControlInitialState } from "../reducers/authControlRdcr";
import { initialState as lkControlInitialState } from "../reducers/lkControlRdcr";
import { initialState as phoneControlInitialState } from "../reducers/phoneControlRdcr";
import { getStoredAdAuthUri } from "../services/adAuth";
import { getStoredLkTokenUri, getStoredLkUri } from "../services/lkToken";
import {
  getStoredCallerUserNum,
  getStoredUriWebRtc,
  getStoredUseIce,
} from "../services/phoneStorage";

// Нормализация сохранённого адреса WebRTC (раньше — в initialState редьюсера).
const parseUriWebRtcValue = (uriWebRtc = "") =>
  typeof uriWebRtc === "string" ? uriWebRtc.trim() : "";

// Сид стора: чтение localStorage живёт в слое стора, а не внутри reducers.
// Срез собирается целиком — combineReducers не мержит частичный preloadedState
// с initialState редьюсера, а подменяет срез как есть.
export default function getPreloadedState() {
  return {
    phoneControlRdcr: {
      ...phoneControlInitialState,
      uriWebRtc: parseUriWebRtcValue(getStoredUriWebRtc()),
      callerUserNum: getStoredCallerUserNum(),
      useIce: getStoredUseIce(),
    },
    authControlRdcr: {
      ...authControlInitialState,
      uriAdAuth: getStoredAdAuthUri(),
    },
    lkControlRdcr: {
      ...lkControlInitialState,
      uriLk: getStoredLkUri(),
      uriLkToken: getStoredLkTokenUri(),
    },
  };
}
