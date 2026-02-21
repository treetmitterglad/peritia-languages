type SoundEffect = "correct" | "fail" | "finished";

const sounds: Record<SoundEffect, HTMLAudioElement> = {
  correct: new Audio("/sounds/correct.wav"),
  fail: new Audio("/sounds/fail.wav"),
  finished: new Audio("/sounds/finished.wav"),
};

export function playSound(effect: SoundEffect) {
  try {
    const audio = sounds[effect];
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {}
}
