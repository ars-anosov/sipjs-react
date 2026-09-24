# phone — ключевые диаграммы

Сборка — `npm run build` в `dist/` (каталог в git не хранится). Полное описание правил и границ —
`AGENTS.md`; стенд и токены LiveKit — `docs/LIVEKIT.md`. Здесь — только 3 ключевые схемы, без
пересказа всех веток редьюсеров и thunk-ов (они читаются из кода).

## 1. Архитектура

Интерактивная версия — [Архитектура (archify)](archify/sipjs-react-architecture.html).
SIP/WebRTC- и LiveKit-объекты живут вне Redux — в сервисах; store хранит только UI-флаги,
заголовки, списки и настройки подключения.

```mermaid
flowchart LR
  subgraph UI["UI — компоненты"]
    ViewAuth["AuthLinks · AuthAd<br/>формы AD"]
    ViewPhone["PhoneReg · PhonePad<br/>регистрация · звонки · чат"]
    ViewLk["LkMeet · LkToken<br/>комната · приглашение"]
  end
  subgraph CT["Контейнеры — связь с Redux"]
    CntAuth["AuthContainer<br/>мост AUTHCTL_ ↔ PHONECTL_"]
    CntPhone["PhoneContainer<br/>URL → PHONECTL_"]
    CntLk["LkContainer<br/>приглашение → чат"]
  end
  subgraph RX["Redux — actions и reducers"]
    ActAuth["authControlActions<br/>AUTHCTL_"]
    RdcrAuth["authControlRdcr<br/>состояние AD"]
    ActPhone["phoneControlActions<br/>PHONECTL_"]
    RdcrPhone["phoneControlRdcr<br/>regState · звонки · чат"]
    ActLk["lkControlActions<br/>LKTOKEN_ · LKROOM_ · LK_"]
    RdcrLk["lkControlRdcr<br/>токен · invites"]
  end
  subgraph SV["Сервисы"]
    SvcAd["adAuth<br/>AD-сессия · ky"]
    SvcPhone["Телефонные сервисы<br/>phoneRuntime · phoneStorage"]
    SvcLk["LiveKit-сервисы<br/>lkRuntime · lkToken"]
  end
  subgraph ST["Хранилище"]
    Ls["localStorage<br/>ключи приложения"]
  end
  ViewAuth -->|события| CntAuth
  CntAuth -->|dispatch| ActAuth
  ActAuth -->|доменный API| SvcAd
  SvcAd -->|ky · POST| AdRes["AD-сервис<br/>uriAdAuth · uriAdPhpAuth"]
  ActAuth -->|состояние AD| RdcrAuth
  RdcrAuth -->|useSelector| CntAuth
  SvcAd -->|ключи AD| Ls
  ViewPhone -->|события| CntPhone
  CntPhone -->|dispatch| ActPhone
  ActPhone -->|доменный API| SvcPhone
  SvcPhone -->|WSS · WebRTC| SipExt["SIP SBC<br/>WSS · WebRTC"]
  ActPhone -->|regState · звонки| RdcrPhone
  RdcrPhone -->|useSelector| CntPhone
  SvcPhone -->|настройки · звонки · чат| Ls
  ViewLk -->|события| CntLk
  CntLk -->|dispatch| ActLk
  ActLk -->|доменный API| SvcLk
  SvcLk -->|WebRTC · треки| LkExt["LiveKit SFU<br/>комната · треки"]
  ActLk -->|токен · invites| RdcrLk
  RdcrLk -->|useSelector| CntLk
  CntAuth -->|мост: handleClkRegister| ActPhone
  CntPhone -->|мост: displayControl| ActLk
```

- Пунктирные области — слои: UI, контейнеры (связь со store), Redux (`actions` и `reducers`),
  сервисы и хранилище; `AD-сервис`, `SIP SBC` и `LiveKit SFU` — внешние блоки вне слоёв.
- Срезы `AUTHCTL_`, `PHONECTL_` и `LKTOKEN_`/`LKROOM_`/`LK_` идут строками (суффикс в подписях
  узлов): состояние каждого — свой редьюсер (`authControlRdcr`, `phoneControlRdcr`,
  `lkControlRdcr`), а переход между срезами есть только в контейнерах: `AuthContainer`
  (`AUTHCTL_` ↔ `PHONECTL_`, URL `lk_token` → `LK_`), `PhoneContainer` (кнопка LiveKit →
  `lkControlRdcr.displayControl`), `LkContainer` (приглашение → SIP MESSAGE через `PHONECTL_`).
- У каждого среза свой сервис и внешний ресурс: `AUTHCTL_` → `adAuth` → AD-сервис (`ky`),
  `PHONECTL_` → `phoneRuntime` → SIP SBC (`WSS`), `LK_` → `lkRuntime`/`lkToken` → LiveKit SFU;
  ключи всех трёх срезов лежат в `localStorage` (`adAuth`, `phoneStorage`, `lkToken`), а сид в
  store собирает `store/preloadedState.js`.

## 2. SIP регистрация

```mermaid
sequenceDiagram
  actor User
  participant PhoneReg
  participant Action as phoneControlActions
  participant LS as localStorage
  participant Runtime as phoneRuntime (sip.js)
  participant Rdcr as phoneControlRdcr

  User->>PhoneReg: submit(uriWebRtc, num, pass)
  PhoneReg->>Action: handleClkRegister
  Action->>LS: uriWebRtc · callerUserNum
  Action->>Runtime: registerSipUserAgent(handlers)
  Runtime->>Action: onConnectRequest
  Action->>Rdcr: PHONECTL_CONNECT_REQUEST (regState=off)
  Runtime->>Runtime: UserAgent.start() → Registerer.register()
  alt accept
    Runtime->>Action: onConnectSuccess
    Action->>Rdcr: PHONECTL_CONNECT_SUCCESS (regState=ok)
  else reject / disconnect
    Runtime->>Action: onConnectError
    Action->>Rdcr: PHONECTL_CONNECT_ERROR (regState=fail)
    Runtime->>Runtime: reconnect (до лимита попыток)
  end
  User->>PhoneReg: unregister
  Action->>Runtime: unregisterSip()
  Action->>Rdcr: PHONECTL_UNREGISTER (regState не трогает)
```

Звонки, DTMF, hold и чат — те же три звена (`Action → phoneRuntime → PHONECTL_*`), сценарии в
`src/actions/phoneControlActions.js`, состояния runtime — в `src/services/phoneRuntime.js`.
Настройки подключения `uriWebRtc` и `callerUserNum` пишет `phoneStorage` при `handleClkRegister`;
`useIce` только читается (`getStoredUseIce`, без ключа — `true`), сид среза `phoneControlRdcr`
собирает `store/preloadedState.js`.

## 3. LiveKit комнаты

```mermaid
sequenceDiagram
  actor User
  participant LkMeet
  participant Action as lkControlActions
  participant LS as localStorage
  participant Token as lkToken (POST /user/lk)
  participant Runtime as lkRuntime (livekit-client)
  participant Rdcr as lkControlRdcr

  Note over User,Rdcr: своя комната/приглашение требуют regState=ok (номер — callerUserNum)
  User->>LkMeet: «Создать» / «Пригласить»
  LkMeet->>Action: handleLkRoomCreate / handleLkTokenSubmit
  Action->>LS: uriLkToken
  Action->>Token: requestLkToken(num, room)
  Token-->>Action: jwt (exp, room)
  Action->>LS: lkInvites: num · room · token
  Action->>Rdcr: LKROOM_CREATE_* / LKTOKEN_SUBMIT_SUCCESS (invites)
  Note over Action: приглашение уходит SIP MESSAGE через мост LkContainer → PHONECTL_
  User->>LkMeet: открыть #/?lk_room&lk_token
  LkMeet->>Runtime: getLiveKitRoom().connect(url, token)
  Runtime-->>LkMeet: треки участников (@livekit/components-react)
```

Эндпоинт выдачи токена `uriLkToken` и список приглашений `localStorage.lkInvites` (лимит
`LK_MAX_INVITES`) пишет `lkToken`; сид в срез — через `store/preloadedState.js`. Стенд (OpenVidu),
готовый токен и грабли проверки — `docs/LIVEKIT.md`.
