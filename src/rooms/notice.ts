import {
  doc,
  onSnapshot,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type RoomNotice = {
  content: string;
};

export function subscribeRoomNotice(
  onNotice: (notice: RoomNotice) => void,
  onError: (error: unknown) => void,
  roomId: string,
): Unsubscribe {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  return onSnapshot(
    doc(db, "rooms", roomId, "notice", "main"),
    (snapshot) => {
      const data = snapshot.data();

      onNotice({
        content: typeof data?.content === "string" ? data.content : "",
      });
    },
    onError,
  );
}

export async function updateRoomNotice(content: string, roomId: string) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  await updateDoc(doc(db, "rooms", roomId, "notice", "main"), {
    content,
  });
}
