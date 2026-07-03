import {
  addDoc,
  collection,
  doc,
  getCountFromServer,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  Timestamp,
  updateDoc,
  type DocumentData,
  type QuerySnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export type RoomPost = {
  id: string;
  authorRole: "player1" | "player2" | "system";
  type: "post" | "system";
  authorUid: string;
  content: string;
  createdAt: Date | null;
  deleted: boolean;
};

export type RoomPostType = RoomPost["type"];
export type RoomPostAuthorRole = RoomPost["authorRole"];
export type RoomPostsPageCursor = QueryDocumentSnapshot<DocumentData> | null;

export type RoomPostsPage = {
  cursor: RoomPostsPageCursor;
  hasNextPage: boolean;
  posts: RoomPost[];
};

const RECENT_POST_LIMIT = 20;
const LOG_PAGE_LIMIT = 50;

export function subscribeRecentRoomPosts(
  onPosts: (posts: RoomPost[]) => void,
  onError: (error: unknown) => void,
  roomId: string,
): Unsubscribe {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const postsQuery = query(
    collection(db, "rooms", roomId, "posts"),
    orderBy("createdAt", "desc"),
    limit(RECENT_POST_LIMIT),
  );

  return onSnapshot(
    postsQuery,
    (snapshot) => onPosts(mapPostsSnapshot(snapshot)),
    onError,
  );
}

function mapPostsSnapshot(snapshot: QuerySnapshot) {
  return snapshot.docs.map(mapPostDocument).reverse();
}

export async function fetchRoomPostsPage(
  roomId: string,
  cursor: RoomPostsPageCursor = null,
): Promise<RoomPostsPage> {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const postsCollection = collection(db, "rooms", roomId, "posts");
  const postsQuery = cursor
    ? query(
        postsCollection,
        orderBy("createdAt", "asc"),
        startAfter(cursor),
        limit(LOG_PAGE_LIMIT + 1),
      )
    : query(postsCollection, orderBy("createdAt", "asc"), limit(LOG_PAGE_LIMIT + 1));
  const snapshot = await getDocs(postsQuery);
  const visibleDocuments = snapshot.docs.slice(0, LOG_PAGE_LIMIT);
  const posts = visibleDocuments.map(mapPostDocument).filter((post) => !post.deleted);

  return {
    cursor: visibleDocuments.at(-1) ?? null,
    hasNextPage: snapshot.docs.length > LOG_PAGE_LIMIT,
    posts,
  };
}

export async function fetchAllRoomPosts(roomId: string) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const postsQuery = query(
    collection(db, "rooms", roomId, "posts"),
    orderBy("createdAt", "asc"),
  );
  const snapshot = await getDocs(postsQuery);

  return snapshot.docs.map(mapPostDocument).filter((post) => !post.deleted);
}

export async function fetchRoomPostPageCount(roomId: string) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  const snapshot = await getCountFromServer(
    collection(db, "rooms", roomId, "posts"),
  );

  return Math.max(1, Math.ceil(snapshot.data().count / LOG_PAGE_LIMIT));
}

function mapPostDocument(documentSnapshot: QueryDocumentSnapshot<DocumentData>) {
  const data = documentSnapshot.data();

  return {
    id: documentSnapshot.id,
    authorRole: normalizeAuthorRole(data.authorRole, data.type),
    type: data.type === "system" ? "system" : "post",
    authorUid: typeof data.authorUid === "string" ? data.authorUid : "",
    content: typeof data.content === "string" ? data.content : "",
    createdAt:
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : null,
    deleted: data.deleted === true,
  } satisfies RoomPost;
}

export async function createRoomPost(
  roomId: string,
  content: string,
  authorUid: string,
  type: RoomPostType = "post",
  authorRole: RoomPostAuthorRole = "player2",
) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  await addDoc(collection(db, "rooms", roomId, "posts"), {
    authorRole,
    type,
    authorUid,
    content,
    createdAt: serverTimestamp(),
    deleted: false,
  });
}

export async function createSystemRoomPost(
  roomId: string,
  content: string,
  authorUid: string,
) {
  await createRoomPost(roomId, content, authorUid, "system", "system");
}

export async function updateRoomPostContent(
  roomId: string,
  post: RoomPost,
  content: string,
) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  await updateDoc(doc(db, "rooms", roomId, "posts", post.id), {
    content,
  });
}

function normalizeAuthorRole(value: unknown, type: unknown) {
  if (value === "player1" || value === "player2" || value === "system") {
    return value;
  }

  return type === "system" ? "system" : "player2";
}

export async function deleteRoomPost(roomId: string, post: RoomPost) {
  if (!db) {
    throw new Error("Firestore가 초기화되지 않았습니다.");
  }

  await updateDoc(doc(db, "rooms", roomId, "posts", post.id), {
    deleted: true,
  });
}
