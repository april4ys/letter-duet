import { FirebaseError } from "firebase/app";

export function getFirestoreErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof FirebaseError && error.code === "permission-denied") {
    return "Firestore 권한이 없습니다. 로그인 계정의 룸 권한과 배포된 Firestore Rules를 확인해 주세요.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallbackMessage;
}
