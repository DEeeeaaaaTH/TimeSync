// src/routes/api/invite/+server.ts
import { json } from '@sveltejs/kit';
import { sendEmail } from '$lib/server/email';

export async function POST({ request }) {
  try {
    const { email, inviteLink } = await request.json();

    if (!email || !inviteLink) {
      return json({ success: false, error: 'Missing email or invite link.' }, { status: 400 });
    }

    console.log('📨 Preparing to send invite to:', email);

    await sendEmail({
      to: email,
      subject: 'You have been invited to join TimeSync!',
      text: `Hello,

You have been invited to join TimeSync.

Please click the link below to accept your invitation:
${inviteLink}

If you did not expect this invitation, you can ignore this email.

Thanks,
The TimeSync Team`
    });

    console.log('✅ Invite email sent successfully to:', email);

    return json({ success: true });
  } catch (error) {
    console.error('❌ Error in /api/invite route:', error);
    return json({ success: false, error: 'Failed to send invite email.' }, { status: 500 });
  }
}
