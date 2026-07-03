import { type FormEvent, useState } from "react";
import { type AuthResult } from "./useAuthSession";

type ChangePasswordFormProps = {
  onBack: () => void;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<AuthResult>;
};

export function ChangePasswordForm({
  onBack,
  onChangePassword,
}: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword !== newPasswordConfirm) {
      setErrorMessage("새 비밀번호가 서로 일치하지 않습니다.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");
    setErrorMessage("");

    const result = await onChangePassword(currentPassword, newPassword);

    if (result.ok) {
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setMessage("비밀번호를 변경했습니다.");
    } else {
      setErrorMessage(result.message);
    }

    setIsSubmitting(false);
  }

  return (
    <form className="login-form auth-page-form" onSubmit={handleSubmit}>
      <label>
        <span>현재 비밀번호</span>
        <input
          autoComplete="current-password"
          disabled={isSubmitting}
          onChange={(event) => setCurrentPassword(event.target.value)}
          required
          type="password"
          value={currentPassword}
        />
      </label>
      <label>
        <span>새 비밀번호</span>
        <input
          autoComplete="new-password"
          disabled={isSubmitting}
          minLength={6}
          onChange={(event) => setNewPassword(event.target.value)}
          required
          type="password"
          value={newPassword}
        />
      </label>
      <label>
        <span>새 비밀번호 확인</span>
        <input
          autoComplete="new-password"
          disabled={isSubmitting}
          minLength={6}
          onChange={(event) => setNewPasswordConfirm(event.target.value)}
          required
          type="password"
          value={newPasswordConfirm}
        />
      </label>
      {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
      {message ? <p className="form-success">{message}</p> : null}
      <button className="primary-button" disabled={isSubmitting} type="submit">
        {isSubmitting ? "변경 중..." : "비밀번호 변경"}
      </button>
      <button className="text-button" type="button" onClick={onBack}>
        세션방으로 돌아가기
      </button>
    </form>
  );
}
