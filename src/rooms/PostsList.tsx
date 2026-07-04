import { useEffect, useState } from "react";
import { type User } from "firebase/auth";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
import { subscribeRoomCharacters } from "./characters";
import { isDicePostContent, PostMarkdown } from "./PostMarkdown";
import {
  deleteRoomPost,
  subscribeRecentRoomPosts,
  updateRoomPostContent,
  type RoomPost,
} from "./posts";

type PostsListProps = {
  currentUser: User;
  isGM: boolean;
  isReadOnly: boolean;
  roomId: string;
};

type PostsStatus = "loading" | "ready" | "error";

type CharacterNames = {
  player1: string;
  player2: string;
};

const defaultCharacterNames: CharacterNames = {
  player1: "Player 1",
  player2: "Player 2",
};

export function PostsList({
  currentUser,
  isGM,
  isReadOnly,
  roomId,
}: PostsListProps) {
  const [posts, setPosts] = useState<RoomPost[]>([]);
  const [status, setStatus] = useState<PostsStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [characterNames, setCharacterNames] = useState<CharacterNames>(
    defaultCharacterNames,
  );
  const currentAuthorRole = isGM ? "player1" : "player2";

  useEffect(() => {
    return subscribeRoomCharacters(
      (characters) => {
        setCharacterNames({
          player1:
            characters.find((character) => character.id === "player1")?.name ||
            defaultCharacterNames.player1,
          player2:
            characters.find((character) => character.id === "player2")?.name ||
            defaultCharacterNames.player2,
        });
      },
      () => undefined,
      roomId,
    );
  }, [roomId]);

  useEffect(() => {
    setStatus("loading");
    setErrorMessage("");

    try {
      return subscribeRecentRoomPosts(
        (nextPosts) => {
          setPosts(nextPosts);
          setStatus("ready");
        },
        (error) => {
          setStatus("error");
          setErrorMessage(
            getFirestoreErrorMessage(error, "게시글을 불러오지 못했습니다."),
          );
        },
        roomId,
      );
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        getFirestoreErrorMessage(error, "게시글을 불러오지 못했습니다."),
      );
    }
  }, [roomId]);

  const visiblePosts = posts.filter((post) => !post.deleted);

  if (status === "loading") {
    return <div className="posts-state">게시글을 불러오는 중...</div>;
  }

  if (status === "error") {
    return <div className="posts-state posts-state-error">{errorMessage}</div>;
  }

  if (visiblePosts.length === 0) {
    return <div className="posts-state">아직 게시글이 없습니다.</div>;
  }

  return (
    <ol className="posts-list" aria-label="최근 게시글">
      {visiblePosts.map((post) => (
        <PostListItem
          canEdit={
            !isReadOnly && isGM && !isDicePostContent(post.content)
          }
          canDelete={
            !isReadOnly &&
            (isGM ||
              (post.type === "post" && post.authorUid === currentUser.uid))
          }
          currentAuthorRole={currentAuthorRole}
          characterNames={characterNames}
          key={post.id}
          post={post}
          roomId={roomId}
        />
      ))}
    </ol>
  );
}

type PostListItemProps = {
  canDelete: boolean;
  canEdit: boolean;
  characterNames: CharacterNames;
  currentAuthorRole: "player1" | "player2";
  post: RoomPost;
  roomId: string;
};

function PostListItem({
  canDelete,
  canEdit,
  characterNames,
  currentAuthorRole,
  post,
  roomId,
}: PostListItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setDraft(post.content);
      setMessage("");
    }
  }, [isEditing, post.content]);

  async function handleDelete() {
    setIsDeleting(true);
    setMessage("");

    try {
      await deleteRoomPost(roomId, post);
      setIsEditing(false);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      setMessage(getFirestoreErrorMessage(error, "게시글을 삭제하지 못했습니다."));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSave() {
    const nextContent = draft.trim();

    if (!nextContent) {
      setMessage("게시글 내용을 입력해 주세요.");
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      await updateRoomPostContent(roomId, post, nextContent);
      setIsEditing(false);
    } catch (error) {
      setMessage(getFirestoreErrorMessage(error, "게시글을 수정하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <li className={getPostClassName(post, currentAuthorRole)}>
      <article>
        {isEditing ? (
          <div className="post-edit-form">
            <textarea
              disabled={isSaving}
              onChange={(event) => setDraft(event.target.value)}
              rows={5}
              value={draft}
            />
            {message ? <p className="form-error">{message}</p> : null}
            <div>
              <button
                className="primary-button"
                disabled={isSaving}
                type="button"
                onClick={handleSave}
              >
                {isSaving ? "저장 중..." : "저장"}
              </button>
              <button
                className="secondary-button"
                disabled={isSaving}
                type="button"
                onClick={() => setIsEditing(false)}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <PostMarkdown content={post.content} />
        )}
        <footer>
          <div className="post-meta">
            <span
              className={
                post.type === "system" ? undefined : "post-author-name"
              }
            >
              {post.type === "system"
                ? "system"
                : getAuthorLabel(post, characterNames)}
            </span>
            <time dateTime={post.createdAt?.toISOString()}>
              {formatPostDate(post.createdAt)}
            </time>
          </div>
          {!isEditing && (canEdit || canDelete) ? (
            <div className="post-actions">
              {canEdit ? (
                <button
                  className="post-action-button"
                  disabled={isDeleting}
                  type="button"
                  onClick={() => setIsEditing(true)}
                >
                  수정
                </button>
              ) : null}
              {canDelete ? (
                <button
                  className="post-action-button post-action-danger"
                  disabled={isDeleting}
                  type="button"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              ) : null}
            </div>
          ) : null}
        </footer>
        {isDeleteDialogOpen ? (
          <div
            aria-labelledby={`delete-title-${post.id}`}
            aria-modal="true"
            className="post-delete-dialog"
            role="dialog"
          >
            <div className="post-delete-dialog-panel">
              <strong id={`delete-title-${post.id}`}>게시글을 삭제할까요?</strong>
              <p>삭제한 게시글은 목록에서 보이지 않게 됩니다.</p>
              {message ? <p className="form-error">{message}</p> : null}
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
                  onClick={handleDelete}
                >
                  {isDeleting ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </article>
    </li>
  );
}

function getPostClassName(
  post: RoomPost,
  currentAuthorRole: "player1" | "player2",
) {
  if (post.type === "system") {
    return "post-item post-item-system";
  }

  return post.authorRole === currentAuthorRole
    ? "post-item post-item-mine"
    : "post-item post-item-other";
}

function getAuthorLabel(post: RoomPost, characterNames: CharacterNames) {
  return post.authorRole === "player1"
    ? characterNames.player1
    : characterNames.player2;
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
