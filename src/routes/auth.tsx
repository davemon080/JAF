import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { auth, customSignIn, customSignUp } from "@/lib/firebase";
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
    ],
    links: [{ rel: "canonical", href: "/auth" }],
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

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        if (user.email.toLowerCase().trim() === "adminjaf@gmail.com") {
          useAdmin.getState().setAuthed(true);
          navigate({ to: "/admin" });
        } else {
          const dest = redirect || "/";
          navigate({ to: dest as "/checkout" | "/" });
        }
      }
    });
    return () => unsubscribe();
  }, [navigate, redirect]);

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
        if (verifiedUser && verifiedUser.email.toLowerCase().trim() === "adminjaf@gmail.com") {
          useAdmin.getState().setAuthed(true);
          toast.success("Welcome, Administrator.");
          navigate({ to: "/admin" });
        } else {
          toast.success("Welcome back.");
          navigate({ to: "/" });
        }
      } else if (mode === "signup") {
        if (!name.trim()) {
          throw new Error("Full name is required.");
        }
        await customSignUp(email, password, name);
        toast.success("Account created. You're in.");
        navigate({ to: "/" });
      } else {
        toast.success(
          "Password reset simulated successfully. (Custom local authentication system)",
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
              <p className="text-[11px] text-red-300 bg-red-500/10 border border-red-500/30 px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-gold hover:bg-gold-soft text-ink font-medium tracking-widest uppercase text-xs py-4 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
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
