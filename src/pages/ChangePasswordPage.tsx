import { Navigate, useNavigate } from "react-router-dom";
import { ChangePasswordForm } from "../auth/ChangePasswordForm";
import { type AuthResult } from "../auth/useAuthSession";
import { AppLayout } from "../layout/AppLayout";

type ChangePasswordPageProps = {
  authSetupError: string;
  currentUserExists: boolean;
  onChangePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<AuthResult>;
};

export function ChangePasswordPage({
  authSetupError,
  currentUserExists,
  onChangePassword,
}: ChangePasswordPageProps) {
  const navigate = useNavigate();

  if (!currentUserExists) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppLayout
      authSetupError={authSetupError}
      title="비밀번호 변경"
      variant="app"
    >
      <ChangePasswordForm
        onBack={() => navigate("/rooms")}
        onChangePassword={onChangePassword}
      />
    </AppLayout>
  );
}
