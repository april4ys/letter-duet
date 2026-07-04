import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [isAboutOpen, setIsAboutOpen] = useState(false);

  useEffect(() => {
    if (!isAboutOpen) {
      return undefined;
    }

    function closeWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsAboutOpen(false);
      }
    }

    document.addEventListener("keydown", closeWithEscape);
    return () => document.removeEventListener("keydown", closeWithEscape);
  }, [isAboutOpen]);

  if (currentUserExists) {
    return <Navigate to="/rooms" replace />;
  }

  return (
    <AppLayout
      authSetupError={authSetupError}
      onBrandTitleClick={() => setIsAboutOpen(true)}
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
      {isAboutOpen
        ? createPortal(
            <div
              aria-labelledby="about-letter-duet-title"
              aria-modal="true"
              className="post-delete-dialog room-status-dialog"
              role="dialog"
            >
              <div className="post-delete-dialog-panel about-dialog-panel">
                <strong id="about-letter-duet-title">Letter Duet</strong>
                <p>
                  Letter Duet은 드라코니언과 타키자토 후유가 개발해
                  <br />
                  초여명에서 한국어판으로 번역한 TRPG 룰인 언성듀엣과
                  관련하여
                  <br />
                  그 옵션룰인 레터세션(PBP, Play by Post형식)을
                  <br />
                  데스크톱 및 모바일 환경에서 편리하게 플레이하기 위해
                  <br />
                  ai를 활용하여 서서가 제작한 프로그램입니다.
                  <br />
                  <br />
                  <a
                    className="about-dialog-link"
                    href="https://github.com/april4ys/letter-duet-dist"
                    rel="noreferrer"
                    target="_blank"
                  >
                    다운로드 페이지: https://github.com/april4ys/letter-duet-dist
                  </a>
                </p>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => setIsAboutOpen(false)}
                >
                  닫기
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </AppLayout>
  );
}
