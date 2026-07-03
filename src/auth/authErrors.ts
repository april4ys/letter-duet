import { FirebaseError } from "firebase/app";

export function getLoginErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "로그인 중 알 수 없는 오류가 발생했습니다.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않습니다.";
    case "auth/too-many-requests":
      return "로그인 시도가 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해 주세요.";
    default:
      return "로그인에 실패했습니다. Firebase 설정과 Auth 상태를 확인해 주세요.";
  }
}

export function getResetErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "재설정 이메일 발송 중 알 수 없는 오류가 발생했습니다.";
  }

  switch (error.code) {
    case "auth/invalid-email":
      return "이메일 형식이 올바르지 않습니다.";
    case "auth/user-not-found":
      return "해당 이메일의 계정을 찾지 못했습니다.";
    case "auth/too-many-requests":
      return "요청이 많습니다. 잠시 후 다시 시도해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해 주세요.";
    default:
      return "재설정 이메일을 발송하지 못했습니다.";
  }
}

export function getPasswordChangeErrorMessage(error: unknown) {
  if (!(error instanceof FirebaseError)) {
    return "비밀번호 변경 중 알 수 없는 오류가 발생했습니다.";
  }

  switch (error.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
      return "현재 비밀번호가 올바르지 않습니다.";
    case "auth/weak-password":
      return "새 비밀번호는 6자 이상이어야 합니다.";
    case "auth/requires-recent-login":
      return "보안을 위해 다시 로그인한 뒤 변경해 주세요.";
    case "auth/network-request-failed":
      return "네트워크 연결을 확인해 주세요.";
    default:
      return "비밀번호를 변경하지 못했습니다.";
  }
}
