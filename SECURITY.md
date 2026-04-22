# Security Policy

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Email **dhruvpatel3f@gmail.com** with:

- A description of the vulnerability and its potential impact
- Steps to reproduce (or a proof-of-concept)
- Any relevant environment info (browser, OS, Groov2e version)

You can expect a response within **72 hours**. If the report is confirmed, a
patch will be prepared and a public advisory issued after a reasonable
disclosure window (typically 14 days, negotiable for critical issues).

## Scope

Issues in scope:
- Client-side logic in `src/` (XSS, prompt injection, data leakage)
- Storage abuse (localStorage, IndexedDB)
- API key exposure in the client bundle

Out of scope:
- Google Gemini / Lyria service vulnerabilities (report to Google)
- Issues that require physical access to the user's machine
- Self-XSS (where the attacker must already have the victim's session)

## Security model

`VITE_GEMINI_API_KEY` is embedded in the **client-side JavaScript bundle**
and is visible to anyone who inspects the page source. This is inherent to
the current architecture (a Vite SPA with no server component).

**Do not deploy a build with a personal or high-quota key.** For any
Internet-facing deployment, use a server-side proxy that holds the key and
exposes rate-limited endpoints to the front end.
