import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import http from 'node:http';
import { createHandler } from '../server/index.js';

const servers = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(s => new Promise(resolve => s.close(resolve)))); });

async function call({ token = 'test-token', authorization, method = 'POST', path = '/task', body = { topic: 'Study MJX' }, store } = {}) {
  const server = http.createServer(createHandler({ token, store }));
  servers.push(server);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}${path}`, {
    method,
    headers: { ...(authorization ? { authorization } : {}), 'content-type': 'application/json' },
    ...(method !== 'GET' ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, json: await response.json() };
}

test('denial triggers zero downstream calls', async () => {
  let calls = 0;
  const store = { create() { calls++; throw new Error('must not be called'); } };
  assert.equal((await call({ store })).status, 403);
  assert.equal((await call({ store, authorization: 'Bearer wrong' })).status, 403);
  assert.equal((await call({ store, token: '', authorization: 'Bearer test-token' })).status, 403);
  assert.equal(calls, 0);
});

test('authorized creation returns draft only', async () => {
  const result = await call({ authorization: 'Bearer test-token' });
  assert.equal(result.status, 201);
  assert.equal(result.json.status, 'draft');
  assert.equal(result.json.topic, 'Study MJX');
  assert.ok(result.json.id);
});

test('rejects invalid input without storing', async () => {
  let calls = 0;
  const store = { create() { calls++; } };
  const r = await call({ authorization: 'Bearer test-token', body: { topic: 'x', execute: true }, store });
  assert.equal(r.status, 400);
  assert.equal(calls, 0);
});

test('health check does not require credentials', async () => {
  const r = await call({ method: 'GET', path: '/health' });
  assert.deepEqual(r, { status: 200, json: { status: 'ok' } });
});
