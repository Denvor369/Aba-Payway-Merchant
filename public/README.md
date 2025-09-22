# ABA PayWay — Sandbox Integration (Drop‑in PHP)
_Last updated: 2025-09-16 09:11:21 UTC_

This package gives you a **working sandbox purchase flow** for ABA PayWay with a hosted checkout page,
plus a pushback (webhook) handler and a simple test UI. Keep your keys private.

## Files
- `config.php` — put your sandbox keys and settings here (never commit to git).
- `helpers.php` — small utilities (hash builder, formatters, curl, logging).
- `create_payment.php` — builds params, signs with HMAC‑SHA512, posts to **/payments/purchase**, echoes the checkout HTML.
- `pushback.php` — receives PayWay pushback (your `return_url`), logs it, and (optionally) notifies Telegram.
- `test_checkout.php` — a minimal test page to create a sandbox payment.
- `check_status.php` — utility to check recent transaction status (≤ 7 days) if needed.
- `logs/` — pushback logs for debugging in sandbox.

## Quick Start
1) **Upload the `aba_payway_sandbox/` folder to your PHP host** (public URL required & whitelisted by PayWay).
   - If you are local, use **Cloudflare Tunnel** or **ngrok** to expose a public URL.
2) Open `config.php` and **paste your sandbox keys** (merchant id, public key). Save.
3) In `config.php`, set `$config['base_url']` to your public host (e.g., `https://your-domain.com/aba_payway_sandbox`).
4) Visit `https://your-domain.com/aba_payway_sandbox/test_checkout.php` in your browser.
5) Click **Create Payment** → you should be redirected/rendered ABA hosted checkout (Sandbox). Complete with **test cards**.
6) ABA will `POST` the result to your `return_url` (we point to `pushback.php`). Check `logs/pushback.log` for details.

> **Important sandbox notes**
> - **Whitelisting**: calls must originate from whitelisted domain/IP, or you'll get `6: wrong domain`.
> - **KHR amounts** must be integers; **USD** has two decimals.
> - `req_time` is UTC `YYYYmmddHis`. `items`, `return_url`, `cancel_url` are Base64‑encoded.
> - Hash is **HMAC‑SHA512** over a **strict field order** (include only fields you send), then **Base64**.
> - For proper verification on pushback, you may additionally call the **check-transaction** API; a helper is included.

## Hooking Telegram (optional)
Set in `config.php`:
- `$config['telegram_bot_token'] = '123:ABC';`
- `$config['telegram_chat_id'] = '-1001234567890';`

On **successful** pushback, a short message is sent.

## Going live
- Replace the sandbox endpoint with production endpoints.
- Swap your sandbox keys for production keys.
- Ensure production domains/IPs are whitelisted by PayWay.
