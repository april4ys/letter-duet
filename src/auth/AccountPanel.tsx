import { useState } from "react";
import { type User } from "firebase/auth";
import { User as UserIcon } from "lucide-react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

type AccountPanelProps = {
  currentUser: User;
  onLogout: () => Promise<void>;
};

export function AccountPanel({
  currentUser,
  onLogout,
}: AccountPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="user-menu">
      <button
        aria-expanded={isOpen}
        aria-label="계정 메뉴"
        className="secondary-button account-menu-button"
        title="계정 메뉴"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
      >
        <UserIcon aria-hidden="true" size={19} strokeWidth={2} />
      </button>
      {isOpen
        ? createPortal(
            <div className="user-menu-popover" role="menu">
              <p>{currentUser.email}</p>
              <Link
                className="secondary-link-button"
                role="menuitem"
                to="/account/password"
              >
                비밀번호 변경
              </Link>
              <button
                className="secondary-button"
                role="menuitem"
                type="button"
                onClick={onLogout}
              >
                로그아웃
              </button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
