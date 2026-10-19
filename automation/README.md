# Automation framework

Playwright + TypeScript. API tests run against the gateway, UI tests against the React app.

## Run
```bash
npm install && npx playwright install chromium
docker-compose up -d          # from repo root: the backend
(cd ../web && npm run dev)    # the UI, port 5173
npm test                      # everything
npm run test:api | test:ui
TEST_ENV=staging npm test     # other environment (see config/environments.ts)
npm run report                # open the HTML report
```
Overrides: `API_URL`, `UI_URL`, `JWT_SECRET`. Filter with `--grep @smoke`.

## Layout
- `config/environments.ts` – per-environment URLs, selected by `TEST_ENV`
- `src/factories` – unique-per-call user/transaction data (no shared state, so no cleanup needed)
- `src/helpers` – `ApiClient` (logs + redacts every call), JWT forging helper
- `src/assertions.ts` – custom matchers: `toHaveStatus`, `toBeValidUser`, `toBeValidTransaction`, `toBeWithinResponseTime`
- `src/fixtures.ts` – `api`, `alice`, `bob` (fresh registered users per test)
- `src/pages` – page objects
- `tests/api`, `tests/ui`

## Reports (`reports/`)
HTML (`html/`), JSON (`results.json`), JUnit (`junit.xml`). UI failures keep a screenshot and trace
in `reports/artifacts`; every test with API calls gets an `api-log.json` attachment.
