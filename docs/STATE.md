# phone
Сборка — `npm run build` в `dist/` (каталог в git не хранится).

## Архитектура состояния

SIP/WebRTC-объекты и медиа живут вне Redux — в сервисах `src/services/`. В store — UI-флаги, заголовки, лог звонков, чат, а также настройки подключения (`uriWebRtc`, `callerUserNum`, `useIce`, `addPrefix`, `calleePrefix`) и введённый SIP-пароль `regUserPass`.

```mermaid
flowchart LR
  UI[Components / Containers]
  ACT[phoneControlActions.js]
  RT[phoneRuntime.js]
  ST[phoneStorage.js]
  RDCR[phoneControlRdcr]
  SIP[sip.js + WebRTC]

  UI -->|dispatch thunks| ACT
  ACT -->|registerSipUserAgent / placeOutgoingCall / ...| RT
  ACT -->|PHONECTL_*| RDCR
  RT -->|handlers.* callbacks| ACT
  RT -->|logCall / saveChatMessage / updateChatMessageStatus / getChatMessageStatus| ST
  ACT -->|loadCallsArr / loadChatMessages / markCallsRead| ST
  RT --> SIP
  RDCR -->|props| UI
```

Слой `src/store/` — единственное место, где стор сходится с сервисами: `preloadedState.js` через геттеры сервисов собирает сид (`uriWebRtc`, `callerUserNum`, `useIce`, `uriAdAuth`, `uriLk`, `uriLkToken`, `invites`) и полные срезы из `initialState` редьюсеров, `configureStore.js` передаёт их в `createStore` как `preloadedState` (thunk + `authTimeoutMiddleware`, в dev ещё `redux-logger`) и инжектит зависимости middleware. `rootReducer.js` — `combineReducers` трёх срезов. Reducers и middleware сервисов не импортируют.

`phoneRuntime` (singleton): `userAgent`, `registerer`, `sessionOptions`, `incomingSession` / `outgoingSession`, audio elements, `remoteStream`. Публичное API — функции сценариев (`registerSipUserAgent`, `placeOutgoingCall`, `answerIncomingCall`, `transmitSipMessage`, `resetSipCall`, `unregisterSip`) и утилиты (`getUriHostFromWebRtc`, `isSipConnected`, `isValidSipTarget`, `sendDtmf`, `setHold`, `createChatMessage`); обратная связь в actions — через колбэки `handlers`.

Смежные сервисы:

- `lkRuntime.js` — LiveKit-комната (singleton, `getLiveKitRoom`).
- `adAuth.js` — AD-вход (`loginAd`), адрес сервиса и срок AD-сессии в `localStorage`.
- `lkToken.js` — конфиг LiveKit, запрос токена (`requestLkToken`), срок его действия (`getLkTokenExpiresAt`: claim `exp` из JWT, base64url-пейлоад без библиотек) и список приглашений в localStorage (`getStoredLkInvites`/`storeLkInvite`/`removeStoredLkInvite`: объект по номеру приглашённого, ключ `lkInvites`, лимит `LK_MAX_INVITES`).
- Стенд встреч (OpenVidu Community — форк LiveKit), токены для проверок и приёмы отладки — `docs/LIVEKIT.md`.
- `phoneDirectory.js` — HTTP телефонного справочника.
- `phoneNotifications.js` — Service Worker / Notifications.
- `phoneStorage.js` — настройки подключения, звонки и чат в `localStorage`.

## Состояние Redux store (`phoneControlRdcr`)

```mermaid
flowchart TD
  Init@{ shape: circle, label: "Initial store" }
  CR[PHONECTL_CONNECT_REQUEST]
  CS[PHONECTL_CONNECT_SUCCESS]
  CE[PHONECTL_CONNECT_ERROR]
  RC[PHONECTL_RECONNECT_TRY]
  UN[PHONECTL_UNREGISTER]
  RS[PHONECTL_CLK_RESET]
  ID[PHONECTL_INCOME_DISPLAY]
  IS[PHONECTL_INCOME_SUBMIT]
  OS[PHONECTL_OUTGO_SUBMIT]
  CL[PHONECTL_CALLLOG_UPD]
  SV[PHONECTL_STORE_VALUE]
  EA[PHONECTL_ERROR_ALERT]
  MA[PHONECTL_MESSAGE_ADD]
  MU[PHONECTL_MESSAGE_UPDATE]
  ML[PHONECTL_MESSAGES_LOAD]
  CU[PHONECTL_CHAT_UNREAD_CLEAR]
  CC[PHONECTL_CLEAR_CHAT]

  Init -->|connectStatus=Request, regState=off, phoneHeader, icoHeader| CR
  CR -->|connectStatus=Success, regState=ok, displayReg=false, displayPad=true, displayHistory/Chat=false| CS
  CR -->|connectStatus=Error, regState=fail, phoneHeader, icoHeader| CE
  CS -->|outgoCallNow из payload, callHoldNow=false, phoneHeader, icoHeader| OS
  CS -->|incomeDisplay=true, calleePhoneNum, phoneHeader, icoHeader| ID
  ID -->|incomeDisplay=false, incomeCallNow=true, callHoldNow=false, phoneHeader, icoHeader| IS
  CS -->|callsArr, callUnread=0 при displayHistory| CL
  CS -->|arbitrary field, e.g. displayHistory/Chat, callHoldNow| SV
  CS -->|chatMessages, chatUnread+1 при incoming и !displayChat| MA
  CS -->|chatMessages, смена статуса доставки| MU
  CS -->|chatMessages из localStorage| ML
  CS -->|chatUnread=0| CU
  CS -->|chatMessages пустой, chatUnread=0| CC
  CE -->|connectStatus=Reconnect| RC
  RC -->|register onAccept| CS
  RC -->|attempts exhausted / reject| CE
  CE -->|errComponent, errText| EA
  EA -->|clear / call end| RS
  IS -->|hangup / Terminated| RS
  OS -->|hangup / Terminated| RS
  RS -->|reset call UI flags, connectStatus пустой, regState сохраняется| CS
  UN -->|connectStatus пустой, regState сохраняется (красный тумблер AuthPad), заголовки «Не зарегистрирован», displayReg=false при payload.registrationLost (потеря регистрации, PhoneReg не форсируем) и true при явной разрегистрации, displayPad/History/Chat=false, счётчики unread=0, флаги звонка=false, calleePhoneNum/errComponent/errText пустые| Init

  classDef initial fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
  classDef success fill:#e8f5e8,stroke:#4caf50,stroke-width:1px
  classDef error fill:#ffebee,stroke:#f44336,stroke-width:1px

  class Init initial
  class CS success
  class CE error
```

## Мост к сервисам (`AuthContainer`)

Thunk-и namespace-чистые: `authControlActions` не диспатчит `PHONECTL_`, `phoneControlActions` — `AUTHCTL_`, `lkControlActions` — `PHONECTL_`. Мосты между срезами живут только в контейнерах: `AuthContainer` — `AUTHCTL_` ↔ `PHONECTL_` (AD-данные → `PhoneReg` и тумблер `AuthPad`) и URL → `LK_` (панель встречи гостю), `PhoneContainer` — URL → `PHONECTL_` (`PhoneReg` гостю) и `PHONECTL_` → `LK_` (кнопка LiveKit в `PhonePad` переключает `lkControlRdcr.displayControl` колбэком `onToggleLk`; для подсветки кнопки контейнер читает из чужого среза только этот флаг), `LkContainer` — `LK_` → `PHONECTL_` (приглашение в комнату пишется в чат); чужой срез thunk-и не читают через `getState()`, а получают нужные значения аргументом (`uriWebRtc` в `handleLkTokenSubmit`, `rdcr` в `handleClkRegister`/`handleSendMessage`/`handleSendInviteMessage`). Остальные контейнеры только раздают срезы пропсами — `LkContainer` → `phoneControlRdcr` для формы приглашения `LkToken`. `AuthPad` рендерится по флагу `displayAuthPad` (строка меню; ✕ снимает флаг): `initialState` — `false`, `true` выставляется на `AUTHCTL_SUBMIT_SUCCESS`, сбрасывается на `AUTHCTL_CLEAR`. Поэтому на старте панели нет, а на экране — стартовый блок `AuthLinks` с иконкой-входом в SIP-форму (иконка AD-формы закомментирована, а сама `AuthAd` рендерится по `displayAd` или `errComponent === "AuthAd"`), поверх которого открыт модальный `PhoneReg` (`displayReg` стартует `true`); после успеха AD панель появляется (при отсутствии AD-данных она информирует текстом). Её тумблер трёхпозиционный и отражает `phoneControlRdcr.regState` (`off` / `ok` — зелёный / `fail` — красный): выключенный тумблер заблокирован без пары `sip_username`/`sip_secret`, клик из `off` запускает регистрацию, из `ok` — разрегистрацию, из `fail` — возвращает в `off`. Потеря регистрации (`regState` → `fail`) дополнительно форсирует `displayAuthPad` — форма `PhoneReg` при этом не появляется, а красный тумблер AuthPad остаётся кликабельным (✕ панель всё равно закрывает: `displayAuthPad` намеренно не в зависимостях эффекта).

Сама `AuthPad` — MUI `Snackbar` с `anchorOrigin` bottom/right: его корень позиционирован `fixed` (24 px от правого и нижнего края, 320 px шириной от `sm`), поэтому в потоке документа панель места не занимает, а после успеха AD экран остаётся пустым до SIP-регистрации. Проп `onClose` у `Snackbar` намеренно не передан: иначе MUI добавил бы закрытие по клику мимо и Escape, а панель закрывает только ✕ (проп `onClose` самой компоненты → `displayAuthPad = false`). `zIndex` опущен до `theme.zIndex.modal - 1`, потому что штатный `zIndex.snackbar` (1400) выше модалок (1300) и панель перекрывала бы открытую из её подвала форму `AuthAd`.

Подвал панели — кнопка состояния AD (`authControlRdcr.status` + `ad_login`, иконки `HowToReg`/`PersonOff`): клик открывает форму `AuthAd` колбэком `onOpenAd` (пишет `displayAd` в `authControlRdcr`).

Подвал `PhonePad` повторяет ту же схему для SIP: кнопка состояния регистрации (`phoneControlRdcr.regState` + `callerUserNum`, иконки `Wifi`/`WifiOff`) — `ok` зелёная с внутренним номером, `fail` красная «Ошибка регистрации», `off` нейтральная «SIP не подключено». Клик открывает форму `PhoneReg` (`displayReg`), поэтому отдельная иконка регистрации из тела панели убрана, а ряд иконок префикс/история/чат сдвинут вправо. Подвал занимает 44 px, и `PANEL_HEIGHT` в `constants/ui.js` поднят с 528 до 572: тело панели по-прежнему укладывается без внутренней прокрутки. По этой же константе выравниваются соседние панели — `PhoneChat`, `PhoneHistory` и `minHeight` у `LkMeet`.

В том же ряду иконок тела крайняя справа — кнопка LiveKit (`VideoCallOutlined`, `aria-label` «Открыть панель LiveKit Встреча»): как история и чат, она работает переключателем и подсвечивается `primary`, когда панель открыта. Сама кнопка ничего не диспатчит — проп `lkActive` (флаг `lkControlRdcr.displayControl`) задаёт цвет, проп `onToggleLk` закрывает панель повторным кликом. Пропы приходят из контейнеров: `PhoneContainer` — для панели в потоке страницы, `MenuAppBar` — для компактного `PhonePad` (`showInput={false}`) в поповере «SIP Кругляш». Без колбэка кнопка не рендерится; подсветка живёт на изменении флага, поэтому закрытие панели её собственным ✕ гасит кнопку.

Владение рендером — по срезу: `AuthContainer` (домен `authControlRdcr`, плюс стартовый блок `AuthLinks` и мост) держит форму `AuthAd` (флаг `displayAd` или `errComponent === "AuthAd"`), `AuthPad` и `AuthLinks`; `PhoneContainer` (домен `phoneControlRdcr`) рендерит форму входа `PhoneReg` (флаг `displayReg` или `errComponent === "PhoneReg"`) и рабочие блоки `PhonePad` / `PhoneHistory` / `PhoneChat`, auth-срез не читает. Обе формы входа — модальный `Dialog` в портале, вне потока документа, поэтому их показ не раздвигает вёрстку; `AuthPad` тоже вне потока — это `Snackbar` (`position: fixed`); чужие срезы читает лишь `AuthContainer` — как мост.

Стартовый экран: пока `authControlRdcr.status !== "success"` и `phoneControlRdcr.regState !== "ok"`, показан блок `AuthLinks` (иконка-вход в SIP-форму; сам ничего не диспатчит — колбэк `AuthContainer` пишет в `phoneControlRdcr`), а поверх него — модальный `PhoneReg`: `initialState.displayReg = true`, поэтому форма открыта сама, а её закрытие оставляет `AuthLinks`. Исключение — гость по ссылке-приглашению (`lk_token` в query маршрута): ему `AuthLinks` не показывают, `LkMeet` открывается сразу (мост URL → LK в `AuthContainer`), а `PhoneReg` не открывается сама (мост URL → PHONECTL в `PhoneContainer`: `displayReg` снимается, но из меню форма по-прежнему доступна). Успех AD → `AuthPad`, успешная SIP-регистрация → телефон (`displayPad` на `PHONECTL_CONNECT_SUCCESS`); заголовок `App` — flex-колонка на высоту экрана, поэтому стартовый блок центрируется между AppBar и футером.

```mermaid
sequenceDiagram
  actor User
  participant AuthAd@{ "type" : "participant", "alias": "AuthAd.jsx" }
  participant AuthPad@{ "type" : "participant", "alias": "AuthPad.jsx" }
  participant AuthAct@{ "type" : "collections", "alias": "authControlActions.js" }
  participant AdAuth@{ "type" : "collections", "alias": "adAuth.js" }
  participant AuthCont@{ "type" : "collections", "alias": "AuthContainer.jsx" }
  participant PhoneAct@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant Dispatch@{ "type" : "collections", "alias": "authControlRdcr / phoneControlRdcr" }

  Note over User,Dispatch: Старт: displayAd=false, displayAuthPad=false, displayReg=true, regState=off
  Note over User,Dispatch: на экране AuthLinks, поверх него — модальный PhoneReg

  User->>AuthAd: Ввод AD-логина и пароля
  AuthAd->>AuthAct: handleAdRegister(formData)
  alt Валидация не прошла или HTTP-ошибка
    AuthAct->>Dispatch: AUTHCTL_SUBMIT_ERROR (errText)
  else Успех
    AuthAct->>Dispatch: AUTHCTL_SUBMIT_REQUEST (responseData=null)
    AuthAct->>AdAuth: loginAd({ login, password, uriAdAuth })
    AdAuth->>AdAuth: POST uriAdAuth, сохранить адрес и AD-сессию
    AdAuth-->>AuthAct: responseData
    AuthAct->>Dispatch: AUTHCTL_SUBMIT_SUCCESS (responseData)
  end
  AuthCont->>Dispatch: PHONECTL_STORE_VALUE (callerUserNum, regUserPass, displayDir)
  Note over AuthCont: displayAuthPad=true на success → рендер AuthPad (тумблер off; при неполном AD-ответе — текст с недостающими полями)
  User->>AuthPad: Клик по тумблеру (off)
  AuthPad->>AuthCont: onToggleReg()
  AuthCont->>PhoneAct: handleClkRegister({callerUserNum: sip_username, regUserPass: sip_secret, uriWebRtc}, phoneControlRdcr)
  PhoneAct->>Dispatch: PHONECTL_CONNECT_REQUEST (regState=off) → SUCCESS (regState=ok) / ERROR (regState=fail)
  Dispatch-->>AuthCont: callerUserNum из PhoneReg
  Note over AuthCont: sync только при callerUserNum и (regState=ok или connectStatus)
  AuthCont->>Dispatch: AUTHCTL_STORE_VALUE (responseData.sip_username)
  User->>AuthPad: Клик по цветному тумблеру (ok)
  AuthPad->>AuthCont: onToggleReg()
  AuthCont->>PhoneAct: handleClkUnregister(phoneControlRdcr)
  PhoneAct->>Dispatch: PHONECTL_UNREGISTER + PHONECTL_STORE_VALUE (regState=off)
```

Отдельно: `AuthContainer` синхронизирует `phoneControlRdcr.callerUserNum` → `authControlRdcr.responseData.sip_username` (используется `AuthAdInfo`), а показ компоненты `LkMeet` переключает `lkControlRdcr.displayControl` — пункт меню «LiveKit Встреча» либо мост URL → LK: по ссылке-приглашению (`lk_token` в query) панель открывается сама. Своя комната и приглашение в `LkMeet` требуют живой SIP-регистрации (`phoneControlRdcr.regState === "ok"`), AD для них не нужен: приглашение уходит SIP MESSAGE, номер комнаты — `callerUserNum` (без регистрации и без `lk_token` в query панель показывает информирующий текст про ссылку-приглашение). Свою комнату (кнопка «Создать») и ссылку-приглашение выдаёт `POST /user/lk`, а результат создания живёт в `createStatus`/`createMessage` среза `lkControlRdcr`. Приглашений может быть несколько, и панель показывает их списком (`lkControlRdcr.invites`): каждое — с той же ссылкой-акцентом с иконкой нового окна, что и в чате (`MEETING_LINK_SX` из `theme.js`), подписью срока действия (`expiresAt` — `exp` из JWT через `getLkTokenExpiresAt`, формат `date-fns` `HH:mm` или `dd.MM HH:mm`) и крестиком (`handleRemoveInvite`: `removeStoredLkInvite` + `LK_STORE_VALUE`). Список живёт в localStorage (`lkInvites`, одно актуальное приглашение на номер, лимит `LK_MAX_INVITES`), в срез попадает сидом из `preloadedState.js`, а `LKTOKEN_SUBMIT_SUCCESS` кладёт в него уже нормализованный сервисом список — панель рисует его только при живой SIP-регистрации (`isOwnRoom`: свой номер из `callerUserNum` совпадает с комнатой), с ограничением высоты и прокруткой, чтобы не выдавливать кнопку подключения. Клик по красному тумблеру (`fail`) разрегистрировать нечего — `AuthContainer` возвращает `regState` в `off` через `phoneControlActions.handleChangeStore`. `regState` живёт в `phoneControlRdcr`: `off` на `PHONECTL_CONNECT_REQUEST`, `ok` на `PHONECTL_CONNECT_SUCCESS`, `fail` на `PHONECTL_CONNECT_ERROR`; `PHONECTL_UNREGISTER` его не трогает (иначе красный гас бы через 3 с вместе с авто-остановом `UserAgent` после неуспешной регистрации), а явная разрегистрация (`handleClkUnregister`) сбрасывает в `off` отдельным `PHONECTL_STORE_VALUE`. Тот же переход в `fail` форсирует `displayAuthPad` (мост `PHONECTL_` → `AUTHCTL_`): при потере регистрации показывается AuthPad с красным тумблером, а не `PhoneReg`; `displayReg=false` для этого случая выставляет редьюсер по `payload.registrationLost`, который подставляет только авто-путь `phoneRuntime` (`onUnregistered` в `handleClkRegister`). `regState` — единственный флаг регистрации в срезе, все проверки «зарегистрирован» — `regState === "ok"` (`isRegistered` в `phoneControlActions`, `isRegistered` в `AuthContainer`).

## SIP регистрация

```mermaid
sequenceDiagram
  actor User
  participant PhoneReg@{ "type" : "participant", "alias": "PhoneReg.jsx" }
  participant Action@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant Runtime@{ "type" : "collections", "alias": "phoneRuntime.js" }
  participant UserAgent@{ "type" : "control" }
  participant Registerer@{ "type" : "control" }
  participant Dispatch@{ "type" : "collections", "alias": "phoneControlRdcr.js" }

  User->>PhoneReg: Fill registration form and submit
  PhoneReg->>Action: handleClkRegister(formData, rdcr)
  alt Поля не заполнены
    Action->>Dispatch: PHONECTL_ERROR_ALERT
  else Valid
    Action->>Action: save uriWebRtc и callerUserNum в phoneStorage
    Action->>Dispatch: PHONECTL_STORE_VALUE (uriWebRtc)
    Action->>Dispatch: PHONECTL_STORE_VALUE (callerUserNum)
    Note over Action: sync sip_username в authControlRdcr делает AuthContainer
    Action->>Runtime: registerSipUserAgent({ formData, handlers })
    Runtime->>Runtime: makeURI (throw on invalid)
    Runtime->>UserAgent: new UserAgent(userAgentOptions)
    Runtime->>Runtime: setPhoneRuntime(userAgent, audio, sessionOptions)
    Runtime->>Registerer: new Registerer(userAgent, sessionOptions)
    Runtime->>Action: handlers.onConnectRequest
    Action->>Dispatch: PHONECTL_CONNECT_REQUEST (regState=off)
    Runtime->>UserAgent: start()
    UserAgent-->>Runtime: onConnect
    Runtime->>Registerer: register()
    Registerer-->>Runtime: onAccept
    Runtime->>Action: handlers.onConnectSuccess
    Action->>Dispatch: PHONECTL_CONNECT_SUCCESS (regState=ok, зелёный тумблер AuthPad)
    Registerer-->>Runtime: onReject / start().catch
    Runtime->>Action: handlers.onConnectError
    Action->>Dispatch: PHONECTL_CONNECT_ERROR (regState=fail, красный тумблер AuthPad)
    Runtime->>Runtime: через 3 с: stopAfterRegistrationFailure()
    Runtime->>Action: handlers.onUnregistered
    Action->>Dispatch: PHONECTL_UNREGISTER (payload.registrationLost=true)
    Note over Dispatch: UNREGISTER не трогает regState и не форсирует PhoneReg (displayReg=false); AuthContainer по regState=fail показывает AuthPad с красным тумблером
    Runtime->>Runtime: resetPhoneRuntime()
  end
  Note over Action: makeURI внутри registerSipUserAgent бросает исключение → catch → PHONECTL_ERROR_ALERT
```

## Восстановление сетевого обрыва / перерегистрация

```mermaid
sequenceDiagram
  participant UserAgent@{ "type" : "control" }
  participant Runtime@{ "type" : "collections", "alias": "phoneRuntime.js" }
  participant Action@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant Registerer@{ "type" : "control" }
  participant Dispatch@{ "type" : "collections", "alias": "phoneControlRdcr.js" }

  UserAgent->>Runtime: onDisconnect(error)
  Runtime->>Runtime: Check suppressReconnectOnNextDisconnect
  alt Not suppressed
    Runtime->>Action: handlers.onConnectError
    Action->>Dispatch: PHONECTL_CONNECT_ERROR (Disconnected, regState=fail)
    alt error && shouldBeConnected
      Runtime->>Runtime: attemptReconnection(1)
      alt reconnectionAttempt <= reconnectionAttempts
        Runtime->>Action: handlers.onReconnectTry
        Action->>Dispatch: PHONECTL_RECONNECT_TRY
        Note over Dispatch: RECONNECT_TRY не трогает regState — красный держится до успеха или клика
        Runtime->>Runtime: setTimeout for delay
        Runtime->>UserAgent: reconnect()
        UserAgent-->>Runtime: reconnect success
        UserAgent-->>Runtime: onConnect
        Runtime->>Registerer: register()
        Registerer-->>Runtime: onAccept
        Runtime->>Action: handlers.onConnectSuccess
        Action->>Dispatch: PHONECTL_CONNECT_SUCCESS (regState=ok)
        Registerer-->>Runtime: onReject
        Runtime->>Action: handlers.onConnectError
        Action->>Dispatch: PHONECTL_CONNECT_ERROR (regState=fail)
      else Attempts exhausted
        Runtime->>Action: handlers.onConnectError
        Action->>Dispatch: PHONECTL_CONNECT_ERROR (Disconnected, regState=fail)
      end
    end
  else Suppressed
    Runtime->>Runtime: Reset suppressReconnectOnNextDisconnect
  end
  Note over Runtime: On reconnect failure, increment attempt and retry
  Note over Registerer: Unregistered while shouldBeConnected also triggers CONNECT_ERROR + attemptReconnection
```

## Входящий звонок

```mermaid
sequenceDiagram
  participant UserAgent@{ "type" : "control" }
  participant Runtime@{ "type" : "collections", "alias": "phoneRuntime.js" }
  participant Action@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant IncomingSession@{ "type" : "control" }
  participant Dispatch@{ "type" : "collections", "alias": "phoneControlRdcr.js" }
  actor User
  participant PhonePad@{ "type" : "participant", "alias": "PhonePad.jsx" }

  UserAgent->>Runtime: onInvite(invitation)
  Runtime->>Runtime: setPhoneRuntime(incomingSession)
  Runtime->>Runtime: Play incoming ringtone + logCall('ringing', 'in')
  Runtime->>Action: handlers.onCallLogUpdate
  Action->>Dispatch: CallsArrUpdate() / PHONECTL_CALLLOG_UPD
  Runtime->>Action: handlers.onIncomeDisplay
  Action->>Dispatch: PHONECTL_INCOME_DISPLAY (calleePhoneNum)
  User->>PhonePad: Click accept call
  PhonePad->>Action: handleClkSubmitIn(rdcr)
  Action->>Dispatch: PHONECTL_INCOME_SUBMIT
  Action->>Runtime: answerIncomingCall()
  Runtime->>Runtime: Pause incoming ringtone
  Runtime->>IncomingSession: accept(sessionOptions)
  IncomingSession-->>Runtime: stateChange: Established
  Runtime->>Runtime: logCall('incall', 'in')
  Runtime->>Action: handlers.onCallLogUpdate
  Action->>Dispatch: CallsArrUpdate()
  Runtime->>Runtime: setupRemoteMedia()
  IncomingSession-->>Runtime: stateChange: Terminated
  Runtime->>Runtime: logCall('complete', 'in')
  Runtime->>Action: handlers.onCallLogUpdate
  Action->>Dispatch: CallsArrUpdate()
  Runtime->>Runtime: cleanupMedia()
  Runtime->>Action: handlers.onCallEnded(callData)
  Action->>Action: dispatch(handleClkReset)
  Action->>Runtime: resetSipCall(callData)
  Runtime->>Runtime: resetPhoneRuntimeSessions()
  Action->>Dispatch: PHONECTL_CLK_RESET
```

## Исходящий звонок

```mermaid
sequenceDiagram
  actor User
  participant PhonePad@{ "type" : "participant", "alias": "PhonePad.jsx" }
  participant Action@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant Runtime@{ "type" : "collections", "alias": "phoneRuntime.js" }
  participant Inviter@{ "type" : "control" }
  participant Dispatch@{ "type" : "collections", "alias": "phoneControlRdcr.js" }

  User->>PhonePad: Enter callee number and click call
  PhonePad->>Action: handleClkSubmitOut(calleePhoneNum, rdcr)
  Action->>Action: Validate registration and input
  alt Valid
    Action->>Runtime: placeOutgoingCall(callee, handlers)
    Runtime->>Runtime: makeURI (throw on invalid)
    Runtime->>Action: handlers.onOutgoingSubmit
    Action->>Dispatch: PHONECTL_OUTGO_SUBMIT (outgoCallNow: true)
    Runtime->>Runtime: Play outgoing ringtone
    Runtime->>Inviter: new Inviter(userAgent, target, sessionOptions)
    Runtime->>Runtime: setPhoneRuntime(outgoingSession)
    Runtime->>Inviter: invite()
    Inviter-->>Runtime: stateChange: Establishing
    Runtime->>Runtime: logCall('ringing', 'out')
    Runtime->>Action: handlers.onCallLogUpdate
    Action->>Dispatch: CallsArrUpdate()
    Inviter-->>Runtime: stateChange: Established
    Runtime->>Runtime: logCall('incall', 'out')
    Runtime->>Action: handlers.onCallLogUpdate
    Action->>Dispatch: CallsArrUpdate()
    Runtime->>Runtime: Pause ringtone + setupRemoteMedia()
    Inviter-->>Runtime: stateChange: Terminated
    Runtime->>Runtime: logCall('complete', 'out')
    Runtime->>Action: handlers.onCallLogUpdate
    Action->>Dispatch: CallsArrUpdate()
    Runtime->>Runtime: cleanupMedia()
    Runtime->>Action: handlers.onCallEnded(callData)
    Action->>Action: dispatch(handleClkReset)
    Action->>Runtime: resetSipCall(callData)
    Runtime->>Runtime: resetPhoneRuntimeSessions()
    Action->>Dispatch: PHONECTL_CLK_RESET
  else Invalid
    Runtime-->>Action: throw
    Action->>Dispatch: PHONECTL_ERROR_ALERT
  end
```

## Чат

Исходящее SIP MESSAGE: `handleSendMessage` → `transmitSipMessage` (через активную сессию или `Messager`), статусы `sending` / `delivered` / `error`. Тем же путём (через общий `sendChatMessage`) уходит приглашение в комнату LK: `handleSendInviteMessage` получает готовые адресат и текст из LK-домена, пишет запись в чат и обновляет статус — мост `LK_` → `PHONECTL_` живёт в `LkContainer`. Тело сообщения рендерит `PhoneChat` (`renderMessageBody`): относительный `href` нормализуется в hash-маршрут (`#/?lk_room=…&lk_token=…`), а ссылка-приглашение (в `href` есть `lk_room`) выделяется акцентом. Поведение зависит от направления: у **исходящего** приглашения `target="_blank"` + `rel="noopener noreferrer"` (в текущей вкладке остаются телефон и чат), у **входящего** — `component={RouterLink}` с путём из `href`, то есть переход тут же, внутри SPA, без перезагрузки страницы; прочие ссылки — как обычно, в текущей вкладке. Поле ввода отправляет по Enter (Shift+Enter и Ctrl+Enter — перенос строки, пустое сообщение не уходит), а поле «Вн.номер» следует за `phoneControlRdcr.calleePhoneNum`: после отправки сообщения или приглашения панель сама переключается на этого собеседника — иначе только что ушедшее приглашение скрыто фильтром. Очистка поля крестиком (`IconClose` в поле «Вн.номер») снимает фильтр и показывает все сообщения (при этом `calleePhoneNum` не меняется, поэтому эффект синхронизации поле не возвращает).

```mermaid
sequenceDiagram
  actor User
  participant PhoneChat@{ "type" : "participant", "alias": "PhoneChat.jsx" }
  participant Action@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant Runtime@{ "type" : "collections", "alias": "phoneRuntime.js" }
  participant Storage@{ "type" : "collections", "alias": "phoneStorage.js" }
  participant Messager@{ "type" : "control" }
  participant Dispatch@{ "type" : "collections", "alias": "phoneControlRdcr.js" }

  User->>PhoneChat: Enter peer + message, send
  PhoneChat->>Action: handleSendMessage(peer, body, rdcr)
  Action->>Action: Validate regState=ok / SIP / peer / body / SIP URI
  Action->>Runtime: createChatMessage(peer, body, 'out', 'sending')
  Runtime-->>Action: chatMessage
  Action->>Storage: saveChatMessage(chatMessage)
  Action->>Dispatch: PHONECTL_MESSAGE_ADD ({ chatMessages, incoming: false }), статус — в самом сообщении
  Action->>Dispatch: PHONECTL_STORE_VALUE (calleePhoneNum)
  Action->>Runtime: transmitSipMessage({ chatMessage, uriHost, onStatusChange })
  Runtime->>Runtime: Active session? else new Messager
  Runtime->>Messager: message({ requestDelegate })
  alt onAccept
    Messager-->>Runtime: onAccept(response)
    Runtime->>Storage: updateChatMessageStatus('delivered')
    Runtime->>Action: onStatusChange(chatMessages)
    Action->>Dispatch: PHONECTL_MESSAGE_UPDATE (delivered)
  else onReject / error
    Messager-->>Runtime: onReject / error
    Runtime->>Storage: updateChatMessageStatus('error')
    Runtime->>Action: onStatusChange(chatMessages)
    Action->>Dispatch: PHONECTL_MESSAGE_UPDATE (error)
  else Запрос прошёл без колбэка
    Runtime->>Storage: getChatMessageStatus(id) === 'sending' → updateChatMessageStatus('delivered', 200, 'OK')
  end
```

Загрузка и счётчики чата: `MessagesArrUpdate` → `PHONECTL_MESSAGES_LOAD` (из `localStorage`), `handleChatUnreadClear` → `PHONECTL_CHAT_UNREAD_CLEAR`, `handleClearChat` → `PHONECTL_CLEAR_CHAT`.

Входящее SIP MESSAGE обрабатывается в `userAgent.delegate.onMessage` внутри `registerSipUserAgent`:

```mermaid
sequenceDiagram
  participant UserAgent@{ "type" : "control" }
  participant Runtime@{ "type" : "collections", "alias": "phoneRuntime.js" }
  participant Storage@{ "type" : "collections", "alias": "phoneStorage.js" }
  participant Action@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant Dispatch@{ "type" : "collections", "alias": "phoneControlRdcr.js" }

  UserAgent->>Runtime: onMessage(message)
  Runtime->>Runtime: handleIncomingSipMessage (accept, extract peer/body)
  Runtime->>Storage: saveChatMessage(chatMessage)
  Runtime->>Runtime: playIncomingMessageSound()
  Runtime->>Action: handlers.onMessage({ chatMessages })
  Action->>Dispatch: PHONECTL_MESSAGE_ADD (incoming: true)
```

## Остальные thunk-и

`phoneControlActions.js`:

- `MessagesArrUpdate` → `PHONECTL_MESSAGES_LOAD` из `loadChatMessages()`.
- `CallsArrUpdate` → `PHONECTL_CALLLOG_UPD` из `loadCallsArr()`; при открытой истории помечает звонки прочитанными (единственный `getState()` в actions — по своему срезу).
- `markCallsRead` → `PHONECTL_CALLLOG_UPD` с результатом `markCallsRead()` из storage.
- `handleClkUnregister(rdcr)` → `unregisterSip()` → `PHONECTL_UNREGISTER` + `PHONECTL_STORE_VALUE (regState=off)`; без SIP-подключения или регистрации — `PHONECTL_ERROR_ALERT`.
- `handleClkDtmf(tone, rdcr, options)` → `sendDtmf`; ошибки — `PHONECTL_ERROR_ALERT` (`errComponent: PhonePad`).
- `handleClkHold(rdcr, hold)` → `setHold` → `PHONECTL_STORE_VALUE (callHoldNow)`.
- `handleChangeStore` → `PHONECTL_STORE_VALUE` для произвольного поля среза.
- `handleChatUnreadClear` → `PHONECTL_CHAT_UNREAD_CLEAR`.
- `handleClearChat` → `clearChatMessages()` + `PHONECTL_CLEAR_CHAT`.
- `handleClearHistory` → `clearCallsArr()` + `PHONECTL_STORE_VALUE (callsArr=[])`.
- `getPhoneDir` → `fetchPhoneDir(getStoredPhoneDirUri())`; ошибки преобразует `actions/utils/kyError.js`.

`authControlActions.js`: `handleAdRegister` (AD-вход), `handleAdAuthClear` (`AUTHCTL_CLEAR` + сброс AD-сессии), `handleChangeStore` (`AUTHCTL_STORE_VALUE`).
`lkControlActions.js`: `handleLkTokenSubmit` (токен приглашения: сервис добавляет запись в список `invites` — на номер одно актуальное приглашение, — а текст со ссылкой возвращается вызывающему коду; отправляет его `phoneControlActions.handleSendInviteMessage` через мост в `LkContainer`), `handleLkRoomCreate` (`POST /user/lk` для своей комнаты: `LKROOM_CREATE_*`, токен возвращается вызывающему коду и уходит в query маршрута), `handleLkTokenClear` (`LKTOKEN_CLEAR` + сброс только результата запроса, список приглашений сохраняется), `handleRemoveInvite` (крестик в списке: `removeStoredLkInvite` → `LK_STORE_VALUE`), `handleChangeStore` (`LK_STORE_VALUE`).
