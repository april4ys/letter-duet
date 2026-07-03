import { type Dispatch, type SetStateAction } from "react";
import { type User } from "firebase/auth";
import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { type AuthResult } from "../auth/useAuthSession";
import { ChangePasswordPage } from "../pages/ChangePasswordPage";
import { RoomPage } from "../pages/RoomPage";
import { LoginPage } from "../pages/LoginPage";
import { PasswordResetPage } from "../pages/PasswordResetPage";
import { RoomLogPage } from "../pages/RoomLogPage";
import { RoomsPage } from "../pages/RoomsPage";

type AppRoutesProps = {
  authSetupError: string;
  changePassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<AuthResult>;
  currentUser: User | null;
  email: string;
  isAuthReady: boolean;
  login: (email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  sendResetEmail: (email: string) => Promise<AuthResult>;
  setEmail: Dispatch<SetStateAction<string>>;
};

export function AppRoutes({
  authSetupError,
  changePassword,
  currentUser,
  email,
  isAuthReady,
  login,
  logout,
  sendResetEmail,
  setEmail,
}: AppRoutesProps) {
  const defaultPath = currentUser ? "/rooms" : "/login";

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to={defaultPath} replace />} />
        <Route
          path="/login"
          element={
            <LoginPage
              authSetupError={authSetupError}
              currentUserExists={Boolean(currentUser)}
              email={email}
              isAuthReady={isAuthReady}
              onEmailChange={setEmail}
              onLogin={login}
            />
          }
        />
        <Route
          path="/password-reset"
          element={
            <PasswordResetPage
              authSetupError={authSetupError}
              currentUserExists={Boolean(currentUser)}
              email={email}
              isAuthReady={isAuthReady}
              onEmailChange={setEmail}
              onSendResetEmail={sendResetEmail}
            />
          }
        />
        <Route
          path="/rooms"
          element={
            <RoomsPage
              authSetupError={authSetupError}
              currentUser={currentUser}
              onLogout={logout}
            />
          }
        />
        <Route
          path="/rooms/:roomId"
          element={
            <RoomPage
              authSetupError={authSetupError}
              currentUser={currentUser}
              onLogout={logout}
            />
          }
        />
        <Route
          path="/rooms/:roomId/log"
          element={
            <RoomLogPage
              authSetupError={authSetupError}
              currentUser={currentUser}
              onLogout={logout}
            />
          }
        />
        <Route
          path="/account/password"
          element={
            <ChangePasswordPage
              authSetupError={authSetupError}
              currentUserExists={Boolean(currentUser)}
              onChangePassword={changePassword}
            />
          }
        />
        <Route path="*" element={<Navigate to={defaultPath} replace />} />
      </Routes>
    </HashRouter>
  );
}
