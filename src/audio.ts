let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bassTimer: number | null = null;
let leadTimer: number | null = null;
let padOscillators: OscillatorNode[] = [];

const leadNotes = [392, 466.16, 523.25, 587.33, 523.25, 466.16, 349.23, 392];
const bassNotes = [98, 116.54, 130.81, 87.31];

function makeContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioContext) {
    audioContext = new AudioContextCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.13;
    masterGain.connect(audioContext.destination);
  }
  return audioContext;
}

function playTone(frequency: number, start: number, duration: number, type: OscillatorType, volume: number) {
  if (!audioContext || !masterGain) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(start);
  osc.stop(start + duration + 0.03);
}

function startPad() {
  if (!audioContext || !masterGain || padOscillators.length) return;
  [196, 246.94, 293.66].forEach((frequency, index) => {
    const osc = audioContext!.createOscillator();
    const gain = audioContext!.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.value = 0.018 + index * 0.004;
    osc.connect(gain);
    gain.connect(masterGain!);
    osc.start();
    padOscillators.push(osc);
  });
}

export async function startOceanBgm() {
  const context = makeContext();
  if (!context) return;
  if (context.state === 'suspended') await context.resume();
  startPad();
  if (leadTimer || bassTimer) return;

  let leadStep = 0;
  let bassStep = 0;
  leadTimer = window.setInterval(() => {
    const now = context.currentTime;
    playTone(leadNotes[leadStep % leadNotes.length], now, 0.34, 'triangle', 0.055);
    leadStep += 1;
  }, 420);

  bassTimer = window.setInterval(() => {
    const now = context.currentTime;
    playTone(bassNotes[bassStep % bassNotes.length], now, 0.58, 'sine', 0.075);
    bassStep += 1;
  }, 840);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
