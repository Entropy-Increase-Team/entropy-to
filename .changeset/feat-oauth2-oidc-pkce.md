---
"@logto/connector-oauth": minor
"@logto/connector-oidc": minor
"@logto/cli": patch
"@logto/console": patch
"@logto/experience": patch
---

support PKCE (`S256`) in standard OAuth 2.0 and OIDC social connectors and harden OAuth callback and connector form UX

Standard OAuth 2.0 and OIDC connectors now support enabling Proof Key for Code Exchange (`S256`), HTTP/HTTPS endpoint validation, and reserved parameter isolation, alongside Windows connector junction linking and social sign-in callback state protection.
