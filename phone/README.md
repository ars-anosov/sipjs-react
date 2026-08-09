# phone
Готовая сборка в [dist](dist).

## Архитектура состояния

SIP/WebRTC-объекты живут вне Redux — в модуле `phoneRuntime.js`. В store только UI-флаги, заголовки, лог звонков и чат.

```mermaid
flowchart LR
  UI[Components / Containers]
  ACT[phoneControlActions.js]
  RT[phoneRuntime.js]
  RDCR[phoneControlRdcr]
  SIP[sip.js + WebRTC]

  UI -->|dispatch thunks| ACT
  ACT -->|setPhoneRuntime / media / sessions| RT
  ACT -->|PHONECTL_*| RDCR
  RT --> SIP
  RDCR -->|props| UI
```

`phoneRuntime`: `userAgent`, `registerer`, `sessionOptions`, `incomingSession` / `outgoingSession`, audio elements, `remoteStream`.

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
  Action->>Action: Validate form fields
  alt Valid
    Action->>Action: Store uriWebRtc/callerUserNum in localStorage
    Action->>Dispatch: PHONECTL_STORE_VALUE
    Action->>UserAgent: new UserAgent(userAgentOptions)
    Action->>Runtime: setPhoneRuntime(userAgent, audio, sessionOptions)
    Action->>Registerer: new Registerer(userAgent, registererOptions)
    Action->>Runtime: setPhoneRuntime(registerer)
    Action->>Dispatch: PHONECTL_CONNECT_REQUEST
    Action->>UserAgent: start()
    UserAgent-->>Action: onConnect
    Action->>Registerer: register()
    Registerer-->>Action: onAccept
    Action->>Dispatch: PHONECTL_CONNECT_SUCCESS
    Registerer-->>Action: onReject
    Action->>Dispatch: PHONECTL_CONNECT_ERROR
    Action->>Action: stopAfterRegistrationFailure()
    Action->>Dispatch: PHONECTL_UNREGISTER
    Action->>Runtime: resetPhoneRuntime()
  else Invalid
    Action->>Dispatch: PHONECTL_ERROR_ALERT
  end
```

## Восстановление сетевого обрыва / перерегистрация

```mermaid
sequenceDiagram
  participant UserAgent@{ "type" : "control" }
  participant Action@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant Registerer@{ "type" : "control" }
  participant Dispatch@{ "type" : "collections", "alias": "phoneControlRdcr.js" }

  UserAgent->>Action: onDisconnect(error)
  Action->>Action: Check suppressReconnectOnNextDisconnect
  alt Not suppressed
    Action->>Dispatch: PHONECTL_CONNECT_ERROR (Disconnected)
    alt error && shouldBeConnected
      Action->>Action: attemptReconnection(1)
      alt reconnectionAttempt <= reconnectionAttempts
        Action->>Dispatch: PHONECTL_RECONNECT_TRY
        Action->>Action: setTimeout for delay
        Action->>UserAgent: reconnect()
        UserAgent-->>Action: reconnect success
        UserAgent-->>Action: onConnect
        Action->>Registerer: register()
        Registerer-->>Action: onAccept
        Action->>Dispatch: PHONECTL_CONNECT_SUCCESS
        Registerer-->>Action: onReject
        Action->>Dispatch: PHONECTL_CONNECT_ERROR
      else Attempts exhausted
        Action->>Dispatch: PHONECTL_CONNECT_ERROR (Disconnected)
      end
    end
  else Suppressed
    Action->>Action: Reset suppressReconnectOnNextDisconnect
  end
  Note over Action: On reconnect failure, increment attempt and retry
  Note over Registerer: Unregistered while shouldBeConnected also triggers CONNECT_ERROR + attemptReconnection
```

## Входящий звонок

```mermaid
sequenceDiagram
  participant UserAgent@{ "type" : "control" }
  participant Action@{ "type" : "collections", "alias": "phoneControlActions.js" }
  participant Runtime@{ "type" : "collections", "alias": "phoneRuntime.js" }
  participant IncomingSession@{ "type" : "control" }
  participant Dispatch@{ "type" : "collections", "alias": "phoneControlRdcr.js" }
  actor User
  participant PhonePad@{ "type" : "participant", "alias": "PhonePad.jsx" }

  UserAgent->>Action: onInvite(invitation)
  Action->>Runtime: setPhoneRuntime(incomingSession)
  Action->>Action: Play incoming ringtone
  Action->>Action: logCall('ringing', 'in')
  Action->>Dispatch: CallsArrUpdate() / PHONECTL_CALLLOG_UPD
  Action->>Dispatch: PHONECTL_INCOME_DISPLAY (calleePhoneNum)
  User->>PhonePad: Click accept call
  PhonePad->>Action: handleClkSubmitIn(rdcr)
  Action->>Dispatch: PHONECTL_INCOME_SUBMIT
  Action->>Action: Pause incoming ringtone
  Action->>IncomingSession: accept(sessionOptions)
  IncomingSession-->>Action: stateChange: Established
  Action->>Action: logCall('incall', 'in')
  Action->>Dispatch: CallsArrUpdate()
  Action->>Action: setupRemoteMedia()
  IncomingSession-->>Action: stateChange: Terminated
  Action->>Action: logCall('complete', 'in')
  Action->>Dispatch: CallsArrUpdate()
  Action->>Action: cleanupMedia()
  Action->>Action: handleClkReset()
  Action->>Runtime: resetPhoneRuntimeSessions()
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
    Action->>Dispatch: PHONECTL_OUTGO_SUBMIT (outgoCallNow: true)
    Action->>Action: Play outgoing ringtone
    Action->>Inviter: new Inviter(userAgent, target, sessionOptions)
    Action->>Runtime: setPhoneRuntime(outgoingSession)
    Action->>Inviter: invite()
    Inviter-->>Action: stateChange: Establishing
    Action->>Action: logCall('ringing', 'out')
    Action->>Dispatch: CallsArrUpdate()
    Inviter-->>Action: stateChange: Established
    Action->>Action: logCall('incall', 'out')
    Action->>Dispatch: CallsArrUpdate()
    Action->>Action: Pause outgoing ringtone
    Action->>Action: setupRemoteMedia()
    Inviter-->>Action: stateChange: Terminated
    Action->>Action: logCall('complete', 'out')
    Action->>Dispatch: CallsArrUpdate()
    Action->>Action: cleanupMedia()
    Action->>Action: handleClkReset()
    Action->>Runtime: resetPhoneRuntimeSessions()
    Action->>Dispatch: PHONECTL_CLK_RESET
  else Invalid
    Action->>Dispatch: PHONECTL_ERROR_ALERT
  end
```
