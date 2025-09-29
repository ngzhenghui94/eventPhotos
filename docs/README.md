## Documentation

This folder contains comprehensive documentation for the project: public HTTP APIs, server/library functions, UI components, and feature guides with end-to-end usage examples.

- API Reference: see `docs/api-reference.md`
- Functions Reference: see `docs/functions-reference.md`
- Components Reference: see `docs/components-reference.md`
- Features Guide: see `docs/features.md`
- CDN Setup: see `docs/hetzner-cdn.md`

### Conventions

- **Base URL**: during development use `http://localhost:3000`. In production, replace with your domain.
- **Authentication**: Most endpoints use a `session` cookie issued after Google OAuth.
- **Access control for events**:
  - Public events: no code required
  - Private events: provide the 6-character access code via one of:
    - Request header `x-access-code: ABC123`
    - Query string `?code=ABC123`
    - Cookie set by the UI: `evt:{eventCode}:access = ABC123`
- **Content types**:
  - JSON for most APIs
  - `multipart/form-data` for legacy `POST /api/photos` uploads
  - Direct-to-S3 uploads via presigned `PUT` URLs returned by `/api/photos/presign`
- **Redirects**: Many image endpoints return HTTP 307 redirects to short-lived S3 signed URLs.

For details and examples, follow the links above.

