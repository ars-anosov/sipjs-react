import bodyParser from 'body-parser'
import jwt from 'jsonwebtoken'

const jsonBodyParser = bodyParser.json()
const lkApiKey = 'devkey'
const lkApiSecret = 'secret'

function lkToken(room = '9993', num = '9993', exp = '1h') {
  const jwtPayload = {
    video: {
      roomJoin: true,
      room: room,
    },
  }
  return jwt.sign(jwtPayload, lkApiSecret, {
    issuer: lkApiKey,
    subject: num,
    expiresIn: exp,
  })
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

function parseJsonBody(req, res) {
  return new Promise((resolve, reject) => {
    jsonBodyParser(req, res, (err) => {
      if (err) {
        reject(err)
        return
      }
      resolve(req.body || {})
    })
  })
}

export const mockEndpoints = [
  {
    path: '/user/ad',
    methods: ['POST'],
    handler(req, res, { body }) {
      const login = typeof body.login === 'string' ? body.login : ''
      sendJson(res, 200, {
        sip_username: '9993',
        sip_secret: '',
        lk_token: lkToken('9993', '9993', '1h'),
        ad_login: login,
        ad_cn: 'Mock User',
        ad_title: 'Mock Title',
        ad_department: 'Mock Department',
      })
    },
  },
  {
    path: '/user/lk',
    methods: ['POST'],
    handler(req, res, { body }) {
      const room = typeof body.room === 'string' ? body.room : ''
      const num = typeof body.num === 'string' ? body.num : ''
      sendJson(res, 200, {
        lk_room: room,
        lk_num: num,
        lk_token: lkToken(room, num, '1h'),
      })
    },
  },
  {
    path: '/user/phonedir',
    methods: ['GET'],
    handler(req, res) {
      // Пример чтения query-параметров, если клиент сделает запрос: /stat/prefix?type=all
      const url = new URL(req.url, `http://${req.headers.host}`)
      const typeParam = url.searchParams.get('type') || 'default'

      sendJson(res, 200, [
        { label: 'Москва префикс', prefix: '1999' },
        { label: 'Спб префикс', prefix: '1923' },
        { label: 'Пользователь с длинным именем каким-то', num: '9991', email: 'user@example.com' },
        { label: 'Пользователь без почты', num: '9992' },
      ])
    },
  },
]

export function mockApiPlugin(endpoints = mockEndpoints) {
  return {
    name: 'mock-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const requestPath = url.pathname

        const endpoint = endpoints.find((e) => e.path === requestPath)

        if (!endpoint) {
          return next()
        }

        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': `${endpoint.methods.join(', ')}, OPTIONS`,
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            Allow: `${endpoint.methods.join(', ')}, OPTIONS`,
          })
          res.end(JSON.stringify({ ok: true }))
          return
        }

        if (!endpoint.methods.includes(req.method)) {
          sendJson(res, 405, { error: `Only ${endpoint.methods.join('/')} are supported` })
          return
        }

        let body = {}
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
          try {
            body = await parseJsonBody(req, res)
          } catch {
            sendJson(res, 400, { error: 'Invalid JSON body' })
            return
          }
        }

        endpoint.handler(req, res, { body })
      })
    },
  }
}
