import { useEffect, useState } from "react";
import { getFirestoreErrorMessage } from "../lib/firestoreErrors";
import {
  subscribeRoomStory,
  updateRoomFragmentEffectCount,
} from "./story";

type FragmentEffectPanelProps = {
  canUse: boolean;
  currentUserUid: string;
  roomId: string;
};

export function FragmentEffectPanel({
  canUse,
  currentUserUid,
  roomId,
}: FragmentEffectPanelProps) {
  const [count, setCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");

    return subscribeRoomStory(
      (story) => setCount(story.fragmentEffectCount),
      (error) =>
        setMessage(
          getFirestoreErrorMessage(
            error,
            "프래그먼트 효과를 불러오지 못했습니다.",
          ),
        ),
      roomId,
    );
  }, [roomId]);

  async function changeCount(nextCount: number) {
    setIsSaving(true);
    setMessage("");

    try {
      await updateRoomFragmentEffectCount(
        nextCount,
        roomId,
        currentUserUid,
        nextCount > count ? "사용" : "취소",
      );
    } catch (error) {
      setMessage(
        getFirestoreErrorMessage(error, "프래그먼트 효과를 변경하지 못했습니다."),
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="fragment-effect-panel" aria-labelledby="effect-title">
      <header>
        <strong id="effect-title">프래그먼트 효과</strong>
        <span>{count} / 18</span>
      </header>
      <p className="fragment-effect-description">
        판정값 +2 (7개째 이상은 이계화로 사용 가능)
      </p>
      <div className="fragment-effect-controls">
        <button
          className="text-button"
          disabled={!canUse || isSaving || count === 0}
          type="button"
          onClick={() => void changeCount(count - 1)}
        >
          취소
        </button>
        <div className="fragment-effect-grid" aria-label={`${count}개 사용`}>
          {Array.from({ length: 18 }, (_, index) => (
            <input
              aria-label={`프래그먼트 효과 ${index + 1}`}
              checked={index < count}
              key={index}
              readOnly
              tabIndex={-1}
              type="checkbox"
            />
          ))}
        </div>
        <button
          className="text-button"
          disabled={!canUse || isSaving || count === 18}
          type="button"
          onClick={() => void changeCount(count + 1)}
        >
          사용
        </button>
      </div>
      {message ? <p className="form-error">{message}</p> : null}
    </section>
  );
}
