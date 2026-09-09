# sipjs-react

WebRTC-телефон: SPA на sip.js и LiveKit. Канон — `CLAUDE.md`.

## Где код

- исходники: `src/`
- mock API: `mock/`
- сборка: `npm run build` → `dist` (не править вручную)

## Компоненты

- `PhoneReg` — SIP-регистрация
- `PhonePad` — набор номера и звонки
- `PhoneChat` — SIP-чат
- `AuthAd` — AD-авторизация
- `LkMeet` — видеовстреча LiveKit

Контейнеры: `PhoneContainer`, `LkContainer`, `MenuAppContainer`.

## Стек

React 19, Vite 8, MUI 9, Redux 5 + thunk, sip.js, livekit-client, ky.
JavaScript — без TypeScript. Отступ — 2 пробела.

## Redux

- types: `constants/redux.js` (`PHONECTL_`, `AUTHCTL_`, `LKTOKEN_` / `LK_`)
- reducers: `phoneControlRdcr`, `authControlRdcr`, `lkControlRdcr`
- actions: `*Actions`; объекты sip.js — в `phoneRuntime.js`, не в store
- HTTP: `ky` + `actions/utils/kyError.js`

## Правила

- минимальный diff
- без новых зависимостей, TS, тестов и CI без явного запроса
- ответы и комментарии — на русском
