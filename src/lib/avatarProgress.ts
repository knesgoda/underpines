/**
 * Progress for saving a picture, expressed as three honest steps.
 *
 * A single bar that jumps from "92%" to done hides two real waits: after the
 * last byte leaves the phone, storage still has to accept and process the
 * object, and only then does the page record get updated. Each step owns a slice
 * of the bar so the number always means something.
 */
export type AvatarPhase = 'idle' | 'uploading' | 'processing' | 'saving' | 'done';

/** Where each step starts and ends on the bar. */
const BANDS: Record<Exclude<AvatarPhase, 'idle'>, [number, number]> = {
  uploading: [2, 70],
  processing: [70, 90],
  saving: [90, 99],
  done: [100, 100],
};

const LABELS: Record<Exclude<AvatarPhase, 'idle' | 'done'>, string> = {
  uploading: 'Sending your picture',
  processing: 'Processing the image',
  saving: 'Putting it on your page',
};

export const AVATAR_STEP_COUNT = 3;

const STEP_INDEX: Record<Exclude<AvatarPhase, 'idle'>, number> = {
  uploading: 1,
  processing: 2,
  saving: 3,
  done: 3,
};

/**
 * @param phase   which step we're on
 * @param within  0..1 progress inside that step (real bytes while uploading,
 *                a gentle crawl for the steps we can't measure)
 */
export const avatarProgress = (phase: AvatarPhase, within = 0) => {
  if (phase === 'idle') {
    return { percent: 0, label: '', step: 0, steps: AVATAR_STEP_COUNT, done: false };
  }
  const [start, end] = BANDS[phase];
  const clamped = Math.min(1, Math.max(0, within));
  return {
    percent: Math.round(start + (end - start) * clamped),
    label: phase === 'done' ? 'Done' : LABELS[phase],
    step: STEP_INDEX[phase],
    steps: AVATAR_STEP_COUNT,
    done: phase === 'done',
  };
};

/**
 * The crawl used for the steps with no byte counter: approaches the end of its
 * band without ever claiming to have arrived.
 */
export const crawl = (ticks: number) => 1 - Math.pow(0.72, ticks + 1);
