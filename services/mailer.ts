import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

/**
 * Simple mailer that currently uses RESEND if an API key is present.
 * It loads HTML e‑mail templates from the `emails/` folder.
 */
export async function sendMagicLink(email: string, url: string) {
  const domain = process.env.RESEND_DOMAIN || 'example.com';
  const apiKey = process.env.RESEND_API_KEY;

  // Load the HTML template and replace placeholders
  const tmplPath = path.resolve(process.cwd(), 'emails', 'invite.html');
  const raw = fs.readFileSync(tmplPath, 'utf8');
  const html = raw
    .replace(/{{name}}/g, email)
    .replace(/{{tenantName}}/g, 'Your Organization')
    .replace(/{{magicLink}}/g, url)
    .replace(/{{year}}/g, new Date().getFullYear().toString());

  if (!apiKey) {
    // Fallback – just log to console (useful for local dev)
    console.log(`📧 Magic link email to ${email}: ${url}`);
    console.log('HTML preview:', html);
    return;
  }

  // RESEND API request
  const payload = {
    from: `no-reply@${domain}`,
    to: email,
    subject: 'Your Invitation to Join a Tenant',
    html,
  };

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      const err = await resp.text();
      console.error('RESEND email send failed:', err);
    }
  } catch (e) {
    console.error('RESEND request error:', e);
  }
}
