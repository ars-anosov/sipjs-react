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
    path: '/ad',
    methods: ['POST'],
    handler(req, res, { body }) {
      const login = typeof body.login === 'string' ? body.login : ''
      const password = typeof body.password === 'string' ? body.password : ''

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
    path: '/lk',
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
]

// Единый плагин, который навешивает все endpoints на dev-сервер Vite.
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
            })
            res.end(JSON.stringify({ ok: true }))
            return
          }

          if (!methods.includes(req.method)) {
            sendJson(res, 405, { error: `Only ${methods.join('/')} are supported` })
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

          handler(req, res, { body })
        })
      }
    },
  }
}