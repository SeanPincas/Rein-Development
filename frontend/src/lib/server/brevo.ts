import "server-only";

import { BrevoClient } from "@getbrevo/brevo";
import type { EmailJSON } from "@clerk/backend";

export type TransactionalEmailSender = {
  sendTransacEmail: (request: {
    subject: string;
    htmlContent?: string;
    textContent?: string;
    sender: { name: string; email: string };
    to: Array<{ email: string }>;
  }) => Promise<unknown>;
};

function requiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Brevo environment variable: ${name}`);
  }
  return value;
}

export function createBrevoEmailSender(): TransactionalEmailSender {
  const client = new BrevoClient({ apiKey: requiredEnvironment("BREVO_API_KEY") });
  return client.transactionalEmails;
}

export async function deliverClerkEmail(
  email: Pick<EmailJSON, "to_email_address" | "subject" | "body" | "body_plain">,
  sender: TransactionalEmailSender = createBrevoEmailSender(),
): Promise<void> {
  const recipient = email.to_email_address?.trim();
  const subject = email.subject?.trim();
  const htmlContent = email.body?.trim();
  const textContent = email.body_plain?.trim() || undefined;

  if (!recipient || !subject || (!htmlContent && !textContent)) {
    throw new Error("Clerk email.created payload is missing deliverable content.");
  }

  await sender.sendTransacEmail({
    subject,
    ...(htmlContent ? { htmlContent } : {}),
    ...(textContent ? { textContent } : {}),
    sender: {
      name: process.env.BREVO_SENDER_NAME?.trim() || "Rein",
      email: requiredEnvironment("BREVO_SENDER_EMAIL"),
    },
    to: [{ email: recipient }],
  });
}
