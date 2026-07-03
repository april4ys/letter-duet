import { type FormEvent, useEffect, useState } from "react";
import { type AuthResult } from "./useAuthSession";

type LoginFormProps = {
  email: string;
  isAuthReady: boolean;
  onEmailChange: (email: string) => void;
  onForgotPassword: () => void;
  onLogin: (email: string, password: string) => Promise<AuthResult>;
};

export function LoginForm({
  email,
  isAuthReady,
  onEmailChange,
  onForgotPassword,
  onLogin,
}: LoginFormProps) {
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setPassword("");
    setErrorMessage("");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const result = await onLogin(email, password);

    if (result.ok) {
      setPassword("");
    } else {
      setErrorMessage(result.message);
    }

    setIsSubmitting(false);
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <label>
        <span>이메일</span>
        <input
          autoComplete="email"
          disabled={!isAuthReady || isSubmitting}
          inputMode="email"
          onChange={(event) => onEmailChange(event.target.value)}
          required
          type="email"
          value={email}
        />
      </label>
      <label>
        <span>비밀번호</span>
        <input
          autoComplete="current-password"
          disabled={!isAuthReady || isSubmitting}
          onChange={(event) => setPassword(event.target.value)}
          required
          type="password"
          value={password}
        />
      </label>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      <button
        className="primary-button"
        disabled={!isAuthReady || isSubmitting}
        type="submit"
      >
        {isSubmitting ? "로그인 중..." : "로그인"}
      </button>
      <button className="text-button" type="button" onClick={onForgotPassword}>
        비밀번호를 잊으셨나요?
      </button>
    </form>
  );
}
