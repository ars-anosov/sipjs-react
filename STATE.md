# phone
Готовая сборка в [dist](dist).

## Архитектура состояния

SIP/WebRTC-объекты и медиа живут вне Redux — в сервисах `src/services/`. В store только UI-флаги, заголовки, лог звонков и чат.

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
  RT -->|logCall / load / save| ST
  RT --> SIP
  RDCR -->|props| UI
```

`phoneRuntime` (singleton): `userAgent`, `registerer`, `sessionOptions`, `incomingSession` / `outgoingSession`, audio elements, `remoteStream`. Публичное API — высокоуровневые функции; обратная связь в actions — через колбэки `handlers`.

Смежные сервисы:

- `lkRuntime.js` — LiveKit-комната (`getLiveKitRoom`).
- `phoneNotifications.js` — Service Worker / Notifications.
- `phoneStorage.js` — персистенс звонков и чата в `localStorage`.

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

  Init -->|connectStatus=Request, phoneHeader, icoHeader| CR
  CR -->|connectStatus=Success, regNow, displayReg=false, displayPad=true, displayHistory/Chat=false| CS
  CR -->|connectStatus=Error, regNow=false, phoneHeader, icoHeader| CE
  CS -->|outgoCallNow=true, phoneHeader, icoHeader| OS
  CS -->|incomeDisplay=true, calleePhoneNum, phoneHeader, icoHeader| ID
  ID -->|incomeDisplay=false, incomeCallNow=true| IS
  CS -->|callsArr, callUnread| CL
  CS -->|arbitrary field, e.g. displayHistory/Chat, callHoldNow| SV
  CS -->|chatMessages, chatUnread| MA
  CE -->|connectStatus=Reconnect| RC
  RC -->|register onAccept| CS
  RC -->|attempts exhausted / reject| CE
  CE -->|errComponent, errText| EA
  EA -->|clear / call end| RS
  IS -->|hangup / Terminated| RS
  OS -->|hangup / Terminated| RS
  RS -->|reset call UI flags, keep regNow| CS
  UN -->|displayReg=true, displayPad=false, clear call/chat unread| Init

  classDef initial fill:#e3f2fd,stroke:#1565c0,stroke-width:1px
  classDef success fill:#e8f5e8,stroke:#4caf50,stroke-width:1px
  classDef error fill:#ffebee,stroke:#f44336,stroke-width:1px

  class Init initial
  class CS success
  class CE error
```

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
  Action->>Action: Validate + save uriWebRtc/callerUserNum
  Action->>Dispatch: PHONECTL_STORE_VALUE / AUTHCTL_STORE_VALUE
  alt Valid
    Action->>Runtime: registerSipUserAgent({ formData, handlers })
    Runtime->>Runtime: makeURI (throw on invalid)
    Runtime->>UserAgent: new UserAgent(userAgentOptions)
    Runtime->>Runtime: setPhoneRuntime(userAgent, audio, sessionOptions)
    Runtime->>Registerer: new Registerer(userAgent, sessionOptions)
    Runtime->>Action: handlers.onConnectRequest
    Action->>Dispatch: PHONECTL_CONNECT_REQUEST
    Runtime->>UserAgent: start()
    UserAgent-->>Runtime: onConnect
    Runtime->>Registerer: register()
    Registerer-->>Runtime: onAccept
    Runtime->>Action: handlers.onConnectSuccess
    Action->>Dispatch: PHONECTL_CONNECT_SUCCESS
    Registerer-->>Runtime: onReject
    Runtime->>Action: handlers.onConnectError
    Action->>Dispatch: PHONECTL_CONNECT_ERROR
    Runtime->>Runtime: stopAfterRegistrationFailure()
    Runtime->>Action: handlers.onUnregistered
    Action->>Dispatch: PHONECTL_UNREGISTER
    Runtime->>Runtime: resetPhoneRuntime()
  else Invalid
    Runtime-->>Action: throw
    Action->>Dispatch: PHONECTL_ERROR_ALERT
  end
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
    Action->>Dispatch: PHONECTL_CONNECT_ERROR (Disconnected)
    alt error && shouldBeConnected
      Runtime->>Runtime: attemptReconnection(1)
      alt reconnectionAttempt <= reconnectionAttempts
        Runtime->>Action: handlers.onReconnectTry
        Action->>Dispatch: PHONECTL_RECONNECT_TRY
        Runtime->>Runtime: setTimeout for delay
        Runtime->>UserAgent: reconnect()
        UserAgent-->>Runtime: reconnect success
        UserAgent-->>Runtime: onConnect
        Runtime->>Registerer: register()
        Registerer-->>Runtime: onAccept
        Runtime->>Action: handlers.onConnectSuccess
        Action->>Dispatch: PHONECTL_CONNECT_SUCCESS
        Registerer-->>Runtime: onReject
        Runtime->>Action: handlers.onConnectError
        Action->>Dispatch: PHONECTL_CONNECT_ERROR
      else Attempts exhausted
        Runtime->>Action: handlers.onConnectError
        Action->>Dispatch: PHONECTL_CONNECT_ERROR (Disconnected)
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
  Runtime->>Runtime: logCall('incall', 'in') + setupRemoteMedia()
  Runtime->>Action: handlers.onCallLogUpdate
  Action->>Dispatch: CallsArrUpdate()
  IncomingSession-->>Runtime: stateChange: Terminated
  Runtime->>Runtime: logCall('complete', 'in') + cleanupMedia()
  Runtime->>Action: handlers.onCallLogUpdate
  Action->>Dispatch: CallsArrUpdate()
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
    Runtime->>Runtime: logCall('incall', 'out') + Pause ringtone + setupRemoteMedia()
    Runtime->>Action: handlers.onCallLogUpdate
    Action->>Dispatch: CallsArrUpdate()
    Inviter-->>Runtime: stateChange: Terminated
    Runtime->>Runtime: logCall('complete', 'out') + cleanupMedia()
    Runtime->>Action: handlers.onCallLogUpdate
    Action->>Dispatch: CallsArrUpdate()
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

Исходящее SIP MESSAGE: `handleSendMessage` → `transmitSipMessage` (через активную сессию или `Messager`), статусы `sending` / `delivered` / `error`.

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
  Action->>Action: Validate regNow / SIP / peer / body / SIP URI
  Action->>Runtime: createChatMessage(peer, body, 'out', 'sending')
  Runtime-->>Action: chatMessage
  Action->>Storage: saveChatMessage(chatMessage)
  Action->>Dispatch: PHONECTL_MESSAGE_ADD (sending)
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
  end
```

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
