import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { AccountPanel } from "../auth/AccountPanel";
import { AppLayout } from "../layout/AppLayout";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
import {
  fetchRoomCharacters,
  type CharacterRole,
  type RoomCharacter,
} from "../rooms/characters";
import { PostMarkdown } from "../rooms/PostMarkdown";
import {
  fetchAllRoomPosts,
  fetchRoomPostPageCount,
  fetchRoomPostsPage,
  type RoomPost,
  type RoomPostsPageCursor,
} from "../rooms/posts";
import { fetchRoomAccess, setRoomDeleted } from "../rooms/rooms";

type RoomLogPageProps = {
  authSetupError: string;
  currentUser: User | null;
  onLogout: () => Promise<void>;
};

type LogStatus = "loading" | "ready" | "error";

export function RoomLogPage({
  authSetupError,
  currentUser,
  onLogout,
}: RoomLogPageProps) {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [cursor, setCursor] = useState<RoomPostsPageCursor>(null);
  const [previousCursors, setPreviousCursors] = useState<RoomPostsPageCursor[]>(
    [],
  );
  const [nextCursor, setNextCursor] = useState<RoomPostsPageCursor>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [status, setStatus] = useState<LogStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [gmUid, setGmUid] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [characterNames, setCharacterNames] = useState({
    player1: "Player 1",
    player2: "Player 2",
  });
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    if (!currentUser || !roomId) {
      return undefined;
    }

    let isMounted = true;

    void fetchRoomCharacters(roomId)
      .then((characters) => {
        if (!isMounted) {
          return;
        }

        setCharacterNames({
          player1:
            characters.find((character) => character.id === "player1")?.name ||
            "Player 1",
          player2:
            characters.find((character) => character.id === "player2")?.name ||
            "Player 2",
        });
      })
      .catch((error) => {
        if (isMounted) {
          setErrorMessage(
            getFirestoreErrorMessage(
              error,
              "캐릭터 이름을 불러오지 못했습니다.",
            ),
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, roomId]);

  useEffect(() => {
    if (!currentUser || !roomId) {
      setTotalPages(1);
      return undefined;
    }

    let isMounted = true;

    void fetchRoomPostPageCount(roomId)
      .then((pageCount) => {
        if (isMounted) {
          setTotalPages(pageCount);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTotalPages(1);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, roomId]);

  useEffect(() => {
    if (!currentUser || !roomId) {
      setGmUid("");
      setRoomTitle("");
      return undefined;
    }

    let isMounted = true;

    void fetchRoomAccess(roomId)
      .then((room) => {
        if (isMounted) {
          setGmUid(room.gmUid);
          setRoomTitle(room.title);
        }
      })
      .catch(() => {
        if (isMounted) {
          navigate("/rooms", { replace: true });
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, navigate, roomId]);

  useEffect(() => {
    if (!currentUser || !roomId) {
      return undefined;
    }

    let isMounted = true;

    setStatus("loading");
    setErrorMessage("");

    fetchRoomPostsPage(roomId, cursor)
      .then((page) => {
        if (!isMounted) {
          return;
        }

        setPosts(page.posts);
        setNextCursor(page.cursor);
        setHasNextPage(page.hasNextPage);
        setStatus("ready");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          getFirestoreErrorMessage(error, "로그를 불러오지 못했습니다."),
        );
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser, cursor, roomId]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!roomId) {
    return <Navigate to="/rooms" replace />;
  }

  const isGM = gmUid === currentUser.uid;
  const currentAuthorRole = isGM ? "player1" : "player2";

  function goNextPage() {
    if (!nextCursor || !hasNextPage) {
      return;
    }

    setPreviousCursors((cursors) => [...cursors, cursor]);
    setCursor(nextCursor);
  }

  function goPreviousPage() {
    setPreviousCursors((cursors) => {
      if (cursors.length === 0) {
        return cursors;
      }

      const nextPreviousCursors = cursors.slice(0, -1);
      setCursor(cursors[cursors.length - 1]);
      return nextPreviousCursors;
    });
  }

  async function handleExportText() {
    if (!currentUser) {
      return;
    }

    setIsExporting(true);
    setErrorMessage("");

    try {
      const [allPosts, characters, room] = await Promise.all([
        fetchAllRoomPosts(roomId),
        fetchRoomCharacters(roomId),
        fetchRoomAccess(roomId),
      ]);
      downloadTextFile(
        formatRoomLogAsText(allPosts, characters, roomId, room.title),
        `letter-duet-${roomId}-log.txt`,
      );
    } catch (error) {
      setErrorMessage(
        getFirestoreErrorMessage(error, "로그를 내보내지 못했습니다."),
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDeleteRoom() {
    if (!isGM) {
      return;
    }

    setIsDeleting(true);
    setErrorMessage("");

    try {
      await setRoomDeleted(roomId);
      navigate("/rooms", { replace: true });
    } catch (error) {
      setErrorMessage(
        getFirestoreErrorMessage(error, "세션방을 삭제하지 못했습니다."),
      );
      setIsDeleting(false);
    }
  }

  return (
    <AppLayout
      authSetupError={authSetupError}
      navigation={
        <div className="room-toolbar">
          <div className="top-menu-group top-menu-group-tools">
            <button
              className="secondary-button"
              disabled={isExporting}
              type="button"
              onClick={handleExportText}
            >
              {isExporting ? "내보내는 중..." : "txt 내보내기"}
            </button>
          </div>
          <div className="top-menu-group top-menu-group-session">
            <Link className="secondary-link-button" to={`/rooms/${roomId}`}>
              진행
            </Link>
            <AccountPanel currentUser={currentUser} onLogout={onLogout} />
          </div>
        </div>
      }
      title={`${roomTitle || roomId} · 로그`}
      variant="app"
    >
      {errorMessage && status === "ready" ? (
        <p className="form-error">{errorMessage}</p>
      ) : null}
      {status === "loading" ? (
        <div className="posts-state">로그를 불러오는 중...</div>
      ) : status === "error" ? (
        <div className="posts-state posts-state-error">{errorMessage}</div>
      ) : posts.length > 0 ? (
        <>
          <ol className="posts-list log-posts-list" aria-label="세션 로그">
            {posts.map((post) => (
              <li
                className={getLogPostClassName(post, currentAuthorRole)}
                key={post.id}
              >
                <article>
                  <PostMarkdown content={post.content} />
                  <footer>
                    <div className="post-meta">
                      <span>{getLogPostAuthor(post, characterNames)}</span>
                      <time dateTime={post.createdAt?.toISOString()}>
                        {formatPostDate(post.createdAt)}
                      </time>
                    </div>
                  </footer>
                </article>
              </li>
            ))}
          </ol>
          <div className="log-pagination">
            <button
              className="secondary-button"
              disabled={previousCursors.length === 0}
              type="button"
              onClick={goPreviousPage}
            >
              이전
            </button>
            <span>
              {previousCursors.length + 1} / {totalPages}
            </span>
            <button
              className="secondary-button"
              disabled={!hasNextPage}
              type="button"
              onClick={goNextPage}
            >
              다음
            </button>
          </div>
        </>
      ) : (
        <div className="posts-state">표시할 로그가 없습니다.</div>
      )}
      {isGM ? (
        <div className="log-room-danger-zone">
          <button
            className="log-room-delete-button"
            type="button"
            onClick={() => setIsDeleteDialogOpen(true)}
          >
            세션룸을 삭제합니다
          </button>
        </div>
      ) : null}
      {isDeleteDialogOpen ? (
        <div
          aria-labelledby="log-room-delete-title"
          aria-modal="true"
          className="post-delete-dialog room-status-dialog"
          role="dialog"
        >
          <div className="post-delete-dialog-panel">
            <strong id="log-room-delete-title">룸을 삭제할까요?</strong>
            <p>{roomTitle}이 룸 목록에서 사라지고 더 이상 접근할 수 없게 됩니다.</p>
            {errorMessage ? <p className="form-error">{errorMessage}</p> : null}
            <div>
              <button
                className="secondary-button"
                disabled={isDeleting}
                type="button"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                취소
              </button>
              <button
                className="primary-button danger-button"
                disabled={isDeleting}
                type="button"
                onClick={() => void handleDeleteRoom()}
              >
                {isDeleting ? "삭제 중..." : "삭제"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppLayout>
  );
}

function formatRoomLogAsText(
  posts: RoomPost[],
  characters: RoomCharacter[],
  roomId: string,
  roomTitle: string,
) {
  const formattedPosts =
    posts.length > 0
      ? posts.map(formatPostAsText).join("\n\n---\n\n")
      : "표시할 로그가 없습니다.";

  return `Letter Duet: ${roomTitle}(${roomId}) log
Exported at: ${new Date().toLocaleString("ko-KR")}

${formatOriginalCharacters(characters)}

---

${formattedPosts}

---

${formatCurrentCharacters(characters)}
`;
}

function getLogPostClassName(
  post: RoomPost,
  currentAuthorRole: "player1" | "player2",
) {
  if (post.type === "system") {
    return "post-item post-item-log post-item-system";
  }

  return post.authorRole === currentAuthorRole
    ? "post-item post-item-log post-item-mine"
    : "post-item post-item-log post-item-other";
}

function getLogPostAuthor(
  post: RoomPost,
  characterNames: { player1: string; player2: string },
) {
  if (post.type === "system") {
    return "system";
  }

  return post.authorRole === "player1"
    ? characterNames.player1
    : characterNames.player2;
}

function formatOriginalCharacters(characters: RoomCharacter[]) {
  return `캐릭터 초기 정보

${characters.map(formatOriginalCharacter).join("\n\n")}`;
}

function formatOriginalCharacter(character: RoomCharacter) {
  const fragments = character.fragments
    .map(
      (fragment, index) =>
        `${index + 1}. ${fragment.original || "(비어 있음)"}`,
    )
    .join("\n");

  return `${character.name} (${formatCharacterRole(character.role)})
${fragments}`;
}

function formatCurrentCharacters(characters: RoomCharacter[]) {
  return `캐릭터 프래그먼트 현황

${characters.map(formatCurrentCharacter).join("\n\n")}`;
}

function formatCurrentCharacter(character: RoomCharacter) {
  const fragments = character.fragments
    .map((fragment, index) => {
      const original = fragment.original || "(비어 있음)";
      const value = fragment.mutated
        ? `${original} -> ${fragment.mutated}`
        : original;

      return `${index + 1}. ${value}`;
    })
    .join("\n");

  return `${character.name} (${formatCharacterRole(character.role)})
${fragments}`;
}

function formatCharacterRole(role: CharacterRole) {
  return role === "binder" ? "바인더" : "시프터";
}

function formatPostAsText(post: RoomPost) {
  return `[${formatPostDate(post.createdAt)}] ${formatPostRole(post)}

${post.content}`;
}

function formatPostRole(post: RoomPost) {
  if (post.type === "system") {
    return "system";
  }

  return post.authorRole === "player1" ? "GM" : "player2";
}

function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function formatPostDate(date: Date | null) {
  if (!date) {
    return "시간 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
