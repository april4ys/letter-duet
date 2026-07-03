import { useEffect, useState, type FormEvent } from "react";
import { type User } from "firebase/auth";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { AccountPanel } from "../auth/AccountPanel";
import { AppLayout } from "../layout/AppLayout";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
import {
  fetchRoomCards,
  type RoomCard,
} from "../rooms/roomCards";
import { createRoom, setRoomArchived } from "../rooms/rooms";

type RoomsPageProps = {
  authSetupError: string;
  currentUser: User | null;
  onLogout: () => Promise<void>;
};

type RoomsStatus = "loading" | "ready" | "error";

export function RoomsPage({
  authSetupError,
  currentUser,
  onLogout,
}: RoomsPageProps) {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<RoomCard[]>([]);
  const [status, setStatus] = useState<RoomsStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [roomTitle, setRoomTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [updatingRoomId, setUpdatingRoomId] = useState("");

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    let isMounted = true;

    setStatus("loading");
    setErrorMessage("");

    fetchRoomCards()
      .then((roomCards) => {
        if (!isMounted) {
          return;
        }

        setRooms(roomCards);
        setStatus("ready");
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        setStatus("error");
        setErrorMessage(
          getFirestoreErrorMessage(error, "세션방을 불러오지 못했습니다."),
        );
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  async function handleCreateRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) {
      return;
    }

    setIsCreating(true);
    setErrorMessage("");

    try {
      const roomId = await createRoom(currentUser, {
        title: roomTitle,
      });
      navigate(`/rooms/${roomId}`);
    } catch (error) {
      setErrorMessage(
        getFirestoreErrorMessage(error, "세션방을 생성하지 못했습니다."),
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleToggleArchived(room: RoomCard) {
    if (!currentUser || room.gmUid !== currentUser.uid) {
      return;
    }

    setUpdatingRoomId(room.id);
    setErrorMessage("");

    try {
      const nextIsArchived = !room.isArchived;

      await setRoomArchived(room.id, nextIsArchived);
      setRooms((currentRooms) =>
        currentRooms.map((currentRoom) =>
          currentRoom.id === room.id
            ? { ...currentRoom, isArchived: nextIsArchived }
            : currentRoom,
        ),
      );
    } catch (error) {
      setErrorMessage(
        getFirestoreErrorMessage(error, "세션 상태를 변경하지 못했습니다."),
      );
    } finally {
      setUpdatingRoomId("");
    }
  }

  return (
    <AppLayout
      authSetupError={authSetupError}
      navigation={
        <div className="room-toolbar">
          <div className="top-menu-group top-menu-group-tools">
            <button
              className="primary-button"
              type="button"
              onClick={() => setIsCreateFormOpen((isOpen) => !isOpen)}
            >
              룸 생성
            </button>
          </div>
          <div className="top-menu-group top-menu-group-session">
            <AccountPanel currentUser={currentUser} onLogout={onLogout} />
          </div>
        </div>
      }
      showNavigationTitle={false}
      title="세션방"
      variant="app"
      workspaceSurface="plain"
    >
      {isCreateFormOpen ? (
        <form className="room-create-form" onSubmit={handleCreateRoom}>
          <div>
            <span>새 룸</span>
            <strong>세션방 생성</strong>
            <p>현재 계정이 GM이 되고, GM이 아닌 접속자는 player2를 맡습니다.</p>
          </div>
          <label className="inline-field">
            <span>방 제목</span>
            <input
              disabled={isCreating}
              onChange={(event) => setRoomTitle(event.target.value)}
              placeholder="Letter Duet"
              required
              value={roomTitle}
            />
          </label>
          <button className="primary-button" disabled={isCreating} type="submit">
            {isCreating ? "생성 중..." : "룸 생성"}
          </button>
        </form>
      ) : null}
      {errorMessage && status === "ready" ? (
        <p className="form-error">{errorMessage}</p>
      ) : null}
      {status === "loading" ? (
        <div className="posts-state">세션방을 불러오는 중...</div>
      ) : status === "error" ? (
        <div className="posts-state posts-state-error">{errorMessage}</div>
      ) : rooms.length > 0 ? (
        <section className="room-card-list" aria-label="세션방 목록">
          {rooms.map((room) => (
            <RoomCardItem
              currentUser={currentUser}
              isUpdating={updatingRoomId === room.id}
              key={room.id}
              onToggleArchived={handleToggleArchived}
              room={room}
            />
          ))}
        </section>
      ) : (
        <div className="room-placeholder">
          <div>
            <span>rooms</span>
            <strong>세션방이 없습니다.</strong>
          </div>
          <p>위의 생성 폼에서 새 세션방을 만들 수 있습니다.</p>
        </div>
      )}
    </AppLayout>
  );
}

function RoomCardItem({
  currentUser,
  isUpdating,
  onToggleArchived,
  room,
}: {
  currentUser: User;
  isUpdating: boolean;
  onToggleArchived: (room: RoomCard) => Promise<void>;
  room: RoomCard;
}) {
  const isGM = room.gmUid === currentUser.uid;
  const roleLabel = isGM ? "GM" : "Player";
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);

  async function handleStatusChange() {
    await onToggleArchived(room);
    setIsStatusDialogOpen(false);
  }

  return (
    <article className="room-card">
      <header>
        <div className="room-card-badges">
          <small className="room-card-role-badge">{roleLabel}</small>
          {isGM ? (
            <button
              className={
                room.isArchived
                  ? "room-card-status-button room-card-status-archived"
                  : "room-card-status-button"
              }
              disabled={isUpdating}
              type="button"
              onClick={() => setIsStatusDialogOpen(true)}
            >
              {isUpdating ? "변경 중" : room.isArchived ? "종료" : "진행중"}
            </button>
          ) : (
            <small
              className={
                room.isArchived
                  ? "room-card-status-badge room-card-status-archived"
                  : "room-card-status-badge"
              }
            >
              {room.isArchived ? "종료" : "진행중"}
            </small>
          )}
        </div>
        <div className="room-card-heading">
          <strong>{room.title}</strong>
          <time dateTime={room.createdAt?.toISOString()}>
            등록일 {formatRoomDate(room.createdAt)}
          </time>
        </div>
        <div className="room-card-characters">
          <div>
            <span>{room.player1Role}</span>
            <b>{room.player1Name}</b>
          </div>
          <div>
            <span>{room.player2Role}</span>
            <b>{room.player2Name}</b>
          </div>
        </div>
      </header>
      <div className="room-card-actions">
        <Link className="primary-link-button" to={`/rooms/${room.id}`}>
          입장
        </Link>
      </div>
      {isStatusDialogOpen ? (
        <div
          aria-labelledby={`room-status-title-${room.id}`}
          aria-modal="true"
          className="post-delete-dialog room-status-dialog"
          role="dialog"
        >
          <div className="post-delete-dialog-panel">
            <strong id={`room-status-title-${room.id}`}>
              {room.isArchived
                ? "세션을 다시 진행할까요?"
                : "세션을 종료할까요?"}
            </strong>
            <p>
              {room.isArchived
                ? "게시글 작성과 캐릭터 편집을 다시 허용합니다."
                : "종료된 세션은 게시글과 캐릭터를 수정할 수 없는 읽기 전용 상태가 됩니다."}
            </p>
            <div>
              <button
                className="secondary-button"
                disabled={isUpdating}
                type="button"
                onClick={() => setIsStatusDialogOpen(false)}
              >
                취소
              </button>
              <button
                className={
                  room.isArchived
                    ? "primary-button"
                    : "primary-button danger-button"
                }
                disabled={isUpdating}
                type="button"
                onClick={() => void handleStatusChange()}
              >
                {isUpdating
                  ? "변경 중..."
                  : room.isArchived
                    ? "진행 재개"
                    : "종료"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}

function formatRoomDate(date: Date | null) {
  if (!date) {
    return "시간 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
  }).format(date);
}
