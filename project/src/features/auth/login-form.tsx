"use client";
import { useActionState, useState, useEffect } from "react";
import { Eye, EyeOff, ArrowRight, LockKeyhole, LifeBuoy } from "lucide-react";
import { DEMO_USERS, DEMO_PASSWORD } from "@/lib/demo/users";
import { ROLE_LABELS } from "@/shared/contracts/auth";
import { signIn } from "./actions";
import { Button, Input, Field } from "@/components/ui";
import { DetailDrawer } from "@/components/ui/overlays";
export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, {});
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(true);
  const [password, setPassword] = useState("");
  useEffect(() => {
    if (state.fieldErrors?.email) document.getElementById("email")?.focus();
    else if (state.fieldErrors?.password)
      document.getElementById("password")?.focus();
  }, [state]);
  return (
    <>
      <form action={action} className="login-form" aria-busy={pending}>
        <input type="hidden" name="next" value={next || ""} />
        {state.error && (
          <div role="alert" className="auth-error">
            {state.error}
          </div>
        )}
        <Field
          label="Work email"
          id="email"
          error={state.fieldErrors?.email?.[0]}
        >
          <Input
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="name@ultrajaya.co.id"
            autoComplete="username"
            required
            maxLength={254}
            spellCheck={false}
            aria-invalid={!!state.fieldErrors?.email}
            aria-describedby={
              state.fieldErrors?.email ? "email-error" : undefined
            }
          />
        </Field>
        <Field
          label="Password"
          id="password"
          error={state.fieldErrors?.password?.[0]}
        >
          <div className="password-field">
            <Input
              id="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={visible ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              maxLength={256}
              aria-invalid={!!state.fieldErrors?.password}
              aria-describedby={
                state.fieldErrors?.password ? "password-error" : undefined
              }
            />
            <button
              type="button"
              className="password-toggle icon-button"
              aria-label={visible ? "Hide password" : "Show password"}
              aria-pressed={visible}
              onClick={() => setVisible(!visible)}
            >
              {visible ? <EyeOff size={21} /> : <Eye size={21} />}
            </button>
          </div>
        </Field>
        <div className="login-options">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <DetailDrawer
            trigger={
              <button type="button" className="text-button">
                Forgot password?
              </button>
            }
            title="Password recovery"
            description="Password reset email is not configured for this workspace."
          >
            <Support />
            <p>
              Your workspace administrator can arrange account recovery. Never
              share your password or send it by email.
            </p>
          </DetailDrawer>
        </div>
        <Button className="sign-in" type="submit" disabled={pending}>
          {pending ? (
            "Signing in…"
          ) : (
            <>
              Sign in <ArrowRight size={22} aria-hidden />
            </>
          )}
        </Button>
      </form>
      <details className="demo-login-accounts" open>
        <summary>Pilih akun akses</summary>
        <p>
          Kata sandi: <code>{DEMO_PASSWORD}</code>
        </p>
        {DEMO_USERS.map((u) => (
          <button
            key={u.id}
            type="button"
            onClick={() => {
              setEmail(u.email);
              setPassword(DEMO_PASSWORD);
            }}
          >
            {ROLE_LABELS[u.role]} · {u.email}
          </button>
        ))}
      </details>
      <div className="login-help">
        <span>
          Need help? Contact{" "}
          <DetailDrawer
            trigger={
              <button className="text-button underlined">IT support</button>
            }
            title="Workspace support"
            description="Contact your internal Ultrajaya IT help desk for access assistance."
          >
            <Support />
          </DetailDrawer>
        </span>
      </div>
      <p className="login-security">
        <LockKeyhole size={18} aria-hidden /> Authorized Ultrajaya employees
        only
      </p>
    </>
  );
}
function Support() {
  const email = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  return (
    <div className="support-state">
      <LifeBuoy size={28} aria-hidden />
      <h3>Ask your workspace administrator</h3>
      <p>
        {email ? (
          <>
            Contact <a href={`mailto:${email}`}>{email}</a>.
          </>
        ) : (
          "No support email has been configured. Use your organization’s internal IT help desk."
        )}
      </p>
    </div>
  );
}
