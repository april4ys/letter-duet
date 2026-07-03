import { Navigate, useNavigate } from "react-router-dom";
import { PasswordResetForm } from "../auth/PasswordResetForm";
import { type AuthResult } from "../auth/useAuthSession";
import { AppLayout } from "../layout/AppLayout";

type PasswordResetPageProps = {
  authSetupError: string;
  currentUserExists: boolean;
  email: string;
  isAuthReady: boolean;
  onEmailChange: (email: string) => void;
  onSendResetEmail: (email: string) => Promise<AuthResult>;
};

export function PasswordResetPage({
  authSetupError,
  currentUserExists,
  email,
  isAuthReady,
  onEmailChange,
  onSendResetEmail,
}: PasswordResetPageProps) {
  const navigate = useNavigate();

  if (currentUserExists) {
    return <Navigate to="/rooms" replace />;
  }

  return (
    <AppLayout
      authSetupError={authSetupError}
      title="비밀번호 재설정"
    >
      <PasswordResetForm
        email={email}
        isAuthReady={isAuthReady}
        onBackToLogin={() => navigate("/login")}
        onEmailChange={onEmailChange}
        onSendResetEmail={onSendResetEmail}
      />
    </AppLayout>
  );
}
