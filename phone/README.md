# phone
Готовая сборка в [dist](dist).

![phone](../img/phone.png)

## Логика работы приложения

```mermaid
graph TD
    A[Пользователь открывает приложение] --> B[App.jsx рендерит компоненты]
    B --> C[MenuAppBar.jsx - навигация]
    B --> D[PhoneReg.jsx - форма регистрации]
    B --> E[PhonePad.jsx - панель звонков]
    B --> F[PhoneHistory.jsx - история звонков]
    B --> G[PhoneIco.jsx - статус телефона]

    D --> H[handleClkRegister - отправка формы]
    H --> I[phoneControlActions.handleClkRegister]
    I --> J[Создание UserAgent + Registerer]
    J --> K[UserAgent.start() - подключение к WebSocket]
    K --> L{Успешно?}
    L -->|Да| M[registerer.register() - SIP REGISTER]
    L -->|Нет| N[Ошибка подключения]

    M --> O{Регистрация успешна?}
    O -->|Да| P[PHONECTL_CONNECT_SUCCESS]
    O -->|Нет| Q[PHONECTL_CONNECT_ERROR]

    P --> R[phoneControlRdcr обновляет state]
    R --> S[Компоненты перерендериваются]
    S --> T[displayReg=false, displayPad=true]

    E --> U[handleClkSubmitOut - исходящий звонок]
    U --> V[phoneControlActions.handleClkSubmitOut]
    V --> W[Создание Inviter сессии]
    W --> X[inviter.invite() - SIP INVITE]

    G --> Y[Входящий звонок от SIP сервера]
    Y --> Z[userAgent.delegate.onInvite]
    Z --> AA[PHONECTL_INCOME_DISPLAY]
    AA --> BB[Показ диалога входящего звонка]

    BB --> CC[Пользователь отвечает]
    CC --> DD[handleClkSubmitIn]
    DD --> EE[session.accept() - принять звонок]

    X --> FF{Звонок установлен?}
    FF -->|Да| GG[setupRemoteMedia - аудио поток]
    FF -->|Нет| HH[Ошибка звонка]

    EE --> II{Звонок установлен?}
    II -->|Да| JJ[setupRemoteMedia - аудио поток]
    II -->|Нет| KK[Ошибка звонка]

    GG --> LL[Звонок активен]
    JJ --> LL
    LL --> MM[session.bye() или endCall - завершение]
    MM --> NN[PHONECTL_CLK_RESET]
    NN --> OO[Сброс состояния]

    Q --> PP[Показ ошибки]
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