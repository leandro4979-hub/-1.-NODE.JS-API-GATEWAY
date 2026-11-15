import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { createTaskStore } from './routes/research.js';

function hasPermission(header, expectedToken) {
  if (!expectedToken || !header?.startsWith('Bearer ')) return false;
  const supplied = Buffer.from(header.slice(7));
  const expected = Buffer.from(expectedToken);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function createHandler({ token = '', store = createTaskStore() } = {}) {
  return async (req, res) => {
    const reply = (status, body) => {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET' && req.url === '/health') return reply(200, { status: 'ok' });
    if (req.method !== 'POST' || req.url !== '/task') return reply(404, { error: 'not_found' });

    // Authenticate before parsing or touching downstream task storage.
    if (!hasPermission(req.headers.authorization, token)) return reply(403, { error: 'forbidden' });
    if (!(req.headers['content-type'] ?? '').toLowerCase().startsWith('application/json')) {
      return reply(415, { error: 'json_required' });
    }
    let raw = '';
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 16_384) return reply(413, { error: 'payload_too_large' });
      }
      const body = JSON.parse(raw);
      if (!body || typeof body !== 'object' || Array.isArray(body) ||
          typeof body.topic !== 'string' || !body.topic.trim() || body.topic.length > 500 ||
          Object.keys(body).some(key => key !== 'topic')) {
        return reply(400, { error: 'invalid_task' });
      }
      return reply(201, store.create(body));
    } catch {
      return reply(400, { error: 'invalid_json' });
    }
  };
}

export function startServer({ token = process.env.GATEWAY_CREATE_TOKEN, port = process.env.PORT ?? '3000' } = {}) {
  if (!token) throw new Error('GATEWAY_CREATE_TOKEN must be configured');
  const numericPort = Number(port);
  if (!Number.isInteger(numericPort) || numericPort < 0 || numericPort > 65535) throw new Error('Invalid PORT');
  const server = http.createServer(createHandler({ token }));
  server.listen(numericPort, '127.0.0.1');
  return server;
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  const server = startServer();
  server.on('listening', () => console.log(`Draft gateway listening on http://127.0.0.1:${server.address().port}`));
}
