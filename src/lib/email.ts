import { Resend } from "resend";

let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  const key = import.meta.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  _resend = new Resend(key);
  return _resend;
}

const FROM = import.meta.env.EMAIL_FROM ?? "ReadMoreSFF <noreply@readmoresff.org>";

export type MailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail(input: MailInput) {
  return getResend().emails.send({
    from: FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
