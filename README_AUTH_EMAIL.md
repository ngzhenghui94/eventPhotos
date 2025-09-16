Email/password auth overview
============================

This repo now supports email + password auth with email verification and password reset using Resend (no SMTP required).

Environment variables
---------------------

Add to .env.local (and Vercel project env):

```
RESEND_API_KEY=your_resend_api_key
MAIL_FROM="Event Photos <noreply@yourdomain.com>"
# Ensure BASE_URL is set to your site origin in production
BASE_URL=http://localhost:3000
```

How it works
------------
- Signup: creates user, sets session, and sends a verification link to /verify/[token].
- Signin: checks email+password and sets session.
- Password reset: request at /reset, email sends link to /reset/[token].

Hetzner SMTP note
------------------
Hetzner and many cloud VMs block SMTP by default or have poor deliverability. Resend works via HTTPS and is allowed on Vercel and most networks. Use Resend for reliable delivery without running an email server.
