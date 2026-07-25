import http from 'node:http'

const PORT = Number(process.env.MOCK_AD_AUTH_PORT || 3101)
const HOST = process.env.MOCK_AD_AUTH_HOST || '0.0.0.0'

const sendJson = (res, statusCode, payload, extraHeaders = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...extraHeaders,
  }

  res.writeHead(statusCode, headers)
  res.end(JSON.stringify(payload))
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true }, { Allow: 'POST, OPTIONS' })
    return
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Only POST is supported' })
    return
  }

  let body = ''
  req.on('data', (chunk) => {
    body += chunk.toString()
  })

  req.on('end', () => {
    let parsedBody = {}
    try {
      parsedBody = body ? JSON.parse(body) : {}
    } catch {
      parsedBody = { rawBody: body }
    }

    const login = typeof parsedBody.login === 'string' ? parsedBody.login : ''
    const password = typeof parsedBody.password === 'string' ? parsedBody.password : ''

    sendJson(res, 200, {
      message: 'Mock AD auth success',
      sip_username: '',
      sip_secret: '',
      ad_cn: 'Mock User',
    })
  })
})

server.listen(PORT, HOST, () => {
  console.log(`Mock AD auth server listening at http://${HOST}:${PORT}`)
})
