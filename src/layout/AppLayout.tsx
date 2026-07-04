import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { isFirebaseConfigured, missingFirebaseConfigKeys } from "../lib/firebase";

type AppLayoutProps = {
  authSetupError: string;
  children: ReactNode;
  navigation?: ReactNode;
  onBrandTitleClick?: () => void;
  showAuthTitle?: boolean;
  showNavigationTitle?: boolean;
  title: string;
  variant?: "app" | "auth";
  workspaceSurface?: "card" | "plain";
};

export function AppLayout({
  authSetupError,
  children,
  navigation,
  onBrandTitleClick,
  showAuthTitle = true,
  showNavigationTitle = true,
  title,
  variant = "auth",
  workspaceSurface = "card",
}: AppLayoutProps) {
  const isAppLayout = variant === "app";
  const hasFirebaseError = Boolean(
    authSetupError || !isFirebaseConfigured,
  );

  return (
    <main className={isAppLayout ? "app-shell app-shell-workspace" : "app-shell"}>
      {isAppLayout ? (
        <header className="top-menu-bar">
          <div className="top-menu-inner">
            <div className="top-menu-identity">
              <Link className="top-menu-brand" to="/rooms">
                Letter Duet
              </Link>
              {showNavigationTitle ? (
                <>
                  <span aria-hidden="true" className="top-menu-separator">
                    |
                  </span>
                  <span className="top-menu-context">{title}</span>
                </>
              ) : null}
            </div>
            {navigation ? (
              <nav className="top-menu-navigation" aria-label="주 메뉴">
                {navigation}
              </nav>
            ) : null}
          </div>
        </header>
      ) : null}
      <section
        className={
          isAppLayout
            ? `session-logbook session-workspace ${
                workspaceSurface === "plain" ? "session-workspace-plain" : ""
              }`
            : "session-logbook"
        }
        aria-label={isAppLayout || !showAuthTitle ? title : undefined}
        aria-labelledby={
          isAppLayout || !showAuthTitle ? undefined : "page-title"
        }
      >
        {!isAppLayout ? (
          <h1 className="brand-title">
            {onBrandTitleClick ? (
              <button
                className="brand-title-button"
                type="button"
                onClick={onBrandTitleClick}
              >
                Letter Duet
              </button>
            ) : (
              "Letter Duet"
            )}
          </h1>
        ) : null}
        {hasFirebaseError ? (
          <div className="status" role="alert">
            <strong>Firebase 연결 오류</strong>
            <span>{getFirebaseStatusMessage(authSetupError)}</span>
          </div>
        ) : null}
        <section
          className={isAppLayout ? "app-page-content" : "login-panel"}
          aria-labelledby={
            isAppLayout || !showAuthTitle ? undefined : "page-title"
          }
        >
          {!isAppLayout && showAuthTitle ? (
            <h2 id="page-title">{title}</h2>
          ) : null}
          {children}
        </section>
      </section>
    </main>
  );
}

function getFirebaseStatusMessage(authSetupError: string) {
  if (authSetupError) {
    return authSetupError;
  }

  return `${missingFirebaseConfigKeys.length}개의 Vite 환경변수가 필요합니다.`;
}
