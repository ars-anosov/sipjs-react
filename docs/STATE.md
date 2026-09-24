# phone — ключевые диаграммы

Сборка — `npm run build` в `dist/` (каталог в git не хранится). Полное описание правил и границ —
`AGENTS.md`; стенд и токены LiveKit — `docs/LIVEKIT.md`. Здесь — только 4 ключевые схемы, без
пересказа всех веток редьюсеров и thunk-ов (они читаются из кода).

## 1. Слои: UI / store / сервисы

SIP/WebRTC- и LiveKit-объекты живут вне Redux — в сервисах. Store хранит только UI-флаги,
заголовки, списки и настройки подключения.

```mermaid
flowchart LR
  UI[Components/Containers]
  ACT[actions/*]
  RDCR[reducers/*]
  SVC[services/*<br/>phoneRuntime · lkRuntime · adAuth · lkToken]
  EXT[sip.js / livekit-client]

  UI -->|dispatch thunk| ACT
  ACT -->|PHONECTL_* / AUTHCTL_* / LK_*| RDCR
  ACT -->|вызов сценария| SVC
  SVC -->|handlers.* колбэк| ACT
  SVC --> EXT
  RDCR -->|props| UI
```

## 2. Мост auth → сервисы

Thunk-и своего namespace не диспатчат чужой (`AUTHCTL_` ⇏ `PHONECTL_` и наоборот). Единственный
мост — `AuthContainer`: слушает оба среза и вручную вызывает actions другого домена.

```mermaid
flowchart LR
  AuthAd[AuthAd] -->|handleAdRegister| AuthAct[authControlActions]
  AuthAct -->|AUTHCTL_SUBMIT_SUCCESS| AuthRdcr[authControlRdcr]
  AuthRdcr -->|responseData: sip_username/secret| Bridge[AuthContainer — мост]
  Bridge -->|handleClkRegister| PhoneAct[phoneControlActions]
  PhoneAct -->|PHONECTL_CONNECT_*<br/>regState| PhoneRdcr[phoneControlRdcr]
  PhoneRdcr -->|regState=ok, тумблер AuthPad| Bridge
  Bridge -->|URL lk_token| LkAct[lkControlActions]
```

`regState` (`off`/`ok`/`fail`) — единственный флаг SIP-регистрации, отражается трёхпозиционным
тумблером `AuthPad`. Подробности переходов и владения рендером — в коде `AuthContainer.jsx` и
`AGENTS.md`.

## 3. Сервис sip.js: регистрация и store

```mermaid
sequenceDiagram
  actor User
  participant PhoneReg
  participant Action as phoneControlActions
  participant Runtime as phoneRuntime (sip.js)
  participant Rdcr as phoneControlRdcr

  User->>PhoneReg: submit(uriWebRtc, num, pass)
  PhoneReg->>Action: handleClkRegister
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

## 4. Сервис LiveKit: комнаты и store

```mermaid
sequenceDiagram
  actor User
  participant LkMeet
  participant Action as lkControlActions
  participant Token as lkToken (POST /user/lk)
  participant Runtime as lkRuntime (livekit-client)
  participant Rdcr as lkControlRdcr

  Note over User,Rdcr: своя комната/приглашение требуют regState=ok (номер — callerUserNum)
  User->>LkMeet: «Создать» / «Пригласить»
  LkMeet->>Action: handleLkRoomCreate / handleLkTokenSubmit
  Action->>Token: requestLkToken(num, room)
  Token-->>Action: jwt (exp, room)
  Action->>Rdcr: LKROOM_CREATE_* / LKTOKEN_SUBMIT_SUCCESS (invites)
  Note over Action: приглашение уходит SIP MESSAGE через мост LkContainer → PHONECTL_
  User->>LkMeet: открыть #/?lk_room&lk_token
  LkMeet->>Runtime: getLiveKitRoom().connect(url, token)
  Runtime-->>LkMeet: треки участников (@livekit/components-react)
```

Список приглашений — `localStorage.lkInvites` (лимит `LK_MAX_INVITES`), сид в срез — через
`store/preloadedState.js`. Стенд (OpenVidu), готовый токен и грабли проверки — `docs/LIVEKIT.md`.
