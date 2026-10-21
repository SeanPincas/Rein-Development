import { sendEmailOtp } from "@/lib/server/email-otp";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";

/** Issue (or resend) the six-digit code for the current session. */
export async function POST(request: Request) {
  return handleAuthenticatedApiRequest(
    request,
    async ({ database, requestId, userId, sessionId }) => {
      const verification = await sendEmailOtp(database, userId, sessionId);
      return privateJsonResponse({ verification }, { requestId });
    },
    { requireVerifiedEmail: false },
  );
}
