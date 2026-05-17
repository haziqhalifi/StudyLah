// Web Audio API sound effects — no external files needed

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  return new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
}

function playTone(
  frequencies: number[],
  durations: number[],
  type: OscillatorType,
  gainValue: number,
) {
  const ac = ctx();
  if (!ac) return;

  let time = ac.currentTime;
  frequencies.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    gain.gain.setValueAtTime(gainValue, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + durations[i]);
    osc.start(time);
    osc.stop(time + durations[i]);
    time += durations[i];
  });
}

export function playSubmitSound() {
  // Neutral "click" — short mid-range blip
  playTone([440], [0.08], "sine", 0.25);
}

export function playCorrectSound() {
  // Ascending major triad: C5 → E5 → G5
  playTone([523, 659, 784], [0.12, 0.12, 0.2], "sine", 0.22);
}

export function playWrongSound() {
  // Descending dissonant pair
  playTone([300, 220], [0.15, 0.25], "sawtooth", 0.12);
}
