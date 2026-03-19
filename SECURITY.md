# Security Policy

## Supported Versions

| Version | Supported |
|---|---|
| Latest `main` branch | ✅ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in FinVision AI, please email **spmsuhas@gmail.com** with:

1. A description of the vulnerability and its potential impact.
2. Steps to reproduce or proof-of-concept code.
3. Any suggested mitigations you are aware of.

You will receive an acknowledgement within **72 hours** and a resolution timeline within **7 days**.

## Security Considerations for Contributors

- **Never commit `.env` files** or Firebase credentials. The `.gitignore` blocks them, but double-check before pushing.
- **All Firestore Security Rules** must enforce `request.auth.uid == resource.data.uid` — no cross-tenant reads.
- **Firebase App Check** must remain enabled on all production deployments to prevent API abuse.
- This project processes **sensitive personal financial data**. Any new data field stored in Firestore must be documented and reviewed.
- Do not add third-party analytics SDKs without maintainer approval and a privacy policy update.
