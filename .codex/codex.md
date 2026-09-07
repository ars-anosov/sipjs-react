# sipjs-react — Codex

WebRTC-телефон: SPA на sip.js и LiveKit. Канон — `CLAUDE.md`.
Документация и комментарии — на русском.

**Код:** `phone/src/`  
**Mock:** `phone/mock/`  
**Сборка:** `npm run build` → `phone/dist` (не править вручную)

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
- reducers / actions: `phoneControl`, `authControl`, `lkControl` (`*Rdcr` / `*Actions`)
- объекты sip.js — в `phoneRuntime.js`, не в store
- HTTP: `ky` + `actions/utils/kyError.js`

## Правила

- минимальный diff
- без новых зависимостей, TS, тестов и CI без явного запроса
