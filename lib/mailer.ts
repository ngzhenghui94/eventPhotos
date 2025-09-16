// Lightweight mailer using Resend HTTP API. Avoids SMTP (works well on Vercel).
// Env vars required: RESEND_API_KEY, MAIL_FROM (e.g. "EventPhotos <noreply@yourdomain.com>")

type SendEmailInput = {
	to: string;
	subject: string;
	html?: string;
	text?: string;
};

function getBaseUrl() {
	// Prefer BASE_URL, else best-effort fallback for local dev
	return process.env.BASE_URL?.replace(/\/$/, '') || 'http://localhost:3000';
}

function getResendApiKey() {
	const key = process.env.RESEND_API_KEY;
	if (!key) throw new Error('Missing RESEND_API_KEY');
	return key;
}

function getMailFrom() {
	const from = process.env.MAIL_FROM;
	if (!from) throw new Error('Missing MAIL_FROM');
	return from;
}

export async function sendEmail({ to, subject, html, text }: SendEmailInput) {
	const apiKey = getResendApiKey();
	const from = getMailFrom();

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${apiKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ from, to, subject, html, text }),
	});

	if (!res.ok) {
		const msg = await res.text();
		throw new Error(`Failed to send email: ${res.status} ${msg}`);
	}

	return (await res.json()) as { id: string };
}

export async function sendVerificationEmail(email: string, token: string) {
	const url = `${getBaseUrl()}/verify/${encodeURIComponent(token)}`;
	const subject = 'Verify your email for Event Photos';
	const text = `Please verify your email by visiting: ${url}`;
	const html = `
		<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; line-height:1.6; color:#111">
			<h2>Verify your email</h2>
			<p>Thanks for signing up for Event Photos. Click the button below to verify your email.</p>
			<p><a href="${url}" style="display:inline-block; padding:10px 16px; background:#f97316; color:#fff; text-decoration:none; border-radius:8px">Verify email</a></p>
			<p>If the button doesn't work, copy and paste this link into your browser:<br />
			<a href="${url}">${url}</a></p>
		</div>
	`;
	return sendEmail({ to: email, subject, text, html });
}

export async function sendPasswordResetEmail(email: string, token: string) {
	const url = `${getBaseUrl()}/reset/${encodeURIComponent(token)}`;
	const subject = 'Reset your Event Photos password';
	const text = `Reset your password here: ${url}`;
	const html = `
		<div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, sans-serif; line-height:1.6; color:#111">
			<h2>Reset your password</h2>
			<p>We received a request to reset your password. Click the button below to continue.</p>
			<p><a href="${url}" style="display:inline-block; padding:10px 16px; background:#f97316; color:#fff; text-decoration:none; border-radius:8px">Reset password</a></p>
			<p>If you didn't request this, you can safely ignore this email.</p>
		</div>
	`;
	return sendEmail({ to: email, subject, text, html });
}

export {};
