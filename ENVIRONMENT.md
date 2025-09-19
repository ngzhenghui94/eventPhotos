Environment variables
=====================

Create a `.env.local` at the project root with at least the following:

```
# Hetzner S3-compatible storage (required)
# IMPORTANT: Use an HTTPS endpoint in production to avoid mixed-content errors during uploads.
HETZNER_S3_ENDPOINT=https://your-hetzner-endpoint.example.com
HETZNER_S3_REGION=eu-central-1
HETZNER_S3_ACCESS_KEY=YOUR_KEY
HETZNER_S3_SECRET_KEY=YOUR_SECRET
HETZNER_S3_BUCKET=event-photo-app

# Database
POSTGRES_URL=postgres://...

# Auth
AUTH_SECRET=change-me

# Optional
# For production, set to your https domain (e.g. https://events.example.com)
BASE_URL=http://localhost:3000
```

Restart the dev server after editing `.env.local`.

Bucket CORS configuration (required for browser uploads)
-------------------------------------------------------
Allow your production origin to perform PUT and GET requests against the bucket. Example (AWS-style CORS config):

```
<CORSConfiguration>
	<CORSRule>
		<AllowedOrigin>https://your-domain.example.com</AllowedOrigin>
		<AllowedMethod>GET</AllowedMethod>
		<AllowedMethod>PUT</AllowedMethod>
		<AllowedHeader>*</AllowedHeader>
		<ExposeHeader>ETag</ExposeHeader>
	</CORSRule>
	<CORSRule>
		<AllowedOrigin>http://localhost:3000</AllowedOrigin>
		<AllowedMethod>GET</AllowedMethod>
		<AllowedMethod>PUT</AllowedMethod>
		<AllowedHeader>*</AllowedHeader>
		<ExposeHeader>ETag</ExposeHeader>
	</CORSRule>
```

Notes
-----
- If uploads work locally but fail in production with status 0 or "Network error", check:
	- Your bucket CORS allows your production origin for PUT.
	- HETZNER_S3_ENDPOINT uses https in production (mixed content is blocked by browsers).
	- Presigned URL hasn't expired (default is 1 hour).
