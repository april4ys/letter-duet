import { type User } from "firebase/auth";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type DocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";

const emptyFragments = Array.from({ length: 6 }, () => ({
  original: "",
  mutated: "",
}));

export async function createRoom(
  user: User,
  input: { title: string },
) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const title = input.title.trim();

  if (!title) {
    throw new Error("방 제목을 입력해 주세요.");
  }

  const roomRef = await addDoc(collection(db, "rooms"), {
    title,
    gmUid: user.uid,
    isArchived: false,
    deleted: false,
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "rooms", roomRef.id, "characters", "player1"),
    createInitialCharacter("Player 1", "binder"),
  );
  await setDoc(doc(db, "rooms", roomRef.id, "notice", "main"), {
    content: "",
  });
  await setDoc(doc(db, "rooms", roomRef.id, "story", "main"), {
    storyFragments: [],
    fragmentEffectCount: 0,
    updatedAt: serverTimestamp(),
  });
  await setDoc(
    doc(db, "rooms", roomRef.id, "characters", "player2"),
    createInitialCharacter("Player 2", "shifter"),
  );

  return roomRef.id;
}

export async function fetchRoomAccess(roomId: string) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const snapshot = await getDoc(doc(db, "rooms", roomId));

  if (!snapshot.exists()) {
    throw new Error("세션방을 찾을 수 없습니다.");
  }

  return mapRoomAccess(snapshot, roomId);
}

export function subscribeRoomAccess(
  roomId: string,
  onRoom: (room: ReturnType<typeof mapRoomAccess>) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  return onSnapshot(
    doc(db, "rooms", roomId),
    (snapshot) => {
      if (!snapshot.exists()) {
        onError(new Error("세션방을 찾을 수 없습니다."));
        return;
      }

      onRoom(mapRoomAccess(snapshot, roomId));
    },
    onError,
  );
}

export async function setRoomArchived(roomId: string, isArchived: boolean) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  await updateDoc(doc(db, "rooms", roomId), {
    isArchived,
    deleted: false,
  });
}

export async function setRoomDeleted(roomId: string) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  await updateDoc(doc(db, "rooms", roomId), { deleted: true });
}

function mapRoomAccess(
  snapshot: DocumentSnapshot<DocumentData>,
  roomId: string,
) {
  const data = snapshot.data() ?? {};

  return {
    gmUid: typeof data.gmUid === "string" ? data.gmUid : "",
    isArchived: data.isArchived === true,
    deleted: data.deleted === true,
    title: typeof data.title === "string" ? data.title : roomId,
  };
}

function createInitialCharacter(name: string, role: "binder" | "shifter") {
  return {
    name,
    role,
    fragments: emptyFragments,
    memo: "",
    updatedAt: serverTimestamp(),
  };
}
