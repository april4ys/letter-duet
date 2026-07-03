import { useEffect, useState } from "react";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
import {
  readLocalDraft,
  removeLocalDraft,
  writeLocalDraft,
} from "../lib/localDrafts";
import { PostMarkdown } from "./PostMarkdown";
import { subscribeRoomNotice, updateRoomNotice } from "./notice";
import { createSystemRoomPost } from "./posts";

type NoticePanelProps = {
  canEdit: boolean;
  currentUserUid: string;
  onClose?: () => void;
  roomId: string;
};

type NoticeStatus = "loading" | "ready" | "error";

export function NoticePanel({
  canEdit,
  currentUserUid,
  onClose,
  roomId,
}: NoticePanelProps) {
  const draftKey = `letter-duet:${currentUserUid}:${roomId}:notice-main`;
  const [content, setContent] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<NoticeStatus>("loading");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStatus("loading");
    setMessage("");

    try {
      return subscribeRoomNotice(
        (notice) => {
          setContent(normalizeNoticeContent(notice.content));
          setStatus("ready");
        },
        (error) => {
          setStatus("error");
          setMessage(
            getFirestoreErrorMessage(error, "공지사항을 불러오지 못했습니다."),
          );
        },
        roomId,
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        getFirestoreErrorMessage(error, "공지사항을 불러오지 못했습니다."),
      );
    }
  }, [roomId]);

  useEffect(() => {
    if (!isEditing) {
      setDraft(content);
    }
  }, [content, isEditing]);

  async function handleSave() {
    const nextContent = draft.trim();

    setIsSaving(true);
    setMessage("");

    try {
      await updateRoomNotice(nextContent, roomId);
      await createSystemRoomPost(
        roomId,
        formatNoticeSystemMessage(nextContent),
        currentUserUid,
      );
      removeLocalDraft(draftKey);
      setIsEditing(false);
    } catch (error) {
      setMessage(getFirestoreErrorMessage(error, "공지사항을 저장하지 못했습니다."));
    } finally {
      setIsSaving(false);
    }
  }

  function beginEditing() {
    setDraft(readLocalDraft(draftKey, content));
    setMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    removeLocalDraft(draftKey);
    setDraft(content);
    setMessage("");
    setIsEditing(false);
  }

  function updateDraft(value: string) {
    setDraft(value);
    writeLocalDraft(draftKey, value);
  }

  if (status === "loading") {
    return <section className="notice-panel">공지사항을 불러오는 중...</section>;
  }

  if (status === "error") {
    return (
      <section className="notice-panel notice-panel-error">{message}</section>
    );
  }

  return (
    <section className="notice-panel" aria-labelledby="notice-title">
      <header>
        <strong id="notice-title">공지사항</strong>
        <div className="notice-panel-actions">
          {canEdit && !isEditing ? (
            <button
              className="post-action-button"
              type="button"
              onClick={beginEditing}
            >
              수정
            </button>
          ) : null}
          {onClose ? (
            <button className="text-button" type="button" onClick={onClose}>
              닫기
            </button>
          ) : null}
        </div>
      </header>
      {isEditing ? (
        <div className="notice-edit-form">
          <textarea
            disabled={isSaving}
            onChange={(event) => updateDraft(event.target.value)}
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
              onClick={cancelEditing}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <PostMarkdown content={content} />
      )}
    </section>
  );
}

function formatNoticeSystemMessage(nextContent: string) {
  return `공지사항 현황

${nextContent}`;
}

function normalizeNoticeContent(content: string) {
  return content === "문단은 빈 줄로 구분합니다." ? "" : content;
}
