import { type FormEvent, useState } from "react";
import { type AuthResult } from "./useAuthSession";

type PasswordResetFormProps = {
  email: string;
  isAuthReady: boolean;
  onBackToLogin: () => void;
  onEmailChange: (email: string) => void;
  onSendResetEmail: (email: string) => Promise<AuthResult>;
};

export function PasswordResetForm({
  email,
  isAuthReady,
  onBackToLogin,
  onEmailChange,
  onSendResetEmail,
}: PasswordResetFormProps) {
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");

    const result = await onSendResetEmail(email);

    if (result.ok) {
      setMessage("비밀번호 재설정 이메일을 발송했습니다.");
    } else {
      setErrorMessage(result.message);
    }

    setIsSubmitting(false);
  }

  return (
    <form className="login-form auth-page-form" onSubmit={handleSubmit}>
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
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      <button
        className="primary-button"
        disabled={!isAuthReady || isSubmitting}
        type="submit"
      >
        {isSubmitting ? "발송 중..." : "재설정 이메일 보내기"}
      </button>
      <button className="text-button" type="button" onClick={onBackToLogin}>
        로그인으로 돌아가기
      </button>
    </form>
  );
}
