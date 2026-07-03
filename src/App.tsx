import { useState } from "react";
import { useAuthSession } from "./auth/useAuthSession";
import { AppRoutes } from "./routes/AppRoutes";

export default function App() {
  const [email, setEmail] = useState("");
  const {
    authSetupError,
    changePassword,
    currentUser,
    isAuthReady,
    login,
    logout,
    sendResetEmail,
  } = useAuthSession();

  return (
    <AppRoutes
      authSetupError={authSetupError}
      changePassword={changePassword}
      currentUser={currentUser}
      email={email}
      isAuthReady={isAuthReady}
      login={login}
      logout={logout}
      sendResetEmail={sendResetEmail}
      setEmail={setEmail}
    />
  );
}
