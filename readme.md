# Fintech Microservices Demo

A small fintech system with a React UI and a Playwright test suite.

| Part | Tech | Port |
|---|---|---|
| `gateway` | Node/Express, JWT auth, proxies `/api/*` | 8080 (only service exposed) |
| `user-service` | Node/Express + MongoDB | internal |
| `transaction-service` | Node/Express + MongoDB | internal |
| `notification-service` | Node/Express + Redis | internal |
| `web` | React + Vite | 5173 |
| `automation` | Playwright + TypeScript | – |

## Prerequisites

- Node.js 20+ and npm
- A container runtime with Compose:
  - **Docker Desktop**, or
  - **Colima** (no admin rights needed on macOS): `brew install colima docker docker-compose`

## 1. Run the services locally

From the repo root:

```bash
# Start the container runtime (Colima only; skip if you use Docker Desktop)
colima start

# Build and start gateway, 3 services, 2 MongoDB instances and Redis
docker-compose up --build -d      # use `docker compose` if you have the plugin

# Check it
docker-compose ps
curl http://localhost:8080/health   # {"status":"ok"}
```

Optional: set a JWT secret (default is `dev-secret-change-me`):

```bash
JWT_SECRET=my-secret docker-compose up --build -d
```

Useful commands:

```bash
docker-compose logs -f gateway       # tail logs (or any service name)
docker-compose down                  # stop everything (add -v to wipe the databases)
colima stop                          # stop the VM when you're finished
```

### API reference (all through the gateway, `http://localhost:8080`)

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/users/register` | no | `{name, email, password}` |
| POST | `/api/users/login` | no | `{email, password}` → `{token, user}` (token valid 1 hour) |
| GET | `/api/users/:id` | yes | public profile |
| POST | `/api/transactions` | yes | `{toUserId, amount, currency?}`; sender is the token's user |
| GET | `/api/transactions` | yes | transactions you sent or received, newest first |
| GET | `/api/transactions/:id` | yes | only if you are a party |
| GET | `/api/notifications` | yes | your notifications (creating them is internal-only) |

Send the token as `Authorization: Bearer <token>`.

Quick try:

```bash
curl -XPOST localhost:8080/api/users/register -H 'content-type: application/json' \
  -d '{"name":"Ann","email":"ann@example.com","password":"pw"}'
curl -XPOST localhost:8080/api/users/login -H 'content-type: application/json' \
  -d '{"email":"ann@example.com","password":"pw"}'
```

## 2. Run the web app

The backend from step 1 must be running. In a second terminal:

```bash
cd web
npm install
npm run dev
```

Open **http://localhost:5173**. Click **Register** to create an account, or sign in with an existing one.
You can view your transactions, send money to another user (paste their user ID) and see notifications.

The dev server proxies `/api` to `http://localhost:8080`. To point at a different gateway:

```bash
GATEWAY_URL=http://other-host:8080 npm run dev
```

Production build: `npm run build` (output in `web/dist`).

## 3. Run the automation test suite

The backend (step 1) and the web app (step 2) must both be running.

```bash
cd automation
npm install
npx playwright install chromium     # first time only

npm test                            # all tests (API + UI)
npm run test:api                    # API tests only
npm run test:ui                     # UI tests only
npx playwright test --grep @smoke   # smoke tests only
npm run report                      # open the HTML report
```

### Environments

Local is the default. Choose another with `TEST_ENV`, or override single values:

```bash
TEST_ENV=staging npm test
API_URL=http://host:8080 UI_URL=http://host:5173 JWT_SECRET=my-secret npm test
```

Environments are defined in `automation/config/environments.ts` (the staging URLs are placeholders).
If you started the services with a custom `JWT_SECRET`, pass the same value to the tests. Only the expired-token test uses it.

### Reports

Written to `automation/reports/`:

- `html/` – browsable report (`npm run report`)
- `results.json` and `junit.xml` – for CI
- `artifacts/` – screenshots and traces for failed UI tests

Every test that calls the API attaches an `api-log.json` (passwords and tokens redacted).

### Layout

```
automation/
  config/environments.ts   per-environment URLs
  src/factories            unique test data per call
  src/helpers              API client with request logging, JWT helper
  src/assertions.ts        custom matchers
  src/fixtures.ts          api, alice, bob (fresh users per test)
  src/pages                page objects
  tests/api  tests/ui
```

## Troubleshooting

- **`docker: command not found`** – install Docker Desktop or Colima (see Prerequisites), then `colima start`.
- **`Cannot connect to the Docker daemon`** – run `colima start` (or open Docker Desktop).
- **`docker compose` not recognised** – use `docker-compose` (hyphen).
- **UI tests fail to connect** – confirm `curl localhost:8080/health` works and `npm run dev` is running in `web/`.
- **Port 8080 or 5173 already in use** – stop the other process, or change the port mapping in `docker-compose.yml` / `web/vite.config.js`.
