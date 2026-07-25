function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve({ rawBody: raw });
      }
    });
  });
}

export const mockEndpoints = [
  {
    // см. исходный phone/mock/ad-auth-server.mjs
    path: '/ad',
    methods: ['POST'],
    handler(req, res, { body }) {
      const login = typeof body.login === 'string' ? body.login : '';
      const password = typeof body.password === 'string' ? body.password : '';

      sendJson(res, 200, {
        message: 'Mock AD auth success',
        sip_username: '9993',
        sip_secret: '',
        lk_token: 'Mock LK Token',
        ad_login: login,
        ad_cn: 'Mock User',
        ad_title: 'Mock Title',
        ad_department: 'Mock Department',
      });
    },
  },
  {
    path: '/lk',
    methods: ['GET', 'POST'],
    handler(req, res, { body }) {
      if (req.method === 'GET') {
        sendJson(res, 200, { message: 'Mock test endpoint (GET)' });
        return;
      }

      sendJson(res, 200, { message: 'Mock test endpoint (POST)', received: body });
    },
  },
];

export function mockApiPlugin(endpoints = mockEndpoints) {
  return {
    name: 'mock-api',
    apply: 'serve', // только для `vite dev`, в build не подключается
    configureServer(server) {
      for (const { path, methods, handler } of endpoints) {
        server.middlewares.use(path, async (req, res) => {
          if (req.method === 'OPTIONS') {
            res.writeHead(200, {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': `${methods.join(', ')}, OPTIONS`,
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
              Allow: `${methods.join(', ')}, OPTIONS`,
            });
            res.end(JSON.stringify({ ok: true }));
            return;
          }

          if (!methods.includes(req.method)) {
            sendJson(res, 405, { error: `Only ${methods.join('/')} are supported` });
            return;
          }

          const body = ['POST', 'PUT', 'PATCH'].includes(req.method)
            ? await readJsonBody(req)
            : {};

          handler(req, res, { body });
        });
      }
    },
  };
}