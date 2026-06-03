let audioContext: AudioContext | null = null;
let masterGain: GainNode | null = null;
let bgmTimers: number[] = [];
let padOscillators: OscillatorNode[] = [];
let bgmProfile: BgmProfile | null = null;
let bgmIntensity = 1;
let userVolume = 0.72;
let muted = false;

type GameSfx = 'select' | 'bomb' | 'blast' | 'powerup' | 'door' | 'hit' | 'kick' | 'step' | 'shoot' | 'score' | 'warning' | 'level';
type BgmProfile = 'ocean' | 'lightbomb' | 'city' | 'snake';

const leadNotes = [392, 466.16, 523.25, 587.33, 523.25, 698.46, 622.25, 466.16];
const arpeggioNotes = [293.66, 349.23, 392, 466.16, 523.25, 587.33, 523.25, 392];
const bassNotes = [73.42, 92.5, 110, 98, 73.42, 116.54, 130.81, 110];
const mazeLeadNotes = [523.25, 587.33, 698.46, 783.99, 698.46, 622.25, 587.33, 466.16];
const mazeBassNotes = [65.41, 82.41, 98, 110, 82.41, 123.47, 98, 73.42];
const cityLeadNotes = [196, 246.94, 293.66, 349.23, 392, 349.23, 293.66, 246.94];
const cityBassNotes = [55, 65.41, 82.41, 73.42, 55, 92.5, 98, 73.42];
const snakeLeadNotes = [329.63, 392, 493.88, 587.33, 523.25, 440, 392, 493.88];
const snakeBassNotes = [82.41, 98, 123.47, 110, 82.41, 130.81, 146.83, 98];

function masterGainValue() {
  return muted ? 0 : userVolume * 0.22;
}

function applyMasterGain() {
  if (!audioContext || !masterGain) return;
  const now = audioContext.currentTime;
  masterGain.gain.cancelScheduledValues(now);
  masterGain.gain.setTargetAtTime(masterGainValue(), now, 0.025);
}

function makeContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;
  if (!audioContext) {
    audioContext = new AudioContextCtor();
    masterGain = audioContext.createGain();
    masterGain.gain.value = masterGainValue();
    masterGain.connect(audioContext.destination);
  }
  applyMasterGain();
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

function startCityBgm(context: AudioContext) {
  let beat = 0;
  addTimer(() => {
    const now = context.currentTime;
    const intensity = bgmIntensity;
    const bass = cityBassNotes[beat % cityBassNotes.length];
    playTone(bass, now, 0.13, 'sawtooth', 0.082 + intensity * 0.02, -8);
    if (beat % 2 === 0) playNoise(now, 0.04, 0.03 + intensity * 0.005, 180, 'lowpass');
    if (beat % 4 === 2) playTone(bass * 2, now + 0.035, 0.08, 'square', 0.03 + intensity * 0.005);
    if (beat % 8 === 7) playNoise(now, 0.09, 0.022, 980, 'bandpass');
    beat += 1;
  }, 170);

  let pulse = 0;
  addTimer(() => {
    const now = context.currentTime;
    const note = cityLeadNotes[pulse % cityLeadNotes.length];
    playTone(note, now, 0.08, 'square', 0.018 + bgmIntensity * 0.004, pulse % 2 ? 9 : -9);
    if (pulse % 3 === 0) playTone(note * 1.5, now + 0.04, 0.08, 'triangle', 0.012 + bgmIntensity * 0.004);
    pulse += 1;
  }, 255);

  let alarm = 0;
  addTimer(() => {
    const now = context.currentTime;
    const note = cityLeadNotes[(alarm * 2) % cityLeadNotes.length];
    playTone(note, now, 0.22, 'triangle', 0.04 + bgmIntensity * 0.006);
    playTone(note * 0.5, now + 0.03, 0.32, 'sine', 0.026 + bgmIntensity * 0.004);
    alarm += 1;
  }, 1360);
}

function startSnakeBgm(context: AudioContext) {
  let ripple = 0;
  addTimer(() => {
    const now = context.currentTime;
    const intensity = bgmIntensity;
    const bass = snakeBassNotes[ripple % snakeBassNotes.length];
    if (ripple % 2 === 0) playTone(bass, now, 0.18, 'sine', 0.06 + intensity * 0.014);
    playNoise(now, 0.035, 0.012 + intensity * 0.004, 2800, 'bandpass');
    if (ripple % 4 === 3) playTone(bass * 1.5, now + 0.05, 0.12, 'triangle', 0.022 + intensity * 0.004);
    ripple += 1;
  }, 230);

  let shimmer = 0;
  addTimer(() => {
    const now = context.currentTime;
    const note = snakeLeadNotes[shimmer % snakeLeadNotes.length];
    playTone(note, now, 0.1, 'triangle', 0.032 + bgmIntensity * 0.004, shimmer % 2 ? 5 : -5);
    playTone(note * 2, now + 0.055, 0.08, 'sine', 0.014 + bgmIntensity * 0.003);
    shimmer += 1;
  }, 460);

  let phrase = 0;
  addTimer(() => {
    const now = context.currentTime;
    const note = snakeLeadNotes[(phrase * 3) % snakeLeadNotes.length];
    playTone(note, now, 0.34, 'triangle', 0.043 + bgmIntensity * 0.005);
    playNoise(now + 0.04, 0.28, 0.014 + bgmIntensity * 0.003, 3600, 'bandpass');
    phrase += 1;
  }, 1840);
}

export function setOceanBgmIntensity(intensity: number) {
  bgmIntensity = Math.max(0.8, Math.min(1.8, intensity));
}

export function setOceanMasterVolume(volume: number) {
  userVolume = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0.72;
  applyMasterGain();
}

export function setOceanMuted(nextMuted: boolean) {
  muted = nextMuted;
  applyMasterGain();
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
  else if (profile === 'city') startCityBgm(context);
  else if (profile === 'snake') startSnakeBgm(context);
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
  } else if (kind === 'step') {
    playTone(116.54, now, 0.035, 'triangle', 0.028);
    playNoise(now, 0.035, 0.015, 260, 'lowpass');
  } else if (kind === 'shoot') {
    playTone(392, now, 0.045, 'square', 0.052);
    playTone(196, now + 0.018, 0.055, 'triangle', 0.032);
    playNoise(now, 0.04, 0.018, 1800, 'bandpass');
  } else if (kind === 'score') {
    playTone(659.25, now, 0.07, 'triangle', 0.055);
    playTone(987.77, now + 0.045, 0.09, 'sine', 0.038);
  } else if (kind === 'warning') {
    playTone(174.61, now, 0.12, 'sawtooth', 0.06, -15);
    playTone(174.61, now + 0.14, 0.12, 'sawtooth', 0.05, -15);
  } else if (kind === 'level') {
    playTone(293.66, now, 0.11, 'triangle', 0.06);
    playTone(440, now + 0.08, 0.12, 'triangle', 0.06);
    playTone(659.25, now + 0.17, 0.2, 'triangle', 0.052);
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
