// src/lib/server/email.ts

export async function sendEmail({
  to,
  subject,
  text
}: {
  to: string;
  subject: string;
  text: string;
}) {
  const API_KEY = import.meta.env.VITE_RESEND_API_KEY;
  const FROM_EMAIL = import.meta.env.VITE_RESEND_FROM_EMAIL;

  if (!API_KEY || !FROM_EMAIL) {
    throw new Error('Missing Resend API configuration.');
  }

  const payload = {
    from: `TimeSync <${FROM_EMAIL}>`,
    to,
    subject,
    text
  };

  console.log('📤 Sending email with payload:', payload);

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Failed to send email. Server said:', errorText);
    throw new Error('Failed to send email');
  }

  const data = await response.json();
  console.log('✅ Email sent successfully:', data);
}
