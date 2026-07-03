import { Navigate, useNavigate } from "react-router-dom";
import { LoginForm } from "../auth/LoginForm";
import { type AuthResult } from "../auth/useAuthSession";
import { AppLayout } from "../layout/AppLayout";

type LoginPageProps = {
  authSetupError: string;
  currentUserExists: boolean;
  email: string;
  isAuthReady: boolean;
  onEmailChange: (email: string) => void;
  onLogin: (email: string, password: string) => Promise<AuthResult>;
};

export function LoginPage({
  authSetupError,
  currentUserExists,
  email,
  isAuthReady,
  onEmailChange,
  onLogin,
}: LoginPageProps) {
  const navigate = useNavigate();

  if (currentUserExists) {
    return <Navigate to="/rooms" replace />;
  }

  return (
    <AppLayout
      authSetupError={authSetupError}
      showAuthTitle={false}
      title="로그인"
    >
      <LoginForm
        email={email}
        isAuthReady={isAuthReady}
        onEmailChange={onEmailChange}
        onForgotPassword={() => navigate("/password-reset")}
        onLogin={onLogin}
      />
    </AppLayout>
  );
}
