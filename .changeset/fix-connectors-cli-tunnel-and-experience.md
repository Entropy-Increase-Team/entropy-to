---
"@logto/connector-kakao": patch
"@logto/connector-apple": patch
"@logto/connector-oidc": patch
"@logto/connector-saml": patch
"@logto/connector-mailgun": patch
"@logto/connector-yunpian-sms": patch
"@logto/connector-tencent-sms": patch
"@logto/connector-aliyun-sms": patch
"@logto/connector-aliyun-sms-mas": patch
"@logto/connector-linkedin": patch
"@logto/connector-slack": patch
"@logto/tunnel": patch
"@logto/experience": patch
---

harden connector token/email/endpoint validation, SMS parameter filtering, and tunnel static proxy handling

Enforce Kakao email verification, Apple and OIDC session nonce checks, SAML assertion audience and XML validation, Mailgun endpoint/domain validation, Yunpian SMS error log redaction, LinkedIn and Slack avatar field mapping, SMS connector primitive parameter filtering and generic template fallback, CLI connector installation safety, Tunnel JSON array/MIME/405/token redaction fixes, and Experience web social callback link cleanup.
