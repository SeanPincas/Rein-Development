"use client";

import { useCallback, useEffect, useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { buttonStyles, eyebrow, panel } from "@/components/ui/styles";
import { cx } from "@/lib/design";

const CODE_LENGTH = 6;

type Verification = {
  sentTo: string;
  pending: boolean;
  expired: boolean;
  expiresAt: string | null;
  resendAvailableAt: string | null;
  attemptsRemaining: number;
};

type ApiFailure = {
  code: string;
  message: string;
  details?: { retryAfterSeconds?: number; attemptsRemaining?: number };
};

type Notice = { tone: "error" | "info" | "success"; text: string } | null;

async function callApi<T>(path: string, init?: RequestInit): Promise<{ ok: true; data: T } | { ok: false; status: number; error: ApiFailure }> {
  try {
    const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
    const body = await response.json().catch(() => null);
    if (response.ok) return { ok: true, data: body?.data as T };
    return {
      ok: false,
      status: response.status,
      error: body?.error ?? { code: "INTERNAL_ERROR", message: "Something went wrong. Try again." },
    };
  } catch {
    return { ok: false, status: 0, error: { code: "NETWORK_ERROR", message: "You appear to be offline. Check your connection and try again." } };
  }
}

const secondsUntil = (iso: string | null, now: number) =>
  iso ? Math.max(0, Math.ceil((new Date(iso).getTime() - now) / 1000)) : 0;

const formatClock = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export function VerifyEmailForm() {
  const router = useRouter();
  const [verification, setVerification] = useState<Verification | null>(null);
  const [digits, setDigits] = useState<string[]>(() => Array(CODE_LENGTH).fill(""));
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<"loading" | "sending" | "verifying" | "done" | null>("loading");
  const [locked, setLocked] = useState(false);
  const [resendAt, setResendAt] = useState<number>(0);
  const [now, setNow] = useState(() => Date.now());
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const started = useRef(false);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const focusDigit = (index: number) => inputs.current[Math.min(Math.max(index, 0), CODE_LENGTH - 1)]?.focus();

  const handleFailure = useCallback(
    (error: ApiFailure, status: number) => {
      if (status === 401) {
        router.replace("/sign-in");
        return;
      }
      if (error.code === "RATE_LIMITED" && error.details?.retryAfterSeconds) {
        setResendAt(Date.now() + error.details.retryAfterSeconds * 1000);
      }
      setNotice({ tone: "error", text: error.message });
    },
    [router],
  );

  const sendCode = useCallback(
    async (isResend: boolean) => {
      setBusy("sending");
      setNotice(null);
      const result = await callApi<{ verification: Verification }>("/api/verification/email/send", { method: "POST" });
      setBusy(null);
      if (!result.ok) {
        handleFailure(result.error, result.status);
        return;
      }
      setVerification(result.data.verification);
      setResendAt(new Date(result.data.verification.resendAvailableAt ?? Date.now()).getTime());
      setLocked(false);
      setDigits(Array(CODE_LENGTH).fill(""));
      setNotice({ tone: "info", text: isResend ? "A new code is on its way." : "We sent you a six-digit code." });
      focusDigit(0);
    },
    [handleFailure],
  );

  // First load: resume a pending code, or send one. Guarded for React's dev double-run.
  useEffect(() => {
    if (started.current) return;
    started.current = true;

    void (async () => {
      const result = await callApi<{ verified: boolean; verification: Verification }>("/api/verification/email/status");
      if (!result.ok) {
        setBusy(null);
        handleFailure(result.error, result.status);
        return;
      }
      if (result.data.verified) {
        router.replace("/library");
        return;
      }
      const state = result.data.verification;
      setVerification(state);
      if (!state.pending || state.expired || state.attemptsRemaining === 0) {
        await sendCode(false);
        return;
      }
      setResendAt(new Date(state.resendAvailableAt ?? Date.now()).getTime());
      setBusy(null);
      focusDigit(0);
    })();
  }, [handleFailure, router, sendCode]);

  const submitCode = useCallback(
    async (code: string) => {
      setBusy("verifying");
      setNotice(null);
      const result = await callApi<{ verified: true; redirectTo: string }>("/api/verification/email/verify", {
        method: "POST",
        body: JSON.stringify({ code }),
      });

      if (result.ok) {
        setBusy("done");
        setNotice({ tone: "success", text: "Email verified. Opening your library…" });
        window.setTimeout(() => router.replace(result.data.redirectTo), 700);
        return;
      }

      setBusy(null);
      setDigits(Array(CODE_LENGTH).fill(""));
      const { error } = result;
      if (error.code === "INVALID_CODE") {
        const left = error.details?.attemptsRemaining ?? 0;
        setVerification((current) => (current ? { ...current, attemptsRemaining: left } : current));
        setNotice({ tone: "error", text: `That code is not correct. ${left} ${left === 1 ? "attempt" : "attempts"} left.` });
        focusDigit(0);
        return;
      }
      if (error.code === "TOO_MANY_ATTEMPTS" || error.code === "CODE_EXPIRED") {
        setLocked(true);
        setNotice({ tone: "error", text: error.message });
        return;
      }
      handleFailure(error, result.status);
    },
    [handleFailure, router],
  );

  const updateDigits = (next: string[]) => {
    setDigits(next);
    const code = next.join("");
    if (code.length === CODE_LENGTH && /^\d{6}$/.test(code)) void submitCode(code);
  };

  const onDigitChange = (index: number, raw: string) => {
    const value = raw.replace(/\D/g, "");
    if (!value) {
      const next = [...digits];
      next[index] = "";
      setDigits(next);
      return;
    }
    // Typing or autofill may deliver several digits at once.
    const next = [...digits];
    value.split("").slice(0, CODE_LENGTH - index).forEach((digit, offset) => (next[index + offset] = digit));
    updateDigits(next);
    focusDigit(index + value.length);
  };

  const onKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index]) {
      event.preventDefault();
      focusDigit(index - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusDigit(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusDigit(index + 1);
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH);
    if (!pasted) return;
    event.preventDefault();
    const next = Array(CODE_LENGTH).fill("").map((_, i) => pasted[i] ?? "");
    updateDigits(next);
    focusDigit(pasted.length);
  };

  const expiresIn = secondsUntil(verification?.expiresAt ?? null, now);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = Boolean(verification?.pending) && expiresIn === 0 && busy !== "loading";
  const inputsDisabled = busy !== null || locked || expired;
  const canResend = resendIn === 0 && busy === null;

  return (
    <div className={cx(panel, "w-full max-w-[440px] shadow-[0_0_80px_rgb(124_58_237/0.25)]")}>
      <div className="flex flex-col gap-6 p-8">
        <div className="flex flex-col gap-2 text-center">
          <h2 className="m-0 text-2xl font-bold tracking-[-0.02em]">Enter your code</h2>
          <p className="m-0 text-[15px] leading-normal text-rein-soft">
            {verification ? (
              <>
                We emailed a six-digit code to <span className="font-semibold text-white">{verification.sentTo}</span>.
              </>
            ) : (
              "Preparing your code…"
            )}
          </p>
        </div>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0" disabled={inputsDisabled}>
          <legend className="sr-only">Six-digit verification code</legend>
          <div className="flex justify-between gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => {
                  inputs.current[index] = element;
                }}
                value={digit}
                onChange={(event) => onDigitChange(index, event.target.value)}
                onKeyDown={(event) => onKeyDown(index, event)}
                onPaste={onPaste}
                onFocus={(event) => event.target.select()}
                inputMode="numeric"
                autoComplete={index === 0 ? "one-time-code" : "off"}
                pattern="\d*"
                maxLength={CODE_LENGTH}
                aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                aria-invalid={notice?.tone === "error" || undefined}
                className={cx(
                  "h-14 w-full min-w-0 rounded-[10px] border bg-black text-center font-mono text-2xl text-white outline-none transition-colors",
                  "focus:border-rein-accent focus:ring-2 focus:ring-rein-accent/40 disabled:opacity-50",
                  notice?.tone === "error" ? "border-red-400/70" : "border-rein-border",
                )}
              />
            ))}
          </div>
          <div className="flex justify-between font-mono text-[11px] tracking-[0.08em] text-rein-label">
            <span>
              {verification?.pending && !expired ? `EXPIRES IN ${formatClock(expiresIn)}` : expired ? "CODE EXPIRED" : " "}
            </span>
            <span>
              {verification ? `${verification.attemptsRemaining} ${verification.attemptsRemaining === 1 ? "ATTEMPT" : "ATTEMPTS"} LEFT` : ""}
            </span>
          </div>
        </fieldset>

        <p
          role="status"
          aria-live="polite"
          className={cx(
            "m-0 min-h-[1.5em] text-center text-sm",
            notice?.tone === "error" && "text-red-300",
            notice?.tone === "success" && "text-emerald-300",
            notice?.tone === "info" && "text-rein-soft",
          )}
        >
          {busy === "verifying" ? "Checking your code…" : busy === "sending" ? "Sending your code…" : (notice?.text ?? "")}
        </p>

        <button
          type="button"
          onClick={() => void sendCode(true)}
          disabled={!canResend}
          className={cx(buttonStyles.outline, "h-12 justify-center disabled:cursor-not-allowed disabled:opacity-50")}
        >
          {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
        </button>
      </div>

      <div className="flex flex-col items-center gap-2 border-t border-rein-line bg-black/60 px-8 py-4 text-center text-sm text-rein-soft">
        <span>Wrong account?</span>
        <SignOutButton redirectUrl="/sign-in">
          <button type="button" className="font-semibold text-rein-accent hover:text-white">
            Sign out and use another email
          </button>
        </SignOutButton>
        <span className={cx(eyebrow, "pt-1")}>CODES EXPIRE AFTER 10 MINUTES · SINGLE USE</span>
      </div>
    </div>
  );
}
