let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmTimers: number[] = [];
let padOscillators: OscillatorNode[] = [];
let bgmProfile: BgmProfile | null = null;
let bgmIntensity = 1;

type GameSfx = 'select' | 'bomb' | 'blast' | 'powerup' | 'door' | 'hit' | 'kick';
type BgmProfile = 'ocean' | 'lightbomb';

const leadNotes = [392, 466.16, 523.25, 587.33, 523.25, 698.46, 622.25, 466.16];
const arpeggioNotes = [293.66, 349.23, 392, 466.16, 523.25, 587.33, 523.25, 392];
const bassNotes = [73.42, 92.5, 110, 98, 73.42, 116.54, 130.81, 110];
const mazeLeadNotes = [523.25, 587.33, 698.46, 783.99, 698.46, 622.25, 587.33, 466.16];
const mazeBassNotes = [65.41, 82.41, 98, 110, 82.41, 123.47, 98, 73.42];

function makeContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioContext) {
    audioContext = new AudioContextCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = 0.16;
    masterGain.connect(audioContext.destination);
  }
  return audioContext;
}

function addTimer(callback: () => void, ms: number) {
  const timer = window.setInterval(callback, ms);
  bgmTimers.push(timer);
}

function playTone(
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume: number,
  detune = 0,
) {
  if (!audioContext || !masterGain) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, start);
  osc.detune.setValueAtTime(detune, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.34), start + duration * 0.45);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(masterGain);
  osc.start(start);
  osc.stop(start + duration + 0.04);
}

function playNoise(start: number, duration: number, volume: number, frequency: number, type: BiquadFilterType) {
  if (!audioContext || !masterGain) return;
  const length = Math.max(1, Math.floor(audioContext.sampleRate * duration));
  const buffer = audioContext.createBuffer(1, length, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const source = audioContext.createBufferSource();
  const filter = audioContext.createBiquadFilter();
  const gain = audioContext.createGain();
  source.buffer = buffer;
  filter.type = type;
  filter.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(masterGain);
  source.start(start);
  source.stop(start + duration + 0.02);
}

function startPad() {
  if (!audioContext || !masterGain || padOscillators.length) return;
  [146.83, 220, 293.66, 369.99].forEach((frequency, index) => {
    const osc = audioContext!.createOscillator();
    const filter = audioContext!.createBiquadFilter();
    const gain = audioContext!.createGain();
    osc.type = index % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = frequency;
    osc.detune.value = index * 5 - 7;
    filter.type = 'lowpass';
    filter.frequency.value = 980 + index * 180;
    gain.gain.value = 0.01 + index * 0.003;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain!);
    osc.start();
    padOscillators.push(osc);
  });
}

function stopBgmPlayback(suspend: boolean) {
  bgmTimers.forEach((timer) => window.clearInterval(timer));
  bgmTimers = [];
  padOscillators.forEach((oscillator) => {
    try {
      oscillator.stop();
    } catch {
      // Already stopped by the browser.
    }
    oscillator.disconnect();
  });
  padOscillators = [];
  bgmProfile = null;
  if (suspend) void audioContext?.suspend().catch(() => undefined);
}

function startDefaultBgm(context: AudioContext) {
  let step = 0;
  addTimer(() => {
    const now = context.currentTime;
    const bass = bassNotes[step % bassNotes.length];
    if (step % 4 === 0) {
      playTone(bass, now, 0.18, 'sine', 0.115);
      playNoise(now, 0.045, 0.03, 140, 'lowpass');
    }
    if (step % 4 === 2) playTone(bass * 1.5, now, 0.08, 'triangle', 0.035);
    if (step % 2 === 1) playNoise(now, 0.028, 0.018, 2200, 'highpass');
    if (step % 8 === 6) playTone(leadNotes[(step / 2) % leadNotes.length], now, 0.16, 'sawtooth', 0.026, -9);
    step += 1;
  }, 210);

  let arpStep = 0;
  addTimer(() => {
    const now = context.currentTime;
    const note = arpeggioNotes[arpStep % arpeggioNotes.length];
    playTone(note, now, 0.09, 'square', 0.022, arpStep % 2 ? 5 : -5);
    if (arpStep % 6 === 0) playTone(note * 2, now + 0.035, 0.08, 'triangle', 0.016);
    arpStep += 1;
  }, 140);

  let leadStep = 0;
  addTimer(() => {
    const now = context.currentTime;
    const note = leadNotes[leadStep % leadNotes.length];
    playTone(note, now, 0.34, 'triangle', 0.055);
    playTone(note * 0.5, now + 0.02, 0.46, 'sine', 0.03);
    leadStep += 1;
  }, 1680);

  addTimer(() => {
    const now = context.currentTime;
    playNoise(now, 0.42, 0.022, 3600, 'bandpass');
    playTone(880, now + 0.05, 0.22, 'triangle', 0.018);
  }, 3360);
}

function startLightBombBgm(context: AudioContext) {
  let beat = 0;
  addTimer(() => {
    const now = context.currentTime;
    const intensity = bgmIntensity;
    const bass = mazeBassNotes[beat % mazeBassNotes.length];
    if (beat % 2 === 0) {
      playTone(bass, now, 0.14, 'sawtooth', 0.09 + intensity * 0.018, -6);
      playNoise(now, 0.035, 0.026 + intensity * 0.006, 190, 'lowpass');
    } else {
      playNoise(now, 0.022, 0.018 + intensity * 0.005, 3200, 'highpass');
    }
    if (beat % 4 === 3) playTone(bass * 2, now + 0.025, 0.07, 'triangle', 0.028 + intensity * 0.005);
    if (intensity > 1.2 && beat % 8 === 5) playNoise(now, 0.08, 0.018, 1200, 'bandpass');
    beat += 1;
  }, 155);

  let pulse = 0;
  addTimer(() => {
    const now = context.currentTime;
    const intensity = bgmIntensity;
    const note = mazeLeadNotes[pulse % mazeLeadNotes.length];
    playTone(note, now, 0.08, 'square', 0.018 + intensity * 0.006, pulse % 2 ? 7 : -7);
    playTone(note * 1.5, now + 0.048, 0.07, 'triangle', 0.012 + intensity * 0.004);
    if (pulse % 4 === 0) playTone(note * 0.5, now, 0.18, 'sine', 0.018);
    pulse += 1;
  }, 310);

  let lead = 0;
  addTimer(() => {
    const now = context.currentTime;
    const intensity = bgmIntensity;
    const note = mazeLeadNotes[(lead * 2 + Math.floor(intensity)) % mazeLeadNotes.length];
    playTone(note, now, 0.24, 'triangle', 0.045 + intensity * 0.006);
    playTone(note * 2, now + 0.09, 0.12, 'sine', 0.018 + intensity * 0.004);
    lead += 1;
  }, 1240);

  addTimer(() => {
    const now = context.currentTime;
    playNoise(now, 0.34, 0.02 + bgmIntensity * 0.006, 4200, 'bandpass');
    playTone(1046.5, now + 0.04, 0.2, 'triangle', 0.016 + bgmIntensity * 0.004);
  }, 2480);
}

export function setOceanBgmIntensity(intensity: number) {
  bgmIntensity = Math.max(0.8, Math.min(1.8, intensity));
}

export async function startOceanBgm(profile: BgmProfile = 'ocean', intensity = 1) {
  const context = makeContext();
  if (!context) return;
  if (context.state === 'suspended') await context.resume();
  setOceanBgmIntensity(intensity);
  if (bgmTimers.length && bgmProfile !== profile) stopBgmPlayback(false);
  startPad();
  if (bgmTimers.length) return;
  bgmProfile = profile;
  if (profile === 'lightbomb') startLightBombBgm(context);
  else startDefaultBgm(context);
}

export function playGameSfx(kind: GameSfx) {
  const context = makeContext();
  if (!context) return;
  if (context.state === 'suspended') void context.resume().catch(() => undefined);
  const now = context.currentTime;
  if (kind === 'bomb') {
    playTone(220, now, 0.1, 'triangle', 0.08);
    playTone(330, now + 0.02, 0.12, 'sine', 0.05);
  } else if (kind === 'blast') {
    playTone(88, now, 0.22, 'sawtooth', 0.13);
    playNoise(now, 0.24, 0.085, 640, 'lowpass');
  } else if (kind === 'powerup') {
    playTone(523.25, now, 0.09, 'triangle', 0.07);
    playTone(783.99, now + 0.065, 0.13, 'triangle', 0.06);
  } else if (kind === 'door') {
    playTone(392, now, 0.16, 'sine', 0.06);
    playTone(587.33, now + 0.08, 0.2, 'triangle', 0.065);
    playTone(880, now + 0.16, 0.26, 'triangle', 0.05);
  } else if (kind === 'hit') {
    playTone(146.83, now, 0.16, 'sawtooth', 0.1, -20);
    playNoise(now, 0.18, 0.055, 380, 'lowpass');
  } else if (kind === 'kick') {
    playTone(196, now, 0.06, 'square', 0.065);
    playNoise(now, 0.06, 0.03, 1500, 'bandpass');
  } else {
    playTone(698.46, now, 0.07, 'triangle', 0.045);
  }
}

export function stopOceanBgm() {
  stopBgmPlayback(true);
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}
