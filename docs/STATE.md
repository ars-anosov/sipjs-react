# Архитектура sipjs-react

**Правило документации: archify первичен.** Источник истины — интерактивные диаграммы в
[`docs/archify/`](archify/) (JSON-спецификация + собранный HTML). Mermaid-блоки ниже — только
короткий повтор первичной диаграммы (её сообщений и карточек) с комментариями по ключевым
моментам: новых фактов и более подробных потоков в них нет. Нужен новый факт — сначала правится
archify-спека и пересобирается HTML, и только потом повтор появляется здесь. Полный свод правил
проекта — в [AGENTS.md](../AGENTS.md).

## 1. Архитектура

[Диаграмма](archify/sipjs-react-architecture.html).

- Три среза и их внешние ресурсы: `AUTHCTL_` → `adAuth` → AD-сервис (`ky`),
  `PHONECTL_` → `phoneRuntime` → SIP SBC (`WSS`), `LKTOKEN_`/`LKROOM_`/`LK_` →
  `lkRuntime`/`lkToken` → LiveKit SFU. Thunk-и не диспатчат чужой префикс.
- Слои: UI → контейнеры → Redux (`actions` и `reducers`) → сервисы; `localStorage` — общее
  хранилище трёх срезов (ключи — `constants/storage.js`), сид в store собирает
  `store/preloadedState.js`. AD-сервис, SIP SBC и LiveKit SFU — внешние блоки вне слоёв.
- Мосты только в контейнерах: `AuthContainer` (`AUTHCTL_` ↔ `PHONECTL_`, URL `lk_token` → `LK_`),
  `PhoneContainer` (URL → `PHONECTL_`; кнопка LiveKit → `lkControlRdcr.displayControl`),
  `LkContainer` (приглашение → SIP MESSAGE через `PHONECTL_`).

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

- Срезы `AUTHCTL_`, `PHONECTL_` и `LKTOKEN_`/`LKROOM_`/`LK_` идут строками (суффикс в подписях
  узлов): состояние каждого — свой редьюсер (`authControlRdcr`, `phoneControlRdcr`,
  `lkControlRdcr`), а переход между срезами есть только в контейнерах: `AuthContainer`
  (`AUTHCTL_` ↔ `PHONECTL_`, URL `lk_token` → `LK_`), `PhoneContainer` (кнопка LiveKit →
  `lkControlRdcr.displayControl`), `LkContainer` (приглашение → SIP MESSAGE через `PHONECTL_`).
- У каждого среза свой сервис и внешний ресурс, а ключи всех трёх лежат в `localStorage`
  (`adAuth`, `phoneStorage`, `lkToken`); весь HTTP (`ky`) тоже только в `services/`.
- Регистрация: `AuthAd` открывается лишь неуспешной пробивкой PHP-сессии
  (`GET uriAdPhpAuth?PHPSESSID=...`); успех — тихий вход без формы, ошибкой AD пробивка не
  считается.

## 2. SIP регистрация

[Диаграмма](archify/sipjs-react-sip-store.html).

- `phoneControlRdcr.regState` (`off`/`ok`/`fail`) — единственный флаг SIP-регистрации; тумблер
  `AuthPad` трёхпозиционный и отражает его напрямую (отдельного булева флага нет).
  `PHONECTL_UNREGISTER` намеренно не сбрасывает `regState` — красный тумблер переживает
  авто-стоп, явная разрегистрация возвращает `off` отдельным `PHONECTL_STORE_VALUE`.
- Продление и переподключение: re-REGISTER до истечения `expires` шлёт сам sip.js, стор в этом не
  участвует; потеря регистрации или обрыв WebSocket — `onConnectError` +
  `attemptReconnection()` (2 попытки, пауза 4 с); отказ регистрации гасит UserAgent через 3 с
  (`onUnregistered` с `registrationLost`).
- Уход со страницы (F5): пока `regState === "ok"`, `beforeunload` держит диалог браузера; после
  подтверждённого ухода `pagehide` вызывает `handleUnregisterOnUnload()` → `unregisterSip()` —
  REGISTER с `Expires: 0` уходит сразу, ответа ждать некому; уход в bfcache
  (`persisted === true`) сессию не рвёт.
- Хранилище: `uriWebRtc` и `callerUserNum` пишет `phoneStorage` при `handleClkRegister`; `useIce`
  только читается (`getStoredUseIce`, без ключа — `true`); сид среза собирает
  `store/preloadedState.js`.

```mermaid
sequenceDiagram
  actor User
  participant PhoneReg
  participant Action as phoneControlActions
  participant LS as localStorage
  participant Rdcr as phoneControlRdcr
  participant Runtime as phoneRuntime (sip.js)

  User->>PhoneReg: submit(uriWebRtc, num, pass)
  PhoneReg->>Action: handleClkRegister
  Action->>LS: uriWebRtc · callerUserNum
  Action->>Runtime: registerSipUserAgent(handlers)
  Runtime->>Action: onConnectRequest
  Action->>Rdcr: PHONECTL_CONNECT_REQUEST (regState=off)
  Runtime->>Runtime: UserAgent.start()
  Runtime->>Runtime: onConnect → Registerer.register()
  alt accept
    Runtime->>Action: onConnectSuccess
    Action->>Rdcr: PHONECTL_CONNECT_SUCCESS (regState=ok)
  else reject
    Runtime->>Action: onConnectError
    Action->>Rdcr: PHONECTL_CONNECT_ERROR (regState=fail)
    Runtime->>Runtime: через 3 с userAgent.stop() → onUnregistered
  end
  Note over Runtime: пока регистрация жива, sip.js сам шлёт re-REGISTER до истечения expires
  Runtime->>Action: onConnectError (потеря регистрации · обрыв WebSocket)
  Action->>Rdcr: PHONECTL_CONNECT_ERROR (regState=fail)
  Runtime->>Action: onReconnectTry
  Action->>Rdcr: PHONECTL_RECONNECT_TRY (connectStatus=Reconnect)
  Runtime->>Runtime: attemptReconnection(): 2 попытки, пауза 4 с
  User->>PhoneReg: unregister
  Action->>Runtime: unregisterSip()
  Action->>Rdcr: PHONECTL_UNREGISTER (regState не трогает) + PHONECTL_STORE_VALUE (regState=off)
```

Звонки, DTMF, hold и чат — те же три звена (`Action → phoneRuntime → PHONECTL_*`): сценарии в
`src/actions/phoneControlActions.js`, состояния runtime — в `src/services/phoneRuntime.js`.

## 3. LiveKit комнаты

[Диаграмма](archify/sipjs-react-livekit-store.html).

- Условие доступа — SIP, не AD: своя комната и приглашение доступны только при живой
  регистрации (`regState === "ok"`, номер — `callerUserNum`); приглашение уходит SIP MESSAGE,
  AD для него не нужен.
- Хранилище: `uriLkToken` пишет `lkToken` на пути «Пригласить» перед запросом токена;
  приглашения — `localStorage.lkInvites` (лимит `LK_MAX_INVITES`, одно актуальное на номер,
  запись `num · room · token · expiresAt · createdAt`); `uriLk` — адрес SFU, только читается.
  В срез `lkControlRdcr` всё попадает сидом `store/preloadedState.js`.
- Комната и токен — производные query (`#/?lk_room=…&lk_token=…`), в состоянии их копий нет;
  список приглашений виден только в своей комнате (`callerUserNum === room`) при живой
  регистрации, крестик — `handleRemoveInvite`.

```mermaid
sequenceDiagram
  actor User
  participant LkMeet
  participant Action as lkControlActions
  participant LS as localStorage
  participant Rdcr as lkControlRdcr
  participant Runtime as lkRuntime (livekit-client)
  participant Token as lkToken (POST /user/lk)

  Note over User,Rdcr: своя комната/приглашение требуют regState=ok (номер — callerUserNum)
  User->>LkMeet: «Создать»
  LkMeet->>Action: handleLkRoomCreate({num · room · uriLkToken})
  Action->>Token: requestLkToken({num, room, uriLkToken})
  Token-->>Action: jwt: lk_token · lk_room
  Action->>Rdcr: LKROOM_CREATE_* (createStatus)
  Action-->>LkMeet: responseData
  Note over LkMeet: токен уходит в query — #/?lk_room&lk_token (в localStorage не пишется)
  User->>LkMeet: «Пригласить» → форма LkToken
  LkMeet->>Action: handleLkTokenSubmit(formData)
  Action->>LS: uriLkToken
  Action->>Token: requestLkToken({num, room, uriLkToken})
  Token-->>Action: jwt
  Action->>LS: lkInvites: num · room · token · expiresAt
  Action->>Rdcr: LKTOKEN_SUBMIT_SUCCESS (invites)
  Note over Action,Rdcr: приглашение уходит SIP MESSAGE через мост LkContainer → PHONECTL_
  User->>LkMeet: «Подключиться» (или ссылка-приглашение с lk_token)
  LkMeet->>Runtime: getLiveKitRoom() — singleton Room
  LkMeet->>Runtime: LiveKitRoom(connect · token · serverUrl=uriLk)
  Runtime-->>LkMeet: комната и треки участников (@livekit/components-react)
```

Эндпоинт выдачи токена `uriLkToken` и список приглашений пишет `lkToken`; форма приглашения
(`LkToken`) заполняет `num`, `room` и эндпоинт. Стенд (OpenVidu), готовый токен и грабли
проверки — `docs/LIVEKIT.md`.

## 4. Хранилища

`localStorage` доступен только сервисам; ключи объявлены в `src/constants/storage.js`.

## 5. Документация archify: первичный источник

Диаграммы собираются навыком `archify`, отрисовка проверяется навыком `archify-visual-check`
(оба — плагин профиля `web`); готовые HTML и JSON руками не правятся.

```bash
ARCHIFY="$HOME/.dsh/profiles/web/node_modules/@tt-a1i/archify-dsh/skills/archify/bin/archify.mjs"

# 1. Приёмка спеки: 9/9 проверок, composition 0 ошибок / 0 предупреждений
node "$ARCHIFY" validate architecture docs/archify/<name>.architecture.json \
  --quality showcase --repo-root . --json

# 2. Сборка: единственная пишущая команда, печатает SHA-256 и байты спеки и артефакта
node "$ARCHIFY" deliver architecture docs/archify/<name>.architecture.json \
  docs/archify/<name>.html --quality showcase --repo-root . --json

# 3. Визуальный контроль: containment и light/dark скриншоты, HTML не меняет
node "$ARCHIFY" visual-check docs/archify/<name>.html --json
```

- Профиль качества — `showcase`; для sequence меняется только тип (`validate sequence`), а
  `--repo-root .` не нужен: поле `meta.repository` есть только у architecture.
- Раскладка артефактов: `<name>.<type>.json` (спека) + `<name>.html` (артефакт) +
  `<name>.visual-check.*` (receipt, скриншоты, contact sheet).
- `visual-check` всегда пишет `visualReview: "pending"`: скриншоты — материал для глаза, а не
  автоматическое подтверждение отрисовки; визуальную приёмку делает навык
  `archify-visual-check`.
- Подписи в артефактах — по-русски, как и в этом файле; имена продуктов, команд и API остаются
  английскими.
