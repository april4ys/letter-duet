import {
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type RoomStory = {
  storyFragments: string[];
  fragmentEffectCount: number;
};

export function subscribeRoomStory(
  onStory: (story: RoomStory) => void,
  onError: (error: unknown) => void,
  roomId: string,
): Unsubscribe {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  return onSnapshot(
    doc(db, "rooms", roomId, "story", "main"),
    (snapshot) => {
      const data = snapshot.data();
      const storyFragments = Array.isArray(data?.storyFragments)
        ? data.storyFragments.filter(
            (fragment): fragment is string => typeof fragment === "string",
          )
        : [];
      const fragmentEffectCount = normalizeFragmentEffectCount(
        data?.fragmentEffectCount,
      );

      onStory({ storyFragments, fragmentEffectCount });
    },
    onError,
  );
}

export async function updateRoomFragmentEffectCount(
  fragmentEffectCount: number,
  roomId: string,
  authorUid: string,
  action: "사용" | "취소",
) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const nextCount = Math.min(18, Math.max(0, fragmentEffectCount));
  const systemMessage =
    action === "사용"
      ? `프래그먼트 효과 사용: ${nextCount} / 18\n판정값 +2${
          nextCount >= 7 ? "\n이계화 필요" : ""
        }`
      : `프래그먼트 효과 취소: ${nextCount} / 18`;
  const storyRef = doc(db, "rooms", roomId, "story", "main");
  const postRef = doc(collection(db, "rooms", roomId, "posts"));
  const batch = writeBatch(db);

  batch.update(storyRef, {
    fragmentEffectCount: nextCount,
    updatedAt: serverTimestamp(),
  });
  batch.set(postRef, {
    authorRole: "system",
    authorUid,
    content: systemMessage,
    createdAt: serverTimestamp(),
    deleted: false,
    type: "system",
  });
  await batch.commit();
}

function normalizeFragmentEffectCount(value: unknown) {
  return typeof value === "number" && Number.isInteger(value)
    ? Math.min(18, Math.max(0, value))
    : 0;
}

export async function updateRoomStory(
  storyFragments: string[],
  roomId: string,
) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  await updateDoc(doc(db, "rooms", roomId, "story", "main"), {
    storyFragments,
  });
}
