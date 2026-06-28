import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { confirmResetPassword } from "@/lib/firebase";
import { JafMark } from "@/components/jaf-logo";
import { Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";

const resetSearchSchema = z.object({
  oobCode: z.string().optional(),
  apiKey: z.string().optional(),
  mode: z.string().optional(),
});

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search) => resetSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Reset Password — JAF" },
      { name: "description", content: "Reset your JAF account password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const { oobCode } = Route.useSearch();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!oobCode) {
      setError(
        "Reset token is missing. Please request a new password reset link from the sign-in page.",
      );
      toast.error("Invalid reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await confirmResetPassword(oobCode, password);
      setSuccess(true);
      toast.success("Password reset successfully! You can now log in.");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to reset password. The link may have expired.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-ink text-canvas flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-10 text-center">
            <JafMark size={84} />
            <p className="mt-5 text-[11px] tracking-[0.4em] uppercase text-gold font-medium">
              JUST · A · FRIEND
            </p>
            <h1 className="mt-4 font-display font-semibold tracking-tighter text-4xl md:text-5xl">
              Reset Password
            </h1>
            <p className="mt-3 text-sm text-canvas/60 max-w-xs">
              {success
                ? "Your password has been successfully updated."
                : "Create a new strong password for your JAF account."}
            </p>
          </div>

          {success ? (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <CheckCircle2 className="size-16 text-gold animate-bounce" />
              </div>
              <div className="bg-canvas/5 border border-gold/20 p-5 rounded">
                <p className="text-sm leading-relaxed text-canvas/80">
                  Password changed! You can now log in using your new password.
                </p>
              </div>
              <button
                onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
                className="w-full bg-gold hover:bg-gold-soft text-ink font-medium tracking-widest uppercase text-xs py-4 transition-colors cursor-pointer block text-center"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {!oobCode && (
                <div className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 px-3.5 py-4 rounded flex items-start gap-3 text-left">
                  <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <p className="font-semibold text-red-200">Invalid Link</p>
                    <p className="mt-1 leading-relaxed text-canvas/70">
                      The password reset link is invalid, incomplete, or expired. Please visit the
                      login screen to request a new link.
                    </p>
                  </div>
                </div>
              )}

              <Field label="New Password">
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={!oobCode || busy}
                    className="auth-input pr-10 disabled:opacity-50"
                    placeholder="Min 8 characters"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={!oobCode || busy}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-canvas/50 hover:text-canvas transition-colors disabled:opacity-50"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>

              <Field label="Confirm New Password">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  disabled={!oobCode || busy}
                  className="auth-input disabled:opacity-50"
                  placeholder="Re-enter password"
                  autoComplete="new-password"
                />
              </Field>

              {error && (
                <div className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 px-3.5 py-3 rounded text-left">
                  <p className="font-semibold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!oobCode || busy}
                className="w-full bg-gold hover:bg-gold-soft text-ink font-medium tracking-widest uppercase text-xs py-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {busy ? "Updating password…" : "Reset Password"}
              </button>
            </form>
          )}

          <div className="mt-12 text-center">
            <Link
              to="/auth"
              className="text-[10px] tracking-widest uppercase text-canvas/40 hover:text-gold"
            >
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        .auth-input {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(244, 244, 245, 0.15);
          color: var(--color-canvas);
          padding: 0.85rem 1rem;
          font-size: 0.95rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .auth-input:focus { border-color: var(--color-gold); }
        .auth-input::placeholder { color: rgba(244,244,245,0.3); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] tracking-widest uppercase font-medium text-canvas/70 block mb-2">
        {label}
      </span>
      {children}
    </label>
  );
}
