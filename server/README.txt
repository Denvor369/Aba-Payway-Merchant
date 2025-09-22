Backend (Node/Express) — ABA PayWay Sandbox
================================================
1) Install Node LTS. In this folder run:
   npm i
   npm run start

2) Server runs on http://localhost:3000
   - GET /                  -> ok
   - POST /payway/create    -> returns checkout HTML
   - POST /payway/callback  -> verifies transaction

3) Put your secrets in .env (already included for sandbox).
   Keep .env private in real projects.
