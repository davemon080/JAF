import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  auth,
  customSignIn,
  customSignUp,
  signInWithGoogle,
  isAnAdminEmail,
  sendPasswordReset,
} from "@/lib/firebase";
import { useAdmin } from "@/lib/store";
import { toast } from "sonner";
import { JafMark } from "@/components/jaf-logo";
import { Eye, EyeOff } from "lucide-react";

const authSearchSchema = z.object({
  redirect: z.string().optional(),
  mode: z.string().optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: (search) => authSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Sign in — JAF" },
      {
        name: "description",
        content:
          "Sign in or create a JAF account. Track orders, save your wishlist, and shop the drop.",
      },
      { property: "og:title", content: "Sign in — JAF" },
      { property: "og:description", content: "Just A Friend. Know your status." },
      { property: "og:url", content: "https://justafriend.com.ng/auth" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: "https://justafriend.com.ng/auth" }],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Valid email required").max(120);
const passwordSchema = z.string().min(8, "Min 8 characters").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const { redirect, mode: searchMode } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup" | "reset">(
    searchMode === "signup" ? "signup" : "signin",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const performRedirect = useCallback(
    (target?: string) => {
      const dest = target || "/";
      if (dest.includes("?")) {
        const [path, searchStr] = dest.split("?");
        const urlParams = new URLSearchParams(searchStr);
        const resumeVal = urlParams.get("resume");
        navigate({
          to: path as never,
          search: resumeVal ? { resume: resumeVal } : undefined,
        });
      } else {
        navigate({ to: dest as never });
      }
    },
    [navigate],
  );

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        if (isAnAdminEmail(user.email)) {
          useAdmin.getState().setAuthed(true);
          navigate({ to: "/admin" });
        } else {
          performRedirect(redirect);
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, redirect, performRedirect]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode !== "reset") {
      const emailParse = emailSchema.safeParse(email);
      if (!emailParse.success) {
        setError(emailParse.error.issues[0].message);
        return;
      }
      const passParse = passwordSchema.safeParse(password);
      if (!passParse.success && mode === "signup") {
        setError(passParse.error.issues[0].message);
        return;
      }
    }

    setBusy(true);
    try {
      if (mode === "signin") {
        const verifiedUser = await customSignIn(email, password);
        if (verifiedUser && isAnAdminEmail(verifiedUser.email)) {
          useAdmin.getState().setAuthed(true);
          toast.success("Welcome, Administrator.");
          navigate({ to: "/admin" });
        } else {
          toast.success("Welcome back.");
          performRedirect(redirect);
        }
      } else if (mode === "signup") {
        if (!name.trim()) {
          throw new Error("Full name is required.");
        }
        await customSignUp(email, password, name);
        toast.success("Account created. You're in.");
        performRedirect(redirect);
      } else {
        const continueUrl = `${window.location.origin}/reset-password`;
        await sendPasswordReset(email, continueUrl);
        toast.success(
          "Password reset link has been dispatched! Please check your email inbox to update your password.",
        );
        setMode("signin");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      const verifiedUser = await signInWithGoogle();
      if (verifiedUser && isAnAdminEmail(verifiedUser.email)) {
        useAdmin.getState().setAuthed(true);
        toast.success("Welcome, Administrator.");
        navigate({ to: "/admin" });
      } else {
        toast.success("Welcome back.");
        performRedirect(redirect);
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: string };
      if (errorObj.code === "auth/popup-blocked") {
        setError("Sign-in popup blocked. Please allow popups or try again in a new tab.");
        toast.error(
          "Popup blocked. Please check your browser settings or click the separate tab window.",
        );
      } else if (errorObj.code === "auth/popup-closed-by-user") {
        setError("Sign-in popup closed before completion.");
      } else if (errorObj.code === "auth/unauthorized-domain") {
        setError("Domain unauthorized for Google login (auth/unauthorized-domain).");
        toast.error("Domain unauthorized. Please read the error instructions below.");
      } else {
        const msg = err instanceof Error ? err.message : "Something went wrong";
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-ink text-canvas flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-10 text-center">
            <JafMark size={84} />
            <p className="mt-5 text-[11px] tracking-[0.4em] uppercase text-gold font-medium">
              JUST · A · FRIEND
            </p>
            <h1 className="mt-4 font-display font-semibold tracking-tighter text-4xl md:text-5xl">
              {mode === "signin"
                ? "Welcome back"
                : mode === "signup"
                  ? "Join the drop"
                  : "Reset password"}
            </h1>
            <p className="mt-3 text-sm text-canvas/60 max-w-xs">
              {mode === "signin"
                ? "Sign in to track orders, save fits, and shop the next drop first."
                : mode === "signup"
                  ? "Create an account. Know your status."
                  : "Enter your email and we'll send a reset link."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <Field label="Full name">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="auth-input"
                  autoComplete="name"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="auth-input"
                autoComplete="email"
              />
            </Field>
            {mode !== "reset" && (
              <Field label="Password">
                <div className="relative w-full">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="auth-input pr-10"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-canvas/50 hover:text-canvas transition-colors"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </Field>
            )}

            {error && (
              <div className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 px-3.5 py-3 space-y-2 rounded">
                <p className="font-semibold">{error}</p>
                {error.includes("unauthorized-domain") && (
                  <div className="mt-2 text-canvas/85 border-t border-red-500/20 pt-2 space-y-1.5 leading-relaxed text-left">
                    <p className="font-semibold text-gold">How to authorize this domain:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        Go to the{" "}
                        <a
                          href="https://console.firebase.google.com/"
                          target="_blank"
                          rel="noreferrer"
                          className="underline text-gold hover:text-gold-soft"
                        >
                          Firebase Console
                        </a>
                      </li>
                      <li>
                        {"Navigate to: "}
                        <strong>Authentication &gt; Settings &gt; Authorized domains</strong>
                      </li>
                      <li>
                        Click <strong>Add domain</strong> and enter:{" "}
                        <code className="bg-canvas/10 px-1 py-0.5 rounded text-gold text-xs">
                          {window.location.hostname}
                        </code>
                      </li>
                      <li>Save and refresh this application to complete sign in!</li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gold hover:bg-gold-soft text-ink font-medium tracking-widest uppercase text-xs py-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy
                ? "Please wait…"
                : mode === "signin"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send reset link"}
            </button>
          </form>

          {mode !== "reset" && (
            <>
              <div className="relative flex py-4 items-center">
                <div className="flex-grow border-t border-canvas/10"></div>
                <span className="flex-shrink mx-4 text-[10px] tracking-widest uppercase text-canvas/40">
                  or
                </span>
                <div className="flex-grow border-t border-canvas/10"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={busy}
                className="w-full bg-transparent hover:bg-canvas/5 text-canvas border border-canvas/15 font-medium tracking-widest uppercase text-xs py-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>
            </>
          )}

          <div className="mt-8 text-center text-xs text-canvas/60 space-y-2">
            {mode === "signin" && (
              <>
                <p>
                  New here?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-gold hover:underline font-medium"
                  >
                    Create an account
                  </button>
                </p>
                <p>
                  <button
                    onClick={() => setMode("reset")}
                    className="text-canvas/70 hover:text-gold"
                  >
                    Forgot password?
                  </button>
                </p>
              </>
            )}
            {mode === "signup" && (
              <p>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="text-gold hover:underline font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
            {mode === "reset" && (
              <p>
                <button
                  onClick={() => setMode("signin")}
                  className="text-gold hover:underline font-medium"
                >
                  Back to sign in
                </button>
              </p>
            )}
          </div>

          <div className="mt-12 text-center">
            <Link
              to="/"
              className="text-[10px] tracking-widest uppercase text-canvas/40 hover:text-gold"
            >
              ← Back to JAF
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
