# LIFF Local Development

LINE requires the LIFF endpoint URL to be HTTPS and reachable from the LINE app (which opens it
in an in-app browser). `apps/liff`'s Vite dev server (`http://localhost:3006`) is plain HTTP and
only reachable on your machine, so local testing inside the LINE app requires tunneling it over
HTTPS.

## 1. Start the LIFF dev server

```bash
pnpm dev:liff
```

Runs on `http://localhost:3006`.

## 2. Expose it over HTTPS with a tunnel

Either tool works; pick whichever you already have installed.

### ngrok

```bash
ngrok http 3006
```

Copy the `https://<random>.ngrok-free.app` URL it prints.

### cloudflared

```bash
cloudflared tunnel --url http://localhost:3006
```

Copy the `https://<random>.trycloudflare.com` URL it prints.

Both tools mint a new random URL every time you restart the tunnel (unless you've set up a
reserved/named tunnel) — you'll need to re-register the LIFF endpoint URL (step 3) each time it
changes.

## 3. Register the tunnel URL as the LIFF endpoint

1. Open the [LINE Developers Console](https://developers.line.biz/console/) → your channel → LIFF tab
2. Edit (or create) the LIFF app entry
3. Set **Endpoint URL** to the HTTPS tunnel URL from step 2
4. Save

## 4. Open it inside LINE

Use the LIFF URL LINE gives you (`https://liff.line.me/<liff-id>`) — open it from a chat or via
QR code scanned inside the LINE app. Opening the tunnel URL directly in a regular desktop/mobile
browser does **not** exercise the LIFF SDK context (`liff.init()`, LINE user profile, etc.).

## Notes

- CORS: `apps/server`'s `CORS_ALLOWED_ORIGINS` must include the tunnel origin if `apps/liff` will
  call the API through the tunnel (usually not needed — the LIFF app talks to `apps/server` at
  `API_BASE_URL` directly, not through the tunnel; the tunnel only fronts the LIFF static app).
- The tunnel URL changes on every restart unless using a paid/reserved tunnel — re-check the LIFF
  Endpoint URL in the LINE Developers Console if login stops working after restarting the tunnel.
