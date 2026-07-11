import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  type Firestore,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { type CharacterRole } from "./characters";

export type RoomCard = {
  id: string;
  title: string;
  gmUid: string;
  isArchived: boolean;
  createdAt: Date | null;
  player1Name: string;
  player1Role: CharacterRole;
  player2Name: string;
  player2Role: CharacterRole;
};

export async function fetchRoomCards(): Promise<RoomCard[]> {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const firestore = db;
  const roomsSnapshot = await getDocs(query(collection(firestore, "rooms")));
  const visibleRoomSnapshots = roomsSnapshot.docs.filter(
    (roomSnapshot) => roomSnapshot.data().deleted !== true,
  );
  const roomCards = await Promise.all(
    visibleRoomSnapshots.map((roomSnapshot) =>
      mapRoomCard(firestore, roomSnapshot),
    ),
  );

  return roomCards.sort((left, right) => {
    const leftTime = left.createdAt?.getTime() ?? 0;
    const rightTime = right.createdAt?.getTime() ?? 0;

    return rightTime - leftTime;
  });
}

async function mapRoomCard(
  firestore: Firestore,
  roomSnapshot: QueryDocumentSnapshot,
) {
  const roomData = roomSnapshot.data();
  const [player1Snapshot, player2Snapshot] = await Promise.all([
    getDoc(doc(firestore, "rooms", roomSnapshot.id, "characters", "player1")),
    getDoc(doc(firestore, "rooms", roomSnapshot.id, "characters", "player2")),
  ]);
  const player1Data = player1Snapshot.data();
  const player2Data = player2Snapshot.data();

  return {
    id: roomSnapshot.id,
    title:
      typeof roomData.title === "string" ? roomData.title : "Letter Duet room",
    gmUid: typeof roomData.gmUid === "string" ? roomData.gmUid : "",
    isArchived: roomData.isArchived === true,
    createdAt:
      roomData.createdAt instanceof Timestamp
        ? roomData.createdAt.toDate()
        : null,
    player1Name:
      typeof player1Data?.name === "string" ? player1Data.name : "Player 1",
    player1Role: normalizeCharacterRole(player1Data?.role, "shifter"),
    player2Name:
      typeof player2Data?.name === "string" ? player2Data.name : "Player 2",
    player2Role: normalizeCharacterRole(player2Data?.role, "binder"),
  };
}

function normalizeCharacterRole(
  value: unknown,
  fallback: CharacterRole,
): CharacterRole {
  return value === "binder" || value === "shifter" ? value : fallback;
}
