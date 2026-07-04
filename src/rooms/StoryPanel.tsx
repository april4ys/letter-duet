import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
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
  const [status, setStatus] = useState<StoryStatus>("loading");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIndex, setDeletingIndex] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatus("loading");
    setMessage("");
    closeEditor();

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
    if (isAdding || editingIndex !== null) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingIndex, isAdding]);

  function closeEditor() {
    setEditingIndex(null);
    setIsAdding(false);
    setDraft("");
  }

  function beginAdding() {
    setMessage("");
    setEditingIndex(null);
    setDraft("");
    setIsAdding(true);
  }

  function beginEditing(index: number) {
    if (!canEdit || isSaving) {
      return;
    }

    setMessage("");
    setIsAdding(false);
    setEditingIndex(index);
    setDraft(fragments[index] ?? "");
  }

  async function saveFragments(nextFragments: string[]) {
    setIsSaving(true);
    setMessage("");

    try {
      await updateRoomStory(nextFragments, roomId);
      await createSystemRoomPost(
        roomId,
        formatStorySystemMessage(nextFragments),
        currentUserUid,
      );
      closeEditor();
    } catch (error) {
      setMessage(
        getFirestoreErrorMessage(error, "Story Fragment를 저장하지 못했습니다."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  function submitDraft() {
    const nextValue = draft.trim();

    if (!nextValue || isSaving) {
      return;
    }

    if (isAdding) {
      void saveFragments([...fragments, nextValue]);
      return;
    }

    if (editingIndex !== null) {
      void saveFragments(
        fragments.map((fragment, index) =>
          index === editingIndex ? nextValue : fragment,
        ),
      );
    }
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      submitDraft();
    }

    if (event.key === "Escape") {
      closeEditor();
    }
  }

  function removeFragment(index: number) {
    if (isSaving) {
      return;
    }

    setDeletingIndex(null);
    void saveFragments(
      fragments.filter((_, fragmentIndex) => fragmentIndex !== index),
    );
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
      </header>
      <div className="story-fragment-cloud">
        {fragments.map((fragment, index) =>
          editingIndex === index ? (
            <FragmentInput
              disabled={isSaving}
              inputRef={inputRef}
              key={`editing-${index}`}
              onBlur={closeEditor}
              onChange={setDraft}
              onKeyDown={handleInputKeyDown}
              value={draft}
            />
          ) : (
            <div className="story-fragment-chip" key={`${index}-${fragment}`}>
              <button
                className="story-fragment-label"
                disabled={!canEdit || isSaving}
                type="button"
                onClick={() => beginEditing(index)}
              >
                {fragment}
              </button>
              {canEdit ? (
                <button
                  aria-label={`${fragment} 삭제`}
                  className="story-fragment-remove"
                  disabled={isSaving}
                  title="삭제"
                  type="button"
                  onClick={() => setDeletingIndex(index)}
                >
                  <X aria-hidden="true" size={13} strokeWidth={2.5} />
                </button>
              ) : null}
            </div>
          ),
        )}
        {isAdding ? (
          <FragmentInput
            disabled={isSaving}
            inputRef={inputRef}
            onBlur={closeEditor}
            onChange={setDraft}
            onKeyDown={handleInputKeyDown}
            value={draft}
          />
        ) : canEdit ? (
          <button
            className="story-fragment-add"
            disabled={isSaving}
            type="button"
            onClick={beginAdding}
          >
            추가하기
          </button>
        ) : null}
        {!canEdit && fragments.length === 0 ? (
          <p className="story-empty">아직 Story Fragment가 없습니다.</p>
        ) : null}
      </div>
      {message ? <p className="form-error">{message}</p> : null}
      {deletingIndex !== null
        ? createPortal(
            <div
              aria-labelledby="story-fragment-delete-title"
              aria-modal="true"
              className="post-delete-dialog room-status-dialog"
              role="dialog"
            >
              <div className="post-delete-dialog-panel">
                <strong id="story-fragment-delete-title">
                  Story Fragment를 삭제할까요?
                </strong>
                <p>{fragments[deletingIndex]}</p>
                <div>
                  <button
                    className="secondary-button"
                    disabled={isSaving}
                    type="button"
                    onClick={() => setDeletingIndex(null)}
                  >
                    취소
                  </button>
                  <button
                    className="primary-button danger-button"
                    disabled={isSaving}
                    type="button"
                    onClick={() => removeFragment(deletingIndex)}
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

type FragmentInputProps = {
  disabled: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onBlur: () => void;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  value: string;
};

function FragmentInput({
  disabled,
  inputRef,
  onBlur,
  onChange,
  onKeyDown,
  value,
}: FragmentInputProps) {
  return (
    <input
      aria-label="Story Fragment"
      className="story-fragment-input"
      disabled={disabled}
      maxLength={80}
      ref={inputRef}
      size={16}
      type="text"
      value={value}
      onBlur={onBlur}
      onChange={(event) => onChange(event.target.value)}
      onKeyDown={onKeyDown}
    />
  );
}

function formatStorySystemMessage(storyFragments: string[]) {
  const content =
    storyFragments.length > 0
      ? storyFragments.join(" · ")
      : "Story Fragment가 비어 있습니다.";

  return `Story Fragment 현황\n\n${content}`;
}
