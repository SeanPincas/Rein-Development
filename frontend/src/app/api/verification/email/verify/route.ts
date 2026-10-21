import { z } from "zod";

import { verifyEmailOtp } from "@/lib/server/email-otp";
import {
  createVerifiedCookieValue,
  verifiedCookieHeader,
} from "@/lib/server/email-verification";
import { getServerEnvironment } from "@/lib/server/env";
import { parseJsonRequest } from "@/lib/server/request";
import { privateJsonResponse } from "@/lib/server/response";
import { handleAuthenticatedApiRequest } from "@/lib/server/route-handler";
import { ApiError } from "@/lib/server/api-error";

const verifyRequestSchema = z
  .object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the six-digit code.") })
  .strict();

/** Check the code; on success set the session-bound verified cookie. */
export async function POST(request: Request) {
  return handleAuthenticatedApiRequest(
    request,
    async ({ database, requestId, userId, sessionId }) => {
      const { code } = await parseJsonRequest(request, verifyRequestSchema);
      if (!sessionId) throw ApiError.unauthenticated();

      await verifyEmailOtp(database, userId, sessionId, code);

      const response = privateJsonResponse(
        { verified: true, redirectTo: "/library" },
        { requestId },
      );
      const secure = getServerEnvironment().APP_ORIGIN.startsWith("https://");
      response.headers.append(
        "Set-Cookie",
        verifiedCookieHeader(createVerifiedCookieValue(userId, sessionId), secure),
      );
      return response;
    },
    { requireVerifiedEmail: false },
  );
}
