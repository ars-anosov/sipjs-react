import { initialState as authControlInitialState } from "../reducers/authControlRdcr";
import { initialState as lkControlInitialState } from "../reducers/lkControlRdcr";
import { initialState as phoneControlInitialState } from "../reducers/phoneControlRdcr";
import { resolveEndpointsWebRtc } from "../services/endpointsWebRtc";
import { getStoredLkInvites, getStoredLkTokenUri, getStoredLkUri } from "../services/lkToken";
import { getStoredCallerUserNum, getStoredDomainWebRtc, getStoredEndpointsWebRtc, getStoredUseIce } from "../services/phoneStorage";
import { getStoredRestAuthUri, getStoredRestPhpAuthUri } from "../services/restAuth";

// Нормализация сохранённого SIP-домена.
const parseDomainWebRtcValue = (domainWebRtc = "") => (typeof domainWebRtc === "string" ? domainWebRtc.trim() : "");

// Сид стора: чтение localStorage живёт в слое стора, а не внутри reducers.
// Срез собирается целиком — combineReducers не мержит частичный preloadedState
// с initialState редьюсера, а подменяет срез как есть.
export default function getPreloadedState() {
  return {
    phoneControlRdcr: {
      ...phoneControlInitialState,
      domainWebRtc: parseDomainWebRtcValue(getStoredDomainWebRtc()),
      endpointsWebRtc: resolveEndpointsWebRtc(getStoredEndpointsWebRtc()),
      callerUserNum: getStoredCallerUserNum(),
      useIce: getStoredUseIce(),
    },
    authControlRdcr: {
      ...authControlInitialState,
      uriRestAuth: getStoredRestAuthUri(),
      uriRestPhpAuth: getStoredRestPhpAuthUri(),
    },
    lkControlRdcr: {
      ...lkControlInitialState,
      uriLk: getStoredLkUri(),
      uriLkToken: getStoredLkTokenUri(),
      invites: getStoredLkInvites(),
    },
  };
}
