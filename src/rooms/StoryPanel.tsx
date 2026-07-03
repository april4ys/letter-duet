import { useEffect, useState } from "react";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
import { PostMarkdown } from "./PostMarkdown";
import { createSystemRoomPost } from "./posts";
import { subscribeRoomStory, updateRoomStory } from "./story";

type StoryPanelProps = {
  canEdit: boolean;
  currentUserUid: string;
  roomId: string;
};

type StoryStatus = "loading" | "ready" | "error";

export function StoryPanel({
  canEdit,
  currentUserUid,
  roomId,
}: StoryPanelProps) {
  const [fragments, setFragments] = useState<string[]>([]);
  const [draftFragments, setDraftFragments] = useState<string[]>([]);
  const [status, setStatus] = useState<StoryStatus>("loading");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setStatus("loading");
    setMessage("");

    try {
      return subscribeRoomStory(
        (story) => {
          setFragments(story.storyFragments);
          setStatus("ready");
        },
        (error) => {
          setStatus("error");
          setMessage(
            getFirestoreErrorMessage(
              error,
              "Story Fragment를 불러오지 못했습니다.",
            ),
          );
        },
        roomId,
      );
    } catch (error) {
      setStatus("error");
      setMessage(
        getFirestoreErrorMessage(
          error,
          "Story Fragment를 불러오지 못했습니다.",
        ),
      );
    }
  }, [roomId]);

  useEffect(() => {
    if (!isEditing) {
      setDraftFragments(fragments);
    }
  }, [fragments, isEditing]);

  function updateDraftFragment(index: number, value: string) {
    setDraftFragments((currentFragments) =>
      currentFragments.map((fragment, fragmentIndex) =>
        fragmentIndex === index ? value : fragment,
      ),
    );
  }

  function addDraftFragment() {
    setDraftFragments((currentFragments) => [...currentFragments, ""]);
  }

  function removeDraftFragment(index: number) {
    setDraftFragments((currentFragments) =>
      currentFragments.filter((_, fragmentIndex) => fragmentIndex !== index),
    );
  }

  async function handleSave() {
    const nextFragments = draftFragments
      .map((fragment) => fragment.trim())
      .filter(Boolean);

    setIsSaving(true);
    setMessage("");

    try {
      await updateRoomStory(nextFragments, roomId);
      await createSystemRoomPost(
        roomId,
        formatStorySystemMessage(nextFragments),
        currentUserUid,
      );
      setIsEditing(false);
    } catch (error) {
      setMessage(
        getFirestoreErrorMessage(error, "Story Fragment를 저장하지 못했습니다."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function beginEditing() {
    setDraftFragments(fragments);
    setMessage("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setDraftFragments(fragments);
    setMessage("");
    setIsEditing(false);
  }

  if (status === "loading") {
    return <section className="story-panel">Story Fragment를 불러오는 중...</section>;
  }

  if (status === "error") {
    return <section className="story-panel story-panel-error">{message}</section>;
  }

  return (
    <section className="story-panel" aria-labelledby="story-title">
      <header>
        <strong id="story-title">Story Fragment</strong>
        {canEdit && !isEditing ? (
          <button
            className="post-action-button"
            type="button"
            onClick={beginEditing}
          >
            수정
          </button>
        ) : null}
      </header>
      {isEditing ? (
        <div className="story-edit-form">
          <div className="story-edit-list">
            {draftFragments.map((fragment, index) => (
              <div className="story-edit-row" key={index}>
                <label>
                  <span>Fragment {index + 1}</span>
                  <textarea
                    disabled={isSaving}
                    onChange={(event) =>
                      updateDraftFragment(index, event.target.value)
                    }
                    rows={4}
                    value={fragment}
                  />
                </label>
                <button
                  className="text-button danger-text-button"
                  disabled={isSaving}
                  type="button"
                  onClick={() => removeDraftFragment(index)}
                >
                  삭제
                </button>
              </div>
            ))}
          </div>
          <button
            className="secondary-button"
            disabled={isSaving}
            type="button"
            onClick={addDraftFragment}
          >
            Fragment 추가
          </button>
          {message ? <p className="form-error">{message}</p> : null}
          <div className="story-edit-actions">
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
      ) : fragments.length > 0 ? (
        <ol className="story-fragment-list">
          {fragments.map((fragment, index) => (
            <li key={`${index}-${fragment}`}>
              <span>Fragment {index + 1}</span>
              <PostMarkdown content={fragment} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="story-empty">아직 Story Fragment가 없습니다.</p>
      )}
    </section>
  );
}

function formatStorySystemMessage(storyFragments: string[]) {
  const content =
    storyFragments.length > 0
      ? storyFragments
          .map((fragment, index) => `Fragment ${index + 1}\n${fragment}`)
          .join("\n\n")
      : "Story Fragment가 비어 있습니다.";

  return `Story Fragment 현황

${content}`;
}
