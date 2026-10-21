import { verifyWebhook } from "@clerk/nextjs/webhooks";
import type { EmailWebhookEvent } from "@clerk/backend/webhooks";
import type { NextRequest } from "next/server";

import { deliverClerkEmail } from "@/lib/server/brevo";

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const event = await verifyWebhook(request);

    if (event.type !== "email.created") {
      return Response.json({ ok: true, ignored: true });
    }

    await deliverClerkEmail((event as EmailWebhookEvent).data);
    return Response.json({ ok: true });
  } catch {
    return Response.json(
      { error: "Webhook delivery failed." },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
