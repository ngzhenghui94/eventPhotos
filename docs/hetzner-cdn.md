# S3-compatible CDN notes (Backblaze B2 / Hetzner / R2 / S3)

If you want to front your S3-compatible bucket with a CDN, you have a few options. The goals:
- Serve objects over HTTPS on a stable hostname
- Cache long-lived objects aggressively (thumbs/originals)
- Keep app 307 redirects short-lived (we set `Cache-Control: private, max-age=60` on redirects already)

## Option A: Cloudflare in front of S3 endpoint

1. Create a proxied DNS record, e.g. `cdn.example.com` → your S3 endpoint host.
2. Page Rules / Cache Rules:
   - Cache Level: Cache Everything for `*/thumbs/*`
   - Edge Cache TTL: 1 year (31536000)
   - Respect origin headers (we set `Cache-Control: public, max-age=31536000, immutable` on thumbs)
3. Bypass cache for signed URLs if needed. Since we use query-signed URLs that change, default behavior is safe.
4. Enable HTTP/2/3, Brotli, and Early Hints.

## Option B: Provider load balancer / caching layer (if available)

If available in your region, configure:
- Backend: S3 endpoint
- TLS termination
- Caching policy: respect origin cache headers; set min TTL for `thumbs/` paths.

## Example Nginx as a simple CDN edge

```
server {
  server_name cdn.example.com;
  listen 443 ssl http2;

  # ... ssl certs ...

  location / {
    proxy_pass https://your-s3-endpoint-host;
    proxy_set_header Host your-s3-endpoint-host;
    proxy_set_header X-Forwarded-Proto https;

    # Respect origin caching; optionally enforce a floor for thumbs
    proxy_ignore_headers Cache-Control Expires;
    add_header Cache-Control $upstream_http_cache_control always;

    # Only for thumbs, enforce long cache if origin missing headers
    if ($request_uri ~* \/thumbs\/) {
      add_header Cache-Control "public, max-age=31536000, immutable" always;
    }
  }
}
```

## Notes

- Keep your app’s redirect responses short-lived; browsers will cache them for 60s reducing app hits.
- Signed URLs include query params; most CDNs treat different query strings as separate cache keys.
- Ensure the S3 endpoint is HTTPS to avoid mixed content; we coerce http→https at runtime for presigned URLs.
