# Research Task Gateway (draft-only)

Minimal, dependency-free Node.js HTTP gateway reconstructed from the repository's `POST /task` snippet. Requires Node.js 20 or newer.

## Run

Generate a private token locally and set `GATEWAY_CREATE_TOKEN` in your process environment. Do not commit it or paste it into chat.

```sh
npm test
GATEWAY_CREATE_TOKEN="$(openssl rand -hex 32)" npm start
```

`GET /health` returns `{ "status": "ok" }` without authorization. `POST /task` accepts only JSON `{ "topic": "..." }` and requires `Authorization: Bearer <token>`. Authorized requests create an **in-memory draft** and return HTTP 201; no background execution or third-party requests occur. Drafts disappear when the process restarts. The server binds only to 127.0.0.1, port 3000 by default (`PORT` overrides it).

## Security boundaries

Default deny if the token is absent or incorrect. Denied requests never call the task store. Maximum body size 16 KiB, topic length 500 characters. This token is only a local authentication gate, **not** CARINA's exact-action authorization, audit trail, replay protection, or durable idempotency. Do not expose it publicly or connect external execution before those controls are integrated and tested.

## Source compatibility

The previous root file `NODE.JS API GATEWAY` is preserved in GitHub; it was a non-runnable Express code excerpt importing a missing module. This proposal uses built-in `node:http` to avoid dependencies and run isolated tests. It preserves the `POST /task` path but intentionally changes task creation to a draft-only operation.
