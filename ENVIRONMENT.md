Environment variables
=====================

Create a `.env.local` at the project root with at least the following:

```
# AWS S3 for photos
AWS_REGION=ap-southeast-1
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET
AWS_S3_BUCKET=event-photo-app

# Database
POSTGRES_URL=postgres://...

# Auth
AUTH_SECRET=change-me

# Optional
BASE_URL=http://localhost:3000
```

Restart the dev server after editing `.env.local`.
