import { emailOtpStatus } from "@/lib/server/email-otp";
import { isEmailVerifiedRequest } from "@/lib/server/email-verification";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";

/** Pending-code state for the verification page. Never includes the code. */
export async function GET(request: Request) {
  return handleAuthenticatedApiRequest(
    request,
    async ({ database, requestId, userId, sessionId }) => {
      const verified = isEmailVerifiedRequest(request, userId, sessionId);
      const verification = await emailOtpStatus(database, userId, sessionId);
      return privateJsonResponse({ verified, verification }, { requestId });
    },
    { requireVerifiedEmail: false },
  );
}
