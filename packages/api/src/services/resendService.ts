import { Resend } from 'resend';

export const sendEmail = async (apiKey: string, to: string, subject: string, html: string, from: string = 'noreply@bd2-automata.com') => {
  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
  });

  if (error) {
    throw error;
  }

  return data;
};
