# Wire protocol `spen-bridge/1`

This document is the same contract as `docs/PEN_BRIDGE_PROTOCOL.md` in `excalidraw-spen-bridge`.

## Transport

- WebSocket (RFC 6455), text frames only, UTF-8 JSON, one object per frame, at most 1024 bytes per frame.
- The bridge listens on `ws://127.0.0.1:47631/v1/pen`. It binds 127.0.0.1 only.
- `GET /health` stays `{"ok":true}` with no auth. `GET /events` stays for the legacy `open-menu` envelope and is deprecated.
- Origin allowlist during the HTTP upgrade: `http://localhost`, `capacitor://localhost`, `app://obsidian.md`. A missing `Origin` is allowed. Anything else is HTTP 403.
- The pairing secret never crosses the wire. Auth is the challenge-response below.

## Pairing

- Secret: 32 random bytes in the bridge `SecretStore`.
- Pairing code: that secret as base64url with no padding (43 characters).
- Fingerprint: the first 8 characters of RFC 4648 base32 of `SHA-256(secret)`, shown as `XXXX-XXXX`.

## Handshake

1. The client opens the WebSocket.
2. Server sends `hello` immediately: `type`, `proto` 1, `app` `excalidraw-spen-bridge`, `appVersion`, `nonce` (base64url 16 bytes), `caps` `["button","command"]`.
3. Within 3000 ms the client sends `auth`: `proto` 1, `client` `excalidraw-stylus-controls`, `clientVersion`, `clientNonce`, and `proof = base64url(HMAC-SHA256(secret, "spen-bridge/1|client|" + nonce + "|" + clientNonce))`. Otherwise the server closes `4408`.
4. A `proto` other than 1 closes `4400`. A bad proof closes `4401`. On success the server sends `ready` with `session`, `serverProof`, `heartbeatMs` 1000, `source`, and the current `button`.
5. `serverProof = base64url(HMAC-SHA256(secret, "spen-bridge/1|server|" + nonce + "|" + clientNonce))`. The client closes `4401` if it does not match.

Before `ready` the server sends nothing else. Before `auth` the client sends nothing else.

## Messages after `ready`

| Direction | type      | Meaning                                                                                                                                                        |
| --------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S→C       | `button`  | Barrel level change. `button` is `primary`, plus `down`, `seq`, `t` (kernel Unix epoch ms), `sent`.                                                            |
| S→C       | `ping`    | Every `heartbeatMs`. Carries the current `down` and last `seq`.                                                                                                |
| C→S       | `pong`    | Echoes the ping `sent`.                                                                                                                                        |
| S→C       | `source`  | `ok` or `unavailable`. Reasons include `shizuku-not-running`, `shizuku-permission-denied`, `no-pen-node`, `permission-denied`, `selinux-denied`, `read-error`. |
| S→C       | `command` | `action` `open-menu`, plus `seq` and `sent`.                                                                                                                   |

`button` and `ping` carry the absolute level. The client ignores a `button` whose `seq` is not newer. Unknown `type` values are ignored. Malformed JSON makes the server close `4400`; the client logs and ignores that frame.

If `|Date.now() - t| > 1000`, the client treats `t` as unreliable and uses receive time. No frame for 3000 ms means the client closes and applies `down: false`. A client that does not answer a ping for 5000 ms is closed `1001`. Up to 4 clients receive every frame.

Close codes: `1000` normal, `1001` going away or heartbeat timeout, `4400` protocol, `4401` auth, `4403` origin (normally HTTP 403), `4408` auth timeout.

The client reconnects with backoff 250, 500, 1000, 2000, then 5000 ms, plus or minus 20 percent, and resets that sequence after `ready`. It connects only while a supported view is open and the document is visible. It does not retry `4400` or `4401`. Any disconnect applies `down: false`. Rotating the pairing secret closes clients with `4401`.

## Shared test vectors

- secret bytes `0x00` through `0x1f` → pairing code `AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8`
- nonce `AAAAAAAAAAAAAAAAAAAAAA`, clientNonce `AQEBAQEBAQEBAQEBAQEBAQ`
- client proof `mL30Scw9qhI2CwHAUh6P1JmgTJEUSN5xtvhBEB20-oE`
- server proof `d1mX914nyIaHxRXrKF0yk1AnUp7-zeU3FRBWUqnil-U`
- fingerprint `MMG4-2KLG`
- WebSocket accept key `dGhlIHNhbXBsZSBub25jZQ==` → `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`
