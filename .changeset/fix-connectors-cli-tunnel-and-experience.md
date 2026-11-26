---
"@logto/connector-kakao": patch
"@logto/connector-apple": patch
"@logto/connector-azuread": patch
"@logto/connector-oidc": patch
"@logto/connector-saml": patch
"@logto/connector-mailgun": patch
"@logto/connector-yunpian-sms": patch
"@logto/connector-tencent-sms": patch
"@logto/connector-aliyun-sms": patch
"@logto/connector-aliyun-sms-mas": patch
"@logto/connector-linkedin": patch
"@logto/connector-slack": patch
---

harden connector authentication, email and header validation, and cross-platform authority URLs

Enforce verified email checks on Kakao, preserve session errors and native nonces on Apple, fix Windows authority URL construction on Azure AD, tighten OIDC nonce/timeout/customConfig handling, validate SAML metadata XML and assertion audiences, harden Mailgun domain/endpoint/header sanitization, redact and safely parse Yunpian SMS error responses, stabilize positional SMS template parameters on Tencent and Aliyun SMS connectors, and map avatar fields cleanly on LinkedIn and Slack.
