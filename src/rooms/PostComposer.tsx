import { Check, ChevronDown, Dices } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { type User } from "firebase/auth";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
import {
  readLocalDraft,
  removeLocalDraft,
  writeLocalDraft,
} from "../lib/localDrafts";
import {
  createRoomPost,
  type RoomPostAuthorRole,
  type RoomPostType,
} from "./posts";
import { subscribeRoomCharacters } from "./characters";

type PostComposerProps = {
  canCreateSystemPost: boolean;
  currentUser: User;
  roomId: string;
};

type CharacterNames = {
  player1: string;
  player2: string;
};

type ComposerIdentity = "player1" | "player2" | "system";

const defaultCharacterNames: CharacterNames = {
  player1: "Player 1",
  player2: "Player 2",
};

export function PostComposer({
  canCreateSystemPost,
  currentUser,
  roomId,
}: PostComposerProps) {
  const draftKey = `letter-duet:${currentUser.uid}:${roomId}:post-composer`;
  const defaultAuthorRole = getDefaultAuthorRole(canCreateSystemPost);
  const [content, setContent] = useState(
    () =>
      readLocalDraft(
        draftKey,
        createEmptyPostComposerDraft(defaultAuthorRole),
      ).content,
  );
  const [postType, setPostType] = useState<RoomPostType>(
    () =>
      readLocalDraft(
        draftKey,
        createEmptyPostComposerDraft(defaultAuthorRole),
      ).type,
  );
  const [authorRole, setAuthorRole] = useState<RoomPostAuthorRole>(
    () => {
      const draft = readLocalDraft<Partial<PostComposerDraft>>(
        draftKey,
        createEmptyPostComposerDraft(defaultAuthorRole),
      );

      return normalizeDraftAuthorRole(draft.authorRole, defaultAuthorRole);
    },
  );
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [characterNames, setCharacterNames] = useState<CharacterNames>(
    defaultCharacterNames,
  );

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
    if (!content && postType === "post") {
      removeLocalDraft(draftKey);
      return;
    }

    writeLocalDraft<PostComposerDraft>(draftKey, {
      authorRole,
      content,
      type: postType,
    });
  }, [authorRole, content, draftKey, postType]);

  useEffect(() => {
    if (
      !canCreateSystemPost &&
      (postType === "system" || authorRole !== "player2")
    ) {
      setPostType("post");
      setAuthorRole("player2");
    }
  }, [authorRole, canCreateSystemPost, content, postType]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isRolling) {
      return;
    }

    const nextContent = content.trim();

    if (!nextContent) {
      setMessage("게시글 내용을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await createRoomPost(
        roomId,
        nextContent,
        currentUser.uid,
        postType,
        authorRole,
      );
      setContent("");
      setPostType("post");
      setAuthorRole(defaultAuthorRole);
      removeLocalDraft(draftKey);
    } catch (error) {
      setMessage(getFirestoreErrorMessage(error, "게시글을 저장하지 못했습니다."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDiceRoll(diceCount: number, sides: number) {
    if (isRolling || postType === "system") {
      return;
    }

    const dice = Array.from({ length: diceCount }, () => rollDie(sides));
    const notation = `${diceCount}D${sides}`;

    setIsRolling(true);
    setMessage("");

    try {
      await createRoomPost(
        roomId,
        formatDicePost(notation, dice),
        currentUser.uid,
        "post",
        authorRole,
      );
    } catch (error) {
      setMessage(
        getFirestoreErrorMessage(error, "주사위 결과를 저장하지 못했습니다."),
      );
    } finally {
      setIsRolling(false);
    }
  }

  return (
    <form className="post-composer" onSubmit={handleSubmit}>
      <div className="post-composer-tools">
        {canCreateSystemPost ? (
          <PostIdentitySelect
            characterNames={characterNames}
            disabled={isSubmitting || isRolling}
            value={postType === "system" ? "system" : authorRole}
            onChange={(identity) => {
              setPostType(identity === "system" ? "system" : "post");
              setAuthorRole(identity);
            }}
          />
        ) : (
          <div className="post-identity-static">
            {characterNames.player2}
          </div>
        )}
        <ComposerDiceButtons
          disabled={isSubmitting || isRolling || postType === "system"}
          onRoll={handleDiceRoll}
        />
      </div>
      <label className="post-composer-input">
        <textarea
          aria-label="게시글 작성"
          disabled={isSubmitting}
          onChange={(event) => setContent(event.target.value)}
          rows={5}
          value={content}
        />
      </label>
      {message ? <p className="form-error">{message}</p> : null}
      <button
        className="primary-button"
        disabled={isSubmitting || isRolling}
        type="submit"
      >
        {isSubmitting ? "전송 중..." : "전송"}
      </button>
    </form>
  );
}

type PostIdentitySelectProps = {
  characterNames: CharacterNames;
  disabled: boolean;
  onChange: (identity: ComposerIdentity) => void;
  value: ComposerIdentity;
};

function PostIdentitySelect({
  characterNames,
  disabled,
  onChange,
  value,
}: PostIdentitySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  const options: { label: string; value: ComposerIdentity }[] = [
    { label: characterNames.player1, value: "player1" },
    { label: characterNames.player2, value: "player2" },
    { label: "system", value: "system" },
  ];
  const selectedLabel = options.find((option) => option.value === value)?.label;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      if (!selectRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div className="post-identity-select" ref={selectRef}>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className="post-identity-trigger"
        disabled={disabled}
        type="button"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedLabel}</span>
        <ChevronDown aria-hidden="true" size={16} strokeWidth={2} />
      </button>
      {isOpen ? (
        <div className="post-identity-menu" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className="post-identity-option"
              key={option.value}
              role="option"
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
            >
              <span>{option.label}</span>
              {option.value === value ? (
                <Check aria-hidden="true" size={15} strokeWidth={2.5} />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type ComposerDiceButtonsProps = {
  disabled: boolean;
  onRoll: (diceCount: number, sides: number) => Promise<void>;
};

const diceOptions = [
  { diceCount: 1, label: "1D6", sides: 6 },
  { diceCount: 2, label: "2D6", sides: 6 },
  { diceCount: 1, label: "1D10", sides: 10 },
] as const;

function ComposerDiceButtons({ disabled, onRoll }: ComposerDiceButtonsProps) {
  return (
    <div className="composer-dice-buttons" aria-label="주사위 굴림">
      <Dices
        aria-hidden="true"
        className="composer-dice-icon"
        size={19}
        strokeWidth={2.2}
      />
      {diceOptions.map((option) => (
        <button
          className="secondary-button composer-dice-button"
          disabled={disabled}
          key={option.label}
          type="button"
          onClick={() => void onRoll(option.diceCount, option.sides)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function rollDie(sides: number) {
  const values = new Uint32Array(1);
  const limit = Math.floor(0x1_0000_0000 / sides) * sides;
  let value = 0;

  do {
    crypto.getRandomValues(values);
    value = values[0];
  } while (value >= limit);

  return (value % sides) + 1;
}

function formatDicePost(notation: string, dice: number[]) {
  const values = dice.join("+");
  const total = dice.reduce((sum, value) => sum + value, 0);

  return dice.length === 1
    ? `::${notation}=${values}`
    : `::${notation}=${values}=${total}`;
}

type PostComposerDraft = {
  authorRole: RoomPostAuthorRole;
  content: string;
  type: RoomPostType;
};

function createEmptyPostComposerDraft(
  authorRole: "player1" | "player2",
): PostComposerDraft {
  return { authorRole, content: "", type: "post" };
}

function getDefaultAuthorRole(canCreateSystemPost: boolean) {
  return canCreateSystemPost ? ("player1" as const) : ("player2" as const);
}

function normalizeDraftAuthorRole(
  value: unknown,
  fallback: "player1" | "player2",
): RoomPostAuthorRole {
  return value === "player1" || value === "player2" || value === "system"
    ? value
    : fallback;
}
