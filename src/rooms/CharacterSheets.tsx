import { useEffect, useRef, useState } from "react";
import { type User } from "firebase/auth";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
import {
  subscribeRoomCharacters,
  updateRoomCharacter,
  type CharacterFragment,
  type CharacterRole,
  type RoomCharacter,
} from "./characters";

type CharacterSheetsProps = {
  currentUser: User;
  isArchived: boolean;
  isGM: boolean;
  roomId: string;
};

type CharacterStatus = "loading" | "ready" | "error";
type SaveStatus = "idle" | "saving" | "saved" | "error";

export function CharacterSheets({
  currentUser,
  isArchived,
  isGM,
  roomId,
}: CharacterSheetsProps) {
  const [characters, setCharacters] = useState<RoomCharacter[]>([]);
  const [status, setStatus] = useState<CharacterStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    setStatus("loading");
    setErrorMessage("");

    try {
      return subscribeRoomCharacters(
        (nextCharacters) => {
          setCharacters(nextCharacters);
          setStatus("ready");
        },
        (error) => {
          setStatus("error");
          setErrorMessage(
            getFirestoreErrorMessage(
              error,
              "캐릭터 시트를 불러오지 못했습니다.",
            ),
          );
        },
        roomId,
      );
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        getFirestoreErrorMessage(error, "캐릭터 시트를 불러오지 못했습니다."),
      );
    }
  }, [roomId]);

  if (status === "loading") {
    return <div className="posts-state">캐릭터 시트를 불러오는 중...</div>;
  }

  if (status === "error") {
    return <div className="posts-state posts-state-error">{errorMessage}</div>;
  }

  return (
    <section className="character-sheets" aria-label="캐릭터 시트">
      {sortCharactersByCurrentRole(characters, isGM).map((character) => (
        <CharacterSheetEditor
          canEdit={!isArchived && (isGM || character.id === "player2")}
          character={character}
          currentUser={currentUser}
          isGM={isGM}
          key={character.id}
          roomId={roomId}
        />
      ))}
    </section>
  );
}

type CharacterSheetEditorProps = {
  canEdit: boolean;
  character: RoomCharacter;
  currentUser: User;
  isGM: boolean;
  roomId: string;
};

function CharacterSheetEditor({
  canEdit,
  character,
  currentUser,
  isGM,
  roomId,
}: CharacterSheetEditorProps) {
  const [draft, setDraft] = useState(character);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(character);
    setSaveStatus("idle");
    setSaveMessage("");
  }, [character]);

  useEffect(() => {
    if (!isRoleMenuOpen) {
      return undefined;
    }

    function closeRoleMenu(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !roleMenuRef.current?.contains(event.target)
      ) {
        setIsRoleMenuOpen(false);
      }
    }

    function closeRoleMenuWithEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsRoleMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeRoleMenu);
    document.addEventListener("keydown", closeRoleMenuWithEscape);

    return () => {
      document.removeEventListener("pointerdown", closeRoleMenu);
      document.removeEventListener("keydown", closeRoleMenuWithEscape);
    };
  }, [isRoleMenuOpen]);

  async function saveDraft(nextDraft = draft) {
    if (!canEdit || isSameCharacter(nextDraft, character)) {
      return;
    }

    setSaveStatus("saving");
    setSaveMessage("");

    try {
      const systemMessage = formatCharacterSystemMessage(character, nextDraft);

      await updateRoomCharacter(
        character.id,
        {
          name: nextDraft.name,
          role: nextDraft.role,
          fragments: nextDraft.fragments,
          memo: nextDraft.memo,
        },
        roomId,
        systemMessage
          ? { authorUid: currentUser.uid, content: systemMessage }
          : undefined,
      );
      setSaveStatus("saved");
      setSaveMessage("저장 완료");
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        getFirestoreErrorMessage(error, "캐릭터 시트를 저장하지 못했습니다."),
      );
    }
  }

  function updateFragment(
    index: number,
    field: keyof CharacterFragment,
    value: string,
  ) {
    setDraft((current) => ({
      ...current,
      fragments: current.fragments.map((fragment, fragmentIndex) =>
        fragmentIndex === index ? { ...fragment, [field]: value } : fragment,
      ),
    }));
  }

  function updateRole(role: CharacterRole) {
    const nextDraft = { ...draft, role };

    setDraft(nextDraft);
    setIsRoleMenuOpen(false);
    void saveDraft(nextDraft);
  }

  return (
    <article className="character-sheet">
      <header>
        <div>
          <span>{character.id}</span>
          <input
            className="character-name-input"
            disabled={!canEdit}
            onBlur={() => void saveDraft()}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            value={draft.name}
          />
        </div>
        <small>
          {character.id === "player1" ? "GM" : isGM ? "편집 가능" : "내 캐릭터"}
        </small>
      </header>
      <div className="character-role-select" ref={roleMenuRef}>
        <button
          aria-expanded={isRoleMenuOpen}
          aria-haspopup="listbox"
          className="character-role-trigger"
          disabled={!canEdit}
          type="button"
          onClick={() => setIsRoleMenuOpen((isOpen) => !isOpen)}
        >
          <span>{formatCharacterRole(draft.role)}</span>
          <span aria-hidden="true" className="character-role-chevron" />
        </button>
        {isRoleMenuOpen ? (
          <div className="character-role-menu" role="listbox">
            {(["binder", "shifter"] as const).map((role) => (
              <button
                aria-selected={draft.role === role}
                className="character-role-option"
                key={role}
                role="option"
                type="button"
                onClick={() => updateRole(role)}
              >
                {formatCharacterRole(role)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      <section className="fragment-section">
        <h3>프래그먼트</h3>
        <div className="fragment-list">
          {draft.fragments.map((fragment, index) => (
            <div className="fragment-row" key={`${character.id}-${index}`}>
              <span className="fragment-number">{index + 1}</span>
              <input
                disabled={!canEdit}
                onBlur={() => void saveDraft()}
                onChange={(event) =>
                  updateFragment(index, "original", event.target.value)
                }
                placeholder="original"
                type="text"
                value={fragment.original}
              />
              <span aria-hidden="true" className="fragment-arrow">
                →
              </span>
              <input
                disabled={!canEdit}
                onBlur={() => void saveDraft()}
                onChange={(event) =>
                  updateFragment(index, "mutated", event.target.value)
                }
                placeholder="mutated"
                type="text"
                value={fragment.mutated}
              />
            </div>
          ))}
        </div>
      </section>
      <label className="character-memo">
        <span>Memo</span>
        <textarea
          disabled={!canEdit}
          onBlur={() => void saveDraft()}
          onChange={(event) =>
            setDraft((current) => ({ ...current, memo: event.target.value }))
          }
          rows={5}
          value={draft.memo}
        />
      </label>
      <p
        aria-live="polite"
        className={`character-save-status ${
          saveStatus === "error" ? "form-error" : "form-success"
        }`}
      >
        {saveStatus === "saving" ? "저장 중..." : saveMessage}
      </p>
    </article>
  );
}

function isSameCharacter(left: RoomCharacter, right: RoomCharacter) {
  return (
    left.name === right.name &&
    left.role === right.role &&
    left.memo === right.memo &&
    JSON.stringify(left.fragments) === JSON.stringify(right.fragments)
  );
}

function sortCharactersByCurrentRole(
  characters: RoomCharacter[],
  isGM: boolean,
) {
  const currentCharacterId = isGM ? "player1" : "player2";

  return [...characters].sort((left, right) => {
    if (left.id === currentCharacterId) {
      return 1;
    }

    if (right.id === currentCharacterId) {
      return -1;
    }

    return left.id.localeCompare(right.id);
  });
}

function formatCharacterSystemMessage(
  previousCharacter: RoomCharacter,
  nextCharacter: RoomCharacter,
) {
  const changes: string[] = [];

  if (previousCharacter.name !== nextCharacter.name) {
    changes.push(formatChange("이름", previousCharacter.name, nextCharacter.name));
  }

  if (previousCharacter.role !== nextCharacter.role) {
    changes.push(
      formatChange(
        "역할",
        formatCharacterRole(previousCharacter.role),
        formatCharacterRole(nextCharacter.role),
      ),
    );
  }

  nextCharacter.fragments.forEach((nextFragment, index) => {
    const previousFragment = previousCharacter.fragments[index] ?? {
      original: "",
      mutated: "",
    };
    const fragmentLabel = `Fragment ${index + 1}`;

    if (previousFragment.original !== nextFragment.original) {
      changes.push(
        formatChange(
          `${fragmentLabel} original`,
          previousFragment.original,
          nextFragment.original,
        ),
      );
    }

    if (previousFragment.mutated !== nextFragment.mutated) {
      const sourceOriginal = nextFragment.original || previousFragment.original;

      changes.push(
        formatChange(
          `${fragmentLabel} mutated`,
          sourceOriginal,
          nextFragment.mutated,
        ),
      );
    }
  });

  if (changes.length === 0) {
    return "";
  }

  return `캐릭터 수정: ${nextCharacter.name || previousCharacter.name}

${changes.join("\n\n")}`;
}

function formatChange(label: string, previousValue: string, nextValue: string) {
  return `${label}

${previousValue || "(비어 있음)"}

↓

${nextValue || "(비어 있음)"}`;
}

function formatCharacterRole(role: CharacterRole) {
  return role === "binder" ? "바인더" : "시프터";
}
