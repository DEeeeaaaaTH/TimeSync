// src/routes/api/invite/+server.ts
import { json } from '@sveltejs/kit';
import { sendEmail } from '$lib/server/email';

export async function POST({ request }) {
  const { email, inviteLink } = await request.json();

  try {
    await sendEmail({
      to: email,
      subject: 'You have been invited to join TimeSync!',
      text: `Hello,\n\nYou have been invited to join TimeSync.\n\nPlease click the link below to accept your invitation:\n\n${inviteLink}\n\nIf you did not expect this email, you can ignore it.`
    });

    return json({ success: true });
  } catch (error) {
    console.error('Error sending invite email:', error);
    return json({ success: false, error: 'Failed to send email.' }, { status: 500 });
  }
}
