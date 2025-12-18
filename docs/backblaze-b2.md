# Backblaze B2 (S3-compatible) setup

This app uses the AWS SDK against an **S3-compatible** endpoint. Backblaze B2 supports this via its S3 API.

## Environment variables

Set these in `.env.local`:

```
S3_ENDPOINT=https://s3.<region>.backblazeb2.com
S3_REGION=<region>                # e.g. us-west-004
S3_ACCESS_KEY_ID=<B2 keyID>
S3_SECRET_ACCESS_KEY=<B2 applicationKey>
S3_BUCKET=<your bucket name>

# Optional: B2 usually works without path-style URLs
S3_FORCE_PATH_STYLE=false
```

Notes:
- Keep `S3_ENDPOINT` on **https** (browser uploads will fail on mixed-content).
- If you were previously using `HETZNER_S3_*`, those env vars are still supported as a fallback.

## CORS

Configure your B2 bucket CORS to allow:
- `GET`, `PUT`
- Your production origin + `http://localhost:3000`
- `AllowedHeader: *`
- Expose `ETag`

## Migrating existing objects (one-time)

If you are switching providers, you’ll need to copy existing objects from the old bucket to B2.

Two common approaches:
- **rclone**: configure two remotes (old S3 + B2 S3) and run `rclone sync`.
- **AWS CLI**: if both ends are reachable via S3 API, use `aws s3 sync` (requires configuring endpoints/credentials).

After the copy, switch the app env vars to point at B2 and redeploy.


