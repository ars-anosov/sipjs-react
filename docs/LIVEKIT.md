# LiveKit в sipjs-react: стенд, токены, проверка

Заметки для AI-агентов: чем на самом деле является бэкенд встреч, как подключиться к комнате
без AD, как проверить правку и на каких граблях уже теряли прогоны. Правила проекта — в
`AGENTS.md`, потоки — в `docs/STATE.md`.

## Что где

- **Бэкенд — OpenVidu Community 3.8 в docker** (`openvidu-local-deployment`). Это **форк LiveKit**,
  100 % совместимый по API и SDK ([OpenVidu vs LiveKit](https://openvidu.io/openvidu-vs-livekit/),
  [сравнение](https://openvidu.io/latest/docs/comparing-openvidu/)): никакого отдельного OpenVidu-API
  проект не вызывает, всё общение — обычный LiveKit-протокол.
- **Клиент — чистый LiveKit**: `livekit-client` (`src/services/lkRuntime.js` — singleton `Room`),
  UI — `@livekit/components-react` в `src/components/LkMeet.jsx`, токен — `src/services/lkToken.js`
  (`POST` на свой бэкенд `uriLkToken`); в dev мок `mock/vite-mock-api.js` подписывает JWT парой
  `devkey`/`secret`.
- **Контракт подключения**: `#/?lk_room=<комната>&lk_token=<jwt>`. `uriLk` (адрес сервера) и
  `uriLkToken` (эндпоинт выдачи) лежат в `localStorage` (`constants/storage.js`), dev-дефолты
  пишет корневой `index.html`.
- **Показ панели**: `lkControlRdcr.displayControl` — пункт меню «LiveKit Встреча» или тумблер в
  `AuthPad`. Сам `LkMeet` без `lk_token`/AD показывает информирующий текст.

## Локальный стенд

`docker ps` на машине разработчика: `caddy-proxy`, `openvidu` (LiveKit-форк), `ingress`, `egress`,
`minio`, `mongo`, `redis`, `dashboard`, `openvidu-meet`, `operator`.

- Ключи стенда — `devkey` / `secret` (`livekit.yaml` в `openvidu-local-deployment/community/`),
  ровно те же, что в моке, поэтому самодельные токены стенд принимает.
- Порты: **7443** — Caddy (HTTPS/WSS, `https://<ip-slug>.openvidu-local.dev:7443` — то, что стоит в
  dev-дефолте `uriLk`), **7880** — LiveKit напрямую и **без TLS** (`ws://localhost:7880`), 7881 —
  TCP-медиа, 7900–7999 — UDP, 3478 — TURN.

Диагностика (дешевле любых догадок):

```bash
curl -sk -o /dev/null -w '%{http_code}\n' https://192-168-0-142.openvidu-local.dev:7443/  # 000 → Caddy не отдаёт TLS
curl -s  -o /dev/null -w '%{http_code}\n' http://localhost:7880/                          # 200 → сам LiveKit жив
docker logs --since 10m caddy-proxy | tail -5                                            # tls.handshake … HTTPCertGetter: unexpected EOF
docker logs --since 10m openvidu | grep -E '"room"|participant (active|closing)'          # кто в какой комнате — правда на сервере
```

Встречавшиеся состояния стенда:

- **Caddy теряет сертификат** (on-demand TLS через `HTTPCertGetter`, в логах
  `tls.handshake … unexpected EOF`): клиент навсегда остаётся в
  `connecting … signal connecting to wss://…:7443/rtc/v1`, до сервера не доходит, в консоли пусто.
  Лечится перезапуском стенда — **чужие контейнеры без запроса человека не трогать**; для проверки
  UI хватает обхода через `ws://localhost:7880`.
- **Комната `9994` может быть занята личным браузером разработчика** (в логах LiveKit — клиент
  `Chrome`/`Windows` с identity `9994`). Любой headless-хост с тем же identity выбивается
  (`reason: DUPLICATE_IDENTITY`) — прогон «теряет» хоста и часть плиток. Свои проверки вести в
  отдельной комнате (`grid3`, `sim4`) и со своими identity (`a1`, `a2`, …).

## Токен для проверки

```bash
node -e "const jwt=require('jsonwebtoken');console.log(jwt.sign({video:{roomJoin:true,room:'grid3'}},'secret',{issuer:'devkey',subject:'a1',expiresIn:'1h'}))"
```

`video.room` — комната, `subject` — identity участника. Дальше достаточно открыть
`http://localhost:<порт>/#/?lk_room=grid3&lk_token=<jwt>` — **AD и авторизация для этого не нужны**:
достаточно тумблера/пункта меню «LiveKit Встреча». Если Caddy лежит, перед загрузкой страницы
подставить `localstorage-set uriLk ws://localhost:7880`.

## Проверка в браузере

Обёртка — `.dsh/bin/browser`, порядок и уровни — навык `ui-verify`. Короткий путь до панели без AD:
закрыть модальный `PhoneReg` → меню → «LiveKit Встреча» → `Escape` (закрыть drawer) →
«Подключиться к …».

Что экономит вызовы и нервы:

- На старте открыт модальный `PhoneReg`: пока он открыт, всё приложение в `aria-hidden` и
  role-локаторы (`getByRole`, `getByText` через `waitFor`) не находят элементы — закрывать первым делом.
- Тумблеры MUI `Switch` в этом проекте **не находятся** через `getByRole("checkbox", { name })`
  (проверено, локатор ждёт таймаут) — брать CSS:
  `page.locator('input[aria-label="Показ LiveKit Встречи"]')`.
- AD-диалог закрывается сам на `AUTHCTL_SUBMIT_SUCCESS` (`displayAd: false`) — ждать «Мост к
  сервисам», а не текст успеха.
- Сценарий — одной цепочкой в одном вызове `bash` (демон CLI живёт только внутри вызова), включая
  `open … run-code … close`.
- Локатор панели, устойчивый к смене заголовка:
  `page.locator("div.MuiPaper-root").filter({ has: page.locator("h6", { hasText: "Встреча" }) })`.
- Нужны фейковые камера/микрофон или не нужна деградация фоновой вкладки — **временно**
  добавить в `.playwright/cli.config.json`: `browser.launchOptions.args`
  (`--use-fake-device-for-media-stream`, `--use-fake-ui-for-media-stream`,
  `--disable-background-timer-throttling`) и `contextOptions.permissions: ["camera", "microphone"]`,
  после проверки вернуть файл: `git checkout -- .playwright/cli.config.json`.
- Несколько вкладок = несколько участников: одна вкладка — один identity, все в своей комнате.

## Грабли, которые уже стоили прогонов

- **`.lk-control-bar` не доказывает подключение.** `LiveKitRoom` рендерит `ControlBar` сразу при
  монтировании, ещё до (и без) успешного `connect()`. Подключение проверять по плиткам
  (`useTracks` с `withPlaceholder: true` даёт плитку на каждого участника без камеры) и по
  `docker logs openvidu`.
- **`simulateParticipants` не заменяет сервер.** В `@livekit/components-react` 2.9.x хук при этом
  пропуске уходит в ранний `return` (см. `src/hooks/useLiveKitRoom.ts`) и `connect()` не вызывает, а
  треки публикует настоящие (`useRealTracks: true`) — без фейковых устройств падает, а смена
  значения на лету ломает симуляцию. Для проверки раскладки надёжнее реальная комната.
- **Мок `/user/ad` отдаёт пустой `sip_secret`** → мост `AuthContainer` не заполняет `callerUserNum`,
  и форма приглашения падает с «Заполните num и room.». Чтобы проверить приглашение, подменить ответ
  (`page.route("**/user/ad", …)` с непустым `sip_secret`) и при необходимости `**/user/lk`.
- **MUI 9 `Grid` — это flexbox, а не CSS grid** (`@mui/system/Grid/gridGenerator.mjs`:
  `display: flex; flexWrap: wrap; gap`). Ряды делят высоту через `align-content: stretch`;
  `gridAutoRows` и `grid-template-columns` тут не работают.
- `docs.livekit.io` из WSL часто не отвечает — быстрее смотреть типы и исходники установленного
  пакета: `node_modules/@livekit/components-react/dist/components/LiveKitRoom.d.ts`,
  `node_modules/@livekit/components-react/src/hooks/useTracks.ts`.

## Вёрстка панели `LkMeet` (инварианты)

- Панель занимает всё доступное место: `flex: 1; minHeight: PANEL_HEIGHT` (528 — **нижняя граница**,
  не фиксированная высота), `width: 100%`, без `maxWidth`.
- Внутри компоненты **нет полос прокрутки**: сцена — `overflow: hidden`, сетка —
  `flex: 1; minHeight: 0; alignContent: stretch`.
- Плитки держат **16:9**: ячейка объявлена `containerType: "size"`, а плитка берёт
  `width: min(100%, calc(100cqh * 16 / 9))` + `aspect-ratio: 16 / 9` (в браузерах без container
  query units остаётся `width: 100%` — фолбэк через `@supports`). `objectFit: cover` для камер и
  `contain` для демонстрации экрана и фуллскрина; демонстрация занимает всю строку (`size={12}`).
- Рядность — `getTileColumns(число треков)`: 1 → 12 колонок, 2–4 → 6, 5–9 → 4, больше → 3. Больше
  окон = мельче плитки (это осознанный выбор «всё влезает без прокрутки»).
- Прокрутка **страницы** возможна, когда открыты другие панели (AuthPad, чат, история) — это
  допустимо, компонента при этом не скроллится.

## Что именно использует клиент

`src/services/lkRuntime.js`: `adaptiveStream: false`, `dynacast: false`, `simulcast: false`,
`videoCodec: "vp8"` (камера), камера 1080p, `screenShareEncoding` 8 Мбит/с@30, экспорты
`screenShareCaptureOptions` (2K-захват демонстрации) и `screenSharePublishOptions`
(`videoCodec: "vp9"`, `backupCodec: true`). В `LkMeet` комната подключается с
`video={false} audio={false}`, а устройства включаются **своей** панелью `MeetControlBar` — она
собрана из примитивов LiveKit (`TrackToggle`, `MediaDeviceMenu`, `DisconnectButton`,
`StartMediaButton`) вместо встроенного `ControlBar`, потому что опции захвата (`captureOptions`) и
кодека (`publishOptions`) есть только у `TrackToggle`. Компоненты не импортируют `livekit-client`
(исключение — `LkMeet` → `lkRuntime` и `@livekit/components-react`).

Строка `backupCodec: "h264"` из старой конфигурации убрана: тип в `livekit-client` —
`true | false | { codec }`, а строка давала `backupCodec.codec === undefined` и лишний дубль-кодек
в `AddTrackRequest`. Для VP8-камеры дефолт (`true`) — no-op, для VP9-демонстрации даёт дубль VP8.

## Разрешение видео: кто что зажимает

Приём проверки — подмена `navigator.mediaDevices.getDisplayMedia`/`getUserMedia` перед кликом по
кнопкам панели (constraints видны в перехвате, реальный захват для проверки не нужен):

```js
// в браузере перед кликом
navigator.mediaDevices.getDisplayMedia = async (c) => { window.__captured.push(c); throw new Error("stop"); };
```

Текущее состояние (после подключения 2K для демонстрации):

```json
{"getDisplayMedia": {"audio": true, "video": {"width": {"ideal": 2560}, "height": {"ideal": 1440}, "frameRate": 30}, "selfBrowserSurface": "include"}}
{"getUserMedia":   {"video": {"deviceId": {"ideal": "default"}, "width": 1920, "height": 1080}}}
```

- **Камера** — 1080p, кап наш: `videoCaptureDefaults.resolution` в `src/services/lkRuntime.js`. В
  `livekit-client` `constraintsForOptions` «расплющивает» `resolution` в голые `width`/`height`
  (`room/track/utils.ts:64`), а голое значение браузер трактует как пожелание (`ideal`), не как
  максимум. Нужен 2K с камеры — менять это значение на `2560×1440`.
- **Демонстрация экрана** — 2K, но **только явными опциями захвата**: опции
  `screenShareCaptureDefaults` в `livekit-client` **не существует** (нет ни в типах, ни в коде:
  `grep -r screenShareCaptureDefaults node_modules/livekit-client` пуст), а
  `LocalParticipant.createScreenTracks` при `options.resolution === undefined` жёстко ставит
  `ScreenSharePresets.h1080fps30.resolution` (1920×1080). Встроенный `ControlBar` передаёт
  `captureOptions={{ audio: true, selfBrowserSurface: 'include' }}` — без разрешения; поэтому панель
  в `LkMeet` своя и передаёт `screenShareCaptureOptions` из `lkRuntime.js`
  (`{ audio, selfBrowserSurface, resolution: 2560×1440@30 }`).
- **Сервер не при чём**: в рабочем `/etc/livekit.yaml` контейнера `openvidu` нет ключей
  bitrate/resolution (`docker exec openvidu cat /etc/livekit.yaml`).
- **Битрейт**: камера публикуется без ограничения (`simulcast: false` и нет `videoEncoding` →
  `computeVideoEncodings` возвращает `[{}]`), у демонстрации `screenShareEncoding` задан явно —
  `8 Мбит/с@30`. Дефолт библиотеки для шаринга — `ScreenSharePresets.h1080fps15.encoding`
  (2.5 Мбит/с@15), у `VideoPresets.h1440.encoding` — 5 Мбит/с: для 1440p VP8 мало, Chrome поджимает
  картинку (quality scaler).
- Даже с правильным запросом размер ограничен источником: `getDisplayMedia` не отдаст больше
  разрешения монитора/окна, а веб-камера — больше своего сенсора. В headless-Chromium реальный
  desktop capture не проходит (даже с `--auto-select-desktop-capture-source`), поэтому проверяется
  именно запрос constraints, а `maxBitrate` — по коду `publishUtils.computeVideoEncodings`.

## Кодек демонстрации: почему VP9

- Камера остаётся на **VP8** (`publishDefaults.videoCodec`), а демонстрация публикуется с
  `publishOptions={{ videoCodec: "vp9", backupCodec: true }}` (`screenSharePublishOptions` в
  `lkRuntime.js`): для экранного текста VP9 заметно эффективнее VP8 при том же битрейте.
- С SVC-кодеком (VP9/AV1) `livekit-client` сам готовит публикацию: при `simulcast: false` для
  демонстрации ставит `scalabilityMode = 'L1T3'` и `contentHint = 'motion'`
  (`LocalParticipant.ts:1155-1175`) — одному пространственному слою соответствует полное 2K.
- `backupCodec: true` добавляет дубль VP8 для клиентов без VP9. Побочный эффект библиотеки: при
  публикации с дублем она принудительно включает `room.options.dynacast = true`, даже если в
  опциях стоял `false` (`LocalParticipant.ts:1187-1204`). Не пугаться в отладке.
- AV1 (`videoCodec: "av1"`) сжал бы ещё лучше, но требует поддержки сервером и более мощного
  клиента; переключение — одна строка в `screenSharePublishOptions`.
- **Что проверено рантаймом**: запрос захвата (2K, см. раздел выше) и то, что кодек доезжает до
  отправки — в `outbound-rtp` коннекшена появляется `codec: "video/VP9"`. **Что не проверено**:
  кадры (frameWidth/Height, fps, `targetBitrate`) — в headless-Chromium реальный desktop capture
  недоступен, а подмена `getDisplayMedia` на `canvas.captureStream(2560×1440@30)` даёт живой трек,
  но публикация не завершается (одинаково и с кодеками, и без них — проверено A/B, значит дело в
  окружении). Проверять на живом браузере: `chrome://webrtc-internals` → `outbound-rtp`
  (`video/VP9`, `frameWidth 2560`, `frameHeight 1440`).

## Ссылки

- [OpenVidu vs LiveKit](https://openvidu.io/openvidu-vs-livekit/) — форк, совместимость, где LiveKit впереди.
- [OpenVidu: access tokens](https://openvidu.io/latest/docs/reference/access-tokens/) — состав JWT-гранта и параметры.
- [OpenVidu: local deployment](https://openvidu.io/latest/docs/self-hosting/local/) — чем поднимается локальный стенд.
- [`useSearchParams`](https://reactrouter.com/api/hooks/useSearchParams), [`createSearchParams`](https://reactrouter.com/api/utils/createSearchParams) — разбор `lk_room`/`lk_token` из query.
