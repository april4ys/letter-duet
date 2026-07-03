import {
  collection,
  documentId,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type QuerySnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type CharacterFragment = {
  original: string;
  mutated: string;
};

export type CharacterRole = "binder" | "shifter";

export type RoomCharacter = {
  id: string;
  name: string;
  role: CharacterRole;
  fragments: CharacterFragment[];
  memo: string;
};

export type CharacterUpdateInput = {
  name: string;
  role: CharacterRole;
  fragments: CharacterFragment[];
  memo: string;
};

type CharacterSystemPostInput = {
  authorUid: string;
  content: string;
};

export function subscribeRoomCharacters(
  onCharacters: (characters: RoomCharacter[]) => void,
  onError: (error: unknown) => void,
  roomId: string,
): Unsubscribe {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const charactersQuery = query(
    collection(db, "rooms", roomId, "characters"),
    orderBy(documentId(), "asc"),
  );

  return onSnapshot(
    charactersQuery,
    (snapshot) => onCharacters(mapCharactersSnapshot(snapshot)),
    onError,
  );
}

export async function fetchRoomCharacters(roomId: string) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const charactersQuery = query(
    collection(db, "rooms", roomId, "characters"),
    orderBy(documentId(), "asc"),
  );
  const snapshot = await getDocs(charactersQuery);

  return mapCharactersSnapshot(snapshot);
}

export async function updateRoomCharacter(
  characterId: string,
  input: CharacterUpdateInput,
  roomId: string,
  systemPost?: CharacterSystemPostInput,
) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const characterRef = doc(db, "rooms", roomId, "characters", characterId);
  const characterData = {
    name: input.name,
    role: input.role,
    fragments: input.fragments,
    memo: input.memo,
    updatedAt: serverTimestamp(),
  };

  if (!systemPost) {
    await updateDoc(characterRef, characterData);
    return;
  }

  const batch = writeBatch(db);
  const postRef = doc(collection(db, "rooms", roomId, "posts"));

  batch.update(characterRef, characterData);
  batch.set(postRef, {
    authorRole: "system",
    authorUid: systemPost.authorUid,
    content: systemPost.content,
    createdAt: serverTimestamp(),
    deleted: false,
    type: "system",
  });
  await batch.commit();
}

function mapCharactersSnapshot(snapshot: QuerySnapshot) {
  return snapshot.docs.map((documentSnapshot) => {
    const data = documentSnapshot.data();

    return {
      id: documentSnapshot.id,
      name: typeof data.name === "string" ? data.name : documentSnapshot.id,
      role: normalizeCharacterRole(data.role, documentSnapshot.id),
      fragments: normalizeFragments(data.fragments),
      memo: typeof data.memo === "string" ? data.memo : "",
    } satisfies RoomCharacter;
  });
}

function normalizeCharacterRole(value: unknown, characterId: string): CharacterRole {
  if (value === "binder" || value === "shifter") {
    return value;
  }

  return characterId === "player1" ? "binder" : "shifter";
}

function normalizeFragments(value: unknown): CharacterFragment[] {
  const fragments = Array.isArray(value) ? value : [];

  return Array.from({ length: 6 }, (_, index) => {
    const fragment = fragments[index];

    if (!fragment || typeof fragment !== "object") {
      return { original: "", mutated: "" };
    }

    return {
      original:
        "original" in fragment && typeof fragment.original === "string"
          ? fragment.original
          : "",
      mutated:
        "mutated" in fragment && typeof fragment.mutated === "string"
          ? fragment.mutated
          : "",
    };
  });
}
