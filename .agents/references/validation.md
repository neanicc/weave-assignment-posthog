# Validation routes

Inspect `package.json` before naming a command.

| Changed surface | Checks |
| --- | --- |
| Docs, skills | `git diff --check`; inspect links |
| `src/lib/**` (scoring, classification, bots) | `npx vitest run`, `npx tsc --noEmit` |
| `scripts/**` (fetch, build-data) | `npx tsc --noEmit`; rerun `npm run build-data` and diff `public/data.json` stats |
| UI | `npm run build`; open `npm run preview` and check light + dark, laptop width (1440×900) with the top 5 visible without scrolling, drawer open/close, window toggle |
| Whole project / PR signoff | `npm run check` |

Evidence kinds: **automated** (typecheck, unit tests, build) and **visual**
(a browser check of the built page). Say plainly which ones ran for the current
head. Never weaken assertions to get green results.
