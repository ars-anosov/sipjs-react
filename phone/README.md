# phone
Готовая сборка в [dist](dist).

## Логика работы приложения

```mermaid
graph TD
    A[User opens app] --> B[App.jsx renders components]
    B --> C[MenuAppBar.jsx - navigation]
    B --> D[PhoneReg.jsx - registration form]
    B --> E[PhonePad.jsx - dial pad]
    B --> F[PhoneHistory.jsx - call history]
    B --> G[PhoneIco.jsx - phone status]

    D --> H[handleClkRegister - form submit]
    H --> I[phoneControlActions.handleClkRegister]
    I --> J[Create UserAgent + Registerer]
    J --> K[UserAgent.start() - WebSocket connect]
    K --> L{Success?}
    L -->|Yes| M[registerer.register() - SIP REGISTER]
    L -->|No| N[Connection error]

    M --> O{Registration OK?}
    O -->|Yes| P[PHONECTL_CONNECT_SUCCESS]
    O -->|No| Q[PHONECTL_CONNECT_ERROR]

    P --> R[phoneControlRdcr updates state]
    R --> S[Components re-render]
    S --> T[displayReg=false, displayPad=true]

    E --> U[handleClkSubmitOut - outgoing call]
    U --> V[phoneControlActions.handleClkSubmitOut]
    V --> W[Create Inviter session]
    W --> X[inviter.invite() - SIP INVITE]

    G --> Y[Incoming call from SIP server]
    Y --> Z[userAgent.delegate.onInvite]
    Z --> AA[PHONECTL_INCOME_DISPLAY]
    AA --> BB[Show incoming call dialog]

    BB --> CC[User answers]
    CC --> DD[handleClkSubmitIn]
    DD --> EE[session.accept() - accept call]

    X --> FF{Call established?}
    FF -->|Yes| GG[setupRemoteMedia - audio stream]
    FF -->|No| HH[Call error]

    EE --> II{Call established?}
    II -->|Yes| JJ[setupRemoteMedia - audio stream]
    II -->|No| KK[Call error]

    GG --> LL[Call active]
    JJ --> LL
    LL --> MM[session.bye() or endCall - hangup]
    MM --> NN[PHONECTL_CLK_RESET]
    NN --> OO[Reset state]

    Q --> PP[Show error]
    N --> PP
    HH --> PP
    KK --> PP

    style A fill:#e1f5fe
    style B fill:#f3e5f5
    style I fill:#fff3e0
    style R fill:#e8f5e8
    style P fill:#c8e6c9
    style Q fill:#ffcdd2
```