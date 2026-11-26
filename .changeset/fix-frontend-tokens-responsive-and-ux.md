---
"@logto/experience": patch
"@logto/account": patch
"@logto/console": patch
"@logto/elements": patch
"@logto/tunnel": patch
---

fix frontend design tokens, auth session state, mobile responsiveness, and static proxy handling

Resolve undefined CSS design tokens across Experience, Account Center, Console, and Elements, preserve OAuth callback session parameters and synchronous verification state in Experience, sanitize custom HTML content, restore responsive navigation and scrollable modals on mobile viewports in Account Center, point Elements profile client to `/api/my-account`, and harden Tunnel static file `HEAD`, directory, and verbose token redaction behavior.
