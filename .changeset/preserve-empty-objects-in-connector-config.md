---
"@logto/core": patch
---

preserve empty objects such as `auth: {}` when saving connector configurations

Connector creation and update endpoints no longer strip empty objects from validated connector `config` payloads, allowing unauthenticated SMTP relays configured with `"auth": {}` to save and send emails without `connector.invalid_config` errors.
