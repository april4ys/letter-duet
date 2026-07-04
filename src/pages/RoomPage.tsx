import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { type User } from "firebase/auth";
import { AccountPanel } from "../auth/AccountPanel";
import { AppLayout } from "../layout/AppLayout";
import { CharacterSheets } from "../rooms/CharacterSheets";
import { FragmentEffectPanel } from "../rooms/FragmentEffectPanel";
import { NoticePanel } from "../rooms/NoticePanel";
import { PostComposer } from "../rooms/PostComposer";
import { PostsList } from "../rooms/PostsList";
import { subscribeRoomAccess } from "../rooms/rooms";
import { StoryPanel } from "../rooms/StoryPanel";

type RoomPageProps = {
  authSetupError: string;
  currentUser: User | null;
  onLogout: () => Promise<void>;
};

export function RoomPage({
  authSetupError,
  currentUser,
  onLogout,
}: RoomPageProps) {
  const { roomId = "" } = useParams();
  const navigate = useNavigate();
  const [isCharacterPanelOpen, setIsCharacterPanelOpen] = useState(false);
  const [isNoticePanelOpen, setIsNoticePanelOpen] = useState(false);
  const [gmUid, setGmUid] = useState("");
  const [isRoomAccessReady, setIsRoomAccessReady] = useState(false);
  const [isArchived, setIsArchived] = useState(false);
  const [roomTitle, setRoomTitle] = useState("");

  useEffect(() => {
    if (!currentUser || !roomId) {
      setGmUid("");
      setIsRoomAccessReady(false);
      setIsArchived(false);
      setRoomTitle("");
      return undefined;
    }

    setIsRoomAccessReady(false);

    try {
      return subscribeRoomAccess(
        roomId,
        (room) => {
          setGmUid(room.gmUid);
          setIsRoomAccessReady(true);
          setIsArchived(room.isArchived);
          setRoomTitle(room.title);
        },
        () => {
          setIsRoomAccessReady(false);
          navigate("/rooms", { replace: true });
        },
      );
    } catch {
      setIsRoomAccessReady(false);
      navigate("/rooms", { replace: true });
      return undefined;
    }
  }, [currentUser, navigate, roomId]);

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (!roomId) {
    return <Navigate to="/rooms" replace />;
  }

  const isGM = Boolean(gmUid && gmUid === currentUser.uid);

  return (
    <AppLayout
      authSetupError={authSetupError}
      navigation={
        <div className="room-toolbar">
          <div className="top-menu-group top-menu-group-tools">
            <button
              aria-controls="notice-menu-panel"
              aria-expanded={isNoticePanelOpen}
              className="secondary-button"
              type="button"
              onClick={() => {
                setIsNoticePanelOpen((isOpen) => !isOpen);
                setIsCharacterPanelOpen(false);
              }}
            >
              공지사항
            </button>
            <button
              aria-controls="character-menu-panel"
              aria-expanded={isCharacterPanelOpen}
              className="secondary-button"
              type="button"
              onClick={() => {
                setIsCharacterPanelOpen((isOpen) => !isOpen);
                setIsNoticePanelOpen(false);
              }}
            >
              캐릭터
            </button>
          </div>
          <div className="top-menu-group top-menu-group-session">
            <Link className="secondary-link-button" to={`/rooms/${roomId}/log`}>
              로그
            </Link>
            <AccountPanel currentUser={currentUser} onLogout={onLogout} />
          </div>
        </div>
      }
      title={`${roomTitle || roomId}${isArchived ? " · 종료" : ""}`}
      variant="app"
    >
      <div
        id="character-menu-panel"
        className={
          isCharacterPanelOpen
            ? "character-panel menu-dropdown-panel menu-dropdown-panel-open"
            : "character-panel menu-dropdown-panel"
        }
        aria-hidden={!isCharacterPanelOpen}
      >
        <div className="character-panel-header">
          <strong>캐릭터</strong>
          <button
            className="text-button"
            type="button"
            onClick={() => setIsCharacterPanelOpen(false)}
          >
            닫기
          </button>
        </div>
        <CharacterSheets
          currentUser={currentUser}
          isArchived={isArchived}
          isGM={isGM}
          roomId={roomId}
        />
        <StoryPanel
          canEdit={isGM && !isArchived}
          currentUserUid={currentUser.uid}
          roomId={roomId}
        />
        <FragmentEffectPanel
          canUse={!isArchived}
          currentUserUid={currentUser.uid}
          roomId={roomId}
        />
      </div>
      <div
        id="notice-menu-panel"
        className={
          isNoticePanelOpen
            ? "notice-dropdown-panel menu-dropdown-panel menu-dropdown-panel-open"
            : "notice-dropdown-panel menu-dropdown-panel"
        }
        aria-hidden={!isNoticePanelOpen}
      >
        <NoticePanel
          canEdit={isGM && !isArchived}
          currentUserUid={currentUser.uid}
          onClose={() => setIsNoticePanelOpen(false)}
          roomId={roomId}
        />
      </div>
      <PostsList
        currentUser={currentUser}
        isGM={isGM}
        isReadOnly={isArchived}
        roomId={roomId}
      />
      {isArchived ? (
        <div className="room-read-only-notice">종료된 세션은 읽기 전용입니다.</div>
      ) : isRoomAccessReady ? (
        <PostComposer
          canCreateSystemPost={isGM}
          currentUser={currentUser}
          key={`${roomId}:${isGM ? "gm" : "player"}`}
          roomId={roomId}
        />
      ) : null}
    </AppLayout>
  );
}
