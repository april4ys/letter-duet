import {
  browserLocalPersistence,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { auth, isFirebaseConfigured } from "../lib/firebase";
import {
  getLoginErrorMessage,
  getPasswordChangeErrorMessage,
  getResetErrorMessage,
} from "./authErrors";

export type AuthStatus = "checking" | "ready" | "signed-in" | "error";
export type AuthResult = { ok: true } | { ok: false; message: string };

export function useAuthSession() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>(
    isFirebaseConfigured ? "checking" : "error",
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authSetupError, setAuthSetupError] = useState("");

  useEffect(() => {
    if (!auth) {
      setAuthStatus("error");
      setAuthSetupError("Firebase 환경변수가 설정되지 않았습니다.");
      return;
    }

    void setPersistence(auth, browserLocalPersistence);

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setCurrentUser(user);
        setAuthStatus(user ? "signed-in" : "ready");
        setAuthSetupError("");
      },
      () => {
        setAuthStatus("error");
        setAuthSetupError("Firebase Auth 상태를 확인하지 못했습니다.");
      },
    );

    return unsubscribe;
  }, []);

  async function login(email: string, password: string): Promise<AuthResult> {
    if (!auth) {
      return { ok: false, message: "Firebase 환경변수가 설정되지 않았습니다." };
    }

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getLoginErrorMessage(error) };
    }
  }

  async function logout() {
    if (!auth) {
      return;
    }

    await signOut(auth);
  }

  async function sendResetEmail(email: string): Promise<AuthResult> {
    if (!auth) {
      return { ok: false, message: "Firebase 환경변수가 설정되지 않았습니다." };
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getResetErrorMessage(error) };
    }
  }

  async function changePassword(
    currentPassword: string,
    newPassword: string,
  ): Promise<AuthResult> {
    if (!auth || !currentUser?.email) {
      return { ok: false, message: "로그인 상태를 확인하지 못했습니다." };
    }

    try {
      const credential = EmailAuthProvider.credential(
        currentUser.email,
        currentPassword,
      );

      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPassword);
      return { ok: true };
    } catch (error) {
      return { ok: false, message: getPasswordChangeErrorMessage(error) };
    }
  }

  return {
    authSetupError,
    authStatus,
    changePassword,
    currentUser,
    isAuthReady: authStatus === "ready" || authStatus === "signed-in",
    login,
    logout,
    sendResetEmail,
  };
}
