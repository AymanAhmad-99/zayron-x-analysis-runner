# D1 Validation Safety Gate

Target: `zayron-x-preview-db` / `34962f8f-abd1-4b0b-8bd7-b4eab59bd902` / `preview`.

Production exclusion assertions:

```text
target_id != 91ed8f95-95ad-4451-bb18-e0d1dbadbe53
target_name != zayron-x-intelligence-db
target_environment != production
```

Migration commands use the explicit target name `zayron-x-preview-db` and never use the production Worker configuration. If any assertion fails, no mutation is permitted.
