---
name: ui-verify
description: Проверить UI-правку sipjs-react в настоящем браузере — поднять dev-сервер, открыть телефон в Linux-Chromium внутри WSL через .dsh/bin/browser (Playwright CLI) и подтвердить поведение снапшотом, кликом, консолью и скриншотом. Использовать, когда менялись компоненты, вёрстка, тема или связка со Redux и нужен факт, а не догадка.
whenToUse: Правка в src/components, src/containers, src/reducers, theme.js или mock/ — перед ответом пользователю.
---

# Проверка UI-правки в браузере

Проверка = dev-сервер + Linux-Chromium в WSL: снапшот, клик, консоль, скриншот. Браузер
хостовой Windows для этого не используется — человек смотрит телефон сам через `win_open_url`.

## Окружение

Запускать браузер только обёрткой `.dsh/bin/browser` (Playwright CLI, headless): она уводит
`HOME` и `XDG_CACHE_HOME` в `.playwright/cache`, иначе песочница DSH не даёт Chrome создать
профиль, а демон CLI падает на `mkdir ~/.cache/ms-playwright/daemon`. Настройки — в
`.playwright/cli.config.json` (chromium, viewport 1280×800, `console.level: warning`, вывод в
`.playwright/cache/output`), браузеры — в общем кэше `~/.cache/ms-playwright` (только чтение).
Вызывать `playwright-cli` напрямую не нужно.

Если браузер падает с `error while loading shared libraries`, не хватает системных библиотек
Chromium:

```bash
sudo apt-get install -y libnss3 libnspr4 libxcomposite1 libxdamage1 \
  libxfixes3 libxrandr2 libxrender1 libasound2t64
```

Если `sudo` недоступен, обёртка подхватывает библиотеки из
`.playwright/cache/deps/root/usr/lib/x86_64-linux-gnu` (каталог наполняется вручную, например
распаковкой `.deb`; `LD_LIBRARY_PATH` выставляет `.dsh/bin/browser`).

Если браузера нет: `npm i -g @playwright/cli@latest && playwright-cli install-browser chrome-for-testing`.

## Шаги

1. Поднять dev-сервер (managed background job, порт из `vite.config.js`) и дождаться в выводе
`npm run dev` строки с фактическим адресом:

```bash
npm run dev
curl -sf -o /dev/null http://localhost:<порт>/ && echo ready
```

Порт 3000 может быть занят чужим dev-сервером: Vite молча берёт следующий свободный (3001, 3002, …),
поэтому проверять готовность и ходить браузером нужно по фактическому порту из вывода `npm run dev`
— `curl` по «своему» адресу мимо порта подтвердит готовность чужого приложения.

2. Открыть телефон человеку — инструментом `win_open_url` на фактический URL из вывода
   (`http://localhost:<порт>`).

3. **Весь сценарий проверки выполнять одной командой в одном вызове `bash`.** Демон CLI живёт
   только внутри вызова: между вызовами сессия теряется и следующая команда ответит
   `Browser 'default' is not open`. Шаги соединяются в одну цепочку:

```bash
.dsh/bin/browser open http://localhost:<порт>
.dsh/bin/browser click e21
.dsh/bin/browser console warning
.dsh/bin/browser screenshot
.dsh/bin/browser close
```

Режим только headless: `--headed` падает с «Looks like you launched a headed browser without
having a XServer running» (у песочницы приватный `/tmp`, X-сокет недоступен).

4. Экономить контекст — снапшот не читать целиком:

```bash
.dsh/bin/browser snapshot --depth=4          # частичное дерево
.dsh/bin/browser find "Подключить телефон"   # точечный поиск с контекстом
.dsh/bin/browser console error               # только ошибки
.dsh/bin/browser requests                    # сеть, затем request <index>
.dsh/bin/browser localstorage-list
```

5. Смотреть именно то, что затронуто правкой:

- AD-вход: мок `POST /user/ad` отдаёт `sip_username: 9994` и **пустой `sip_secret`**, `lk_token`
  подписан dev-ключом; проверяются рендер и валидация `PhoneReg`, тумблер и тексты `AuthPad`,
  флаг `displayAuthPad`, переходы HashRouter.
- Тумблер `AuthPad` трёхпозиционный по `phoneControlRdcr.regState` (`off` / `ok` — зелёный /
  `fail` — красный); при потере регистрации показывается AuthPad с красным тумблером, а не
  `PhoneReg`.
- `LkMeet` берёт `lk_room`/`lk_token` из query маршрута (HashRouter, вид `#/?lk_room=...`); без
  AD/`lk_token` показывает информирующий текст, тумблер заблокирован.
- Адреса сервисов — в `localStorage` (`constants/storage.js`: `uriAdAuth`, `uriWebRtc`,
  `uriPhoneDir`, `uriLk`, `uriLkToken`) — для сквозной проверки подставить их через
  `localstorage-set`; чтобы вернуть dev-дефолты, удалить ключи и перезагрузить страницу (корневой
  `index.html` досеивает только отсутствующие ключи).
- dev-сборка включает `redux-logger`: по логу действий проверяются порядок dispatch и
  namespace-инвариант (`AUTHCTL_` не диспатчит `PHONECTL_`, мост — только в `AuthContainer`).
- меню `MenuAppBar` — модальный `Drawer`: пока он открыт, остальное приложение уходит в
  `aria-hidden`, поэтому `snapshot`, `find` и роль-локаторы его не видят — закрывать `Escape`,
  прежде чем искать что-то вне меню.
- SIP-регистрация, звонки, медиа и конференция LiveKit требуют живого сервера (`uriWebRtc` —
  wss, `uriLk`/`uriLkToken`) и разрешений микрофона и камеры. Мок их не заменяет: если сервера
  нет, проверить UI-уровень и прямо написать, что сам звонок не проверялся.
- Service Worker и Notifications (`phoneNotifications`) требуют разрешения на уведомления:
  отказ или отсутствие поддержки даёт информационный текст, а не падение.

6. Отчёт: URL, шаги воспроизведения, что наблюдалось, ошибки консоли и сети. Для визуальной
   правки — скриншот из `.playwright/cache/output/` (показать через `read_image`) плюс ссылка
   для человека через `win_open_url`.

7. Убрать за собой: `.dsh/bin/browser close` и остановить job dev-сервера.

## Признаки проблемы

- ошибки в `console error` (в том числе React warnings о ключах и PropTypes);
- 4xx/5xx в `.dsh/bin/browser requests` — сверить с mock-роутами `mock/vite-mock-api.js`;
- снапшот доступности не содержит ожидаемого элемента или содержит лишний;
- `snapshot` не содержит формы или панели, хотя они видны на скриншоте — открыт drawer меню
  (`aria-hidden`), закрыть `Escape`;
- `Browser 'default' is not open` — шаги разнесены по разным вызовам, а не собраны в один;
- сервер поднялся, но страница пустая — проверить, что dev-job действительно жив, а не упал.
