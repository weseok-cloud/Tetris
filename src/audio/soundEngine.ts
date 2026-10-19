/**
 * Web Audio API synthesizer for retro chiptune / arcade Tetris BGM & SFX.
 * Zero external audio files required - loads instantly and plays smoothly.
 */

// Note frequency map
export const NOTES: Record<string, number> = {
  REST: 0,
  C2: 65.41, D2: 73.42, E2: 82.41, F2: 87.31, G2: 98.0, Gs2: 103.83, A2: 110.0, B2: 123.47,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, Fs3: 185.0, G3: 196.0, Gs3: 207.65, A3: 220.0, As3: 233.08, B3: 246.94,
  C4: 261.63, Cs4: 277.18, D4: 293.66, Ds4: 311.13, E4: 329.63, F4: 349.23, Fs4: 369.99, G4: 392.0, Gs4: 415.3, A4: 440.0, As4: 466.16, B4: 493.88,
  C5: 523.25, Cs5: 554.37, D5: 587.33, Ds5: 622.25, E5: 659.25, F5: 698.46, Fs5: 739.99, G5: 783.99, Gs5: 830.61, A5: 880.0, As5: 932.33, B5: 987.77,
  C6: 1046.5, D6: 1174.66, E6: 1318.51, F6: 1396.91, G6: 1567.98, A6: 1760.0
};

export type NoteStep = [note: string, duration: number]; // duration in 1/16th notes or beats

export interface TrackData {
  id: string;
  name: string;
  artist: string;
  tempo: number; // BPM
  lead: NoteStep[];
  bass: NoteStep[];
  drums?: boolean;
}

// 1 beat = 4 16th notes. Durations below are in 16th notes (e.g., 4 = quarter note, 2 = eighth note, 6 = dotted eighth).
// Track 1: Iconic Tetris Theme A (Korobeiniki)
const THEME_A_LEAD: NoteStep[] = [
  // Section A
  ['E5', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['C5', 2], ['B4', 2],
  ['A4', 4], ['A4', 2], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
  ['B4', 6], ['C5', 2], ['D5', 4], ['E5', 4],
  ['C5', 4], ['A4', 4], ['A4', 6], ['REST', 2],

  ['D5', 6], ['F5', 2], ['A5', 4], ['G5', 2], ['F5', 2],
  ['E5', 6], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
  ['B4', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['E5', 4],
  ['C5', 4], ['A4', 4], ['A4', 6], ['REST', 2],

  // Repeat Section A with ornamentation
  ['E5', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['C5', 2], ['B4', 2],
  ['A4', 4], ['A4', 2], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
  ['B4', 6], ['C5', 2], ['D5', 4], ['E5', 4],
  ['C5', 4], ['A4', 4], ['A4', 6], ['REST', 2],

  ['D5', 6], ['F5', 2], ['A5', 4], ['G5', 2], ['F5', 2],
  ['E5', 6], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
  ['B4', 4], ['B4', 2], ['C5', 2], ['D5', 4], ['E5', 4],
  ['C5', 4], ['A4', 4], ['A4', 6], ['REST', 2],

  // Section B (Russian Waltz / GameBoy Tetris Part 2)
  ['E4', 8], ['C4', 8],
  ['D4', 8], ['B3', 8],
  ['C4', 8], ['A3', 8],
  ['Gs3', 8], ['B3', 8],

  ['E4', 8], ['C4', 8],
  ['D4', 8], ['B3', 8],
  ['C4', 4], ['E4', 4], ['A4', 8],
  ['Gs4', 8], ['Gs4', 8],
];

const THEME_A_BASS: NoteStep[] = [
  // Section A bassline (Um-pah rhythm)
  ['E3', 4], ['B2', 4], ['E3', 4], ['B2', 4],
  ['A2', 4], ['E3', 4], ['A2', 4], ['E3', 4],
  ['Gs2', 4], ['E3', 4], ['Gs2', 4], ['E3', 4],
  ['A2', 4], ['E3', 4], ['A2', 4], ['E3', 4],

  ['D3', 4], ['A2', 4], ['D3', 4], ['A2', 4],
  ['C3', 4], ['G2', 4], ['C3', 4], ['G2', 4],
  ['B2', 4], ['Fs2', 4], ['B2', 4], ['E2', 4],
  ['A2', 4], ['E3', 4], ['A2', 4], ['E3', 4],

  // Repeat Section A bassline
  ['E3', 4], ['B2', 4], ['E3', 4], ['B2', 4],
  ['A2', 4], ['E3', 4], ['A2', 4], ['E3', 4],
  ['Gs2', 4], ['E3', 4], ['Gs2', 4], ['E3', 4],
  ['A2', 4], ['E3', 4], ['A2', 4], ['E3', 4],

  ['D3', 4], ['A2', 4], ['D3', 4], ['A2', 4],
  ['C3', 4], ['G2', 4], ['C3', 4], ['G2', 4],
  ['B2', 4], ['Fs2', 4], ['B2', 4], ['E2', 4],
  ['A2', 4], ['E3', 4], ['A2', 4], ['E3', 4],

  // Section B bassline
  ['C3', 4], ['G2', 4], ['C3', 4], ['G2', 4],
  ['B2', 4], ['Fs2', 4], ['B2', 4], ['Fs2', 4],
  ['A2', 4], ['E3', 4], ['A2', 4], ['E3', 4],
  ['E2', 4], ['B2', 4], ['E2', 4], ['B2', 4],

  ['C3', 4], ['G2', 4], ['C3', 4], ['G2', 4],
  ['B2', 4], ['Fs2', 4], ['B2', 4], ['Fs2', 4],
  ['A2', 4], ['C3', 4], ['A2', 4], ['C3', 4],
  ['E2', 4], ['Gs2', 4], ['B2', 4], ['E2', 4],
];

// Track 2: Neon Synthwave Cyber-Tetris
const SYNTHWAVE_LEAD: NoteStep[] = [
  ['A4', 2], ['C5', 2], ['E5', 2], ['A5', 4], ['G5', 2], ['E5', 4],
  ['F5', 2], ['A5', 2], ['C6', 2], ['B5', 4], ['G5', 2], ['E5', 4],
  ['D5', 2], ['F5', 2], ['A5', 2], ['G5', 4], ['F5', 2], ['E5', 4],
  ['E5', 2], ['Gs5', 2], ['B5', 2], ['D6', 4], ['C6', 2], ['B5', 4],

  ['A5', 4], ['E5', 2], ['C5', 2], ['D5', 4], ['E5', 4],
  ['F5', 4], ['E5', 2], ['D5', 2], ['C5', 4], ['B4', 4],
  ['C5', 4], ['D5', 4], ['E5', 4], ['A4', 4],
  ['B4', 4], ['C5', 2], ['B4', 2], ['A4', 8],
];

const SYNTHWAVE_BASS: NoteStep[] = [
  ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2],
  ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2],
  ['D2', 2], ['D2', 2], ['D2', 2], ['D2', 2], ['G2', 2], ['G2', 2], ['G2', 2], ['G2', 2],
  ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2],

  ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2], ['A2', 2],
  ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2], ['F2', 2],
  ['C2', 2], ['C2', 2], ['D2', 2], ['D2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2],
  ['E2', 2], ['E2', 2], ['E2', 2], ['E2', 2], ['A2', 4], ['REST', 4],
];

// Track 3: Kalinka (Energetic Russian Folk)
const KALINKA_LEAD: NoteStep[] = [
  ['A4', 2], ['A4', 2], ['A4', 2], ['A4', 2], ['F4', 4], ['D4', 4],
  ['A4', 4], ['A4', 4], ['F4', 4], ['D4', 4],
  ['E4', 2], ['E4', 2], ['F4', 2], ['G4', 2], ['A4', 4], ['F4', 4],
  ['E4', 4], ['C4', 4], ['D4', 8],

  ['A4', 2], ['A4', 2], ['A4', 2], ['A4', 2], ['F4', 4], ['D4', 4],
  ['A4', 4], ['A4', 4], ['F4', 4], ['D4', 4],
  ['E4', 2], ['E4', 2], ['F4', 2], ['G4', 2], ['A4', 4], ['F4', 4],
  ['E4', 4], ['C4', 4], ['D4', 8],
];

const KALINKA_BASS: NoteStep[] = [
  ['D3', 4], ['A2', 4], ['D3', 4], ['A2', 4],
  ['D3', 4], ['A2', 4], ['D3', 4], ['A2', 4],
  ['A2', 4], ['E3', 4], ['D3', 4], ['A2', 4],
  ['A2', 4], ['A2', 4], ['D3', 8],

  ['D3', 4], ['A2', 4], ['D3', 4], ['A2', 4],
  ['D3', 4], ['A2', 4], ['D3', 4], ['A2', 4],
  ['A2', 4], ['E3', 4], ['D3', 4], ['A2', 4],
  ['A2', 4], ['A2', 4], ['D3', 8],
];

export const TRACKS: TrackData[] = [
  {
    id: 'theme-a',
    name: 'Theme A (Korobeiniki)',
    artist: '고전 오리지널 테마',
    tempo: 144,
    lead: THEME_A_LEAD,
    bass: THEME_A_BASS,
    drums: true,
  },
  {
    id: 'synthwave',
    name: 'Cyber Outrun 1984',
    artist: '네온 신스웨이브 테마',
    tempo: 132,
    lead: SYNTHWAVE_LEAD,
    bass: SYNTHWAVE_BASS,
    drums: true,
  },
  {
    id: 'kalinka',
    name: 'Kalinka Arcade',
    artist: '스피디 포크 댄스',
    tempo: 156,
    lead: KALINKA_LEAD,
    bass: KALINKA_BASS,
    drums: true,
  },
];

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private bgmGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  // Settings
  private _isMuted = false;
  private _bgmMuted = false;
  private _sfxMuted = false;
  private _bgmVolume = 0.55;
  private _sfxVolume = 0.7;

  // Sequencer state
  private currentTrackIndex = 0;
  private isBgmPlaying = false;
  private timerId: number | null = null;
  private leadStep = 0;
  private bassStep = 0;
  private drumStep = 0;
  private nextNoteTime = 0;
  private speedMultiplier = 1.0;

  // Visualizer data buffer
  private dataArray: Uint8Array<ArrayBuffer> | null = null;

  constructor() {
    // AudioContext will be initialized upon user gesture
  }

  public ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this._isMuted ? 0 : 1, this.ctx.currentTime);

      // Analyser for UI visualizer
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 64;
      this.dataArray = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));

      // SFX Bus
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(this._sfxMuted ? 0 : this._sfxVolume, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      // BGM Bus
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.setValueAtTime(this._bgmMuted ? 0 : this._bgmVolume, this.ctx.currentTime);
      this.bgmGain.connect(this.masterGain);

      // Connect to Analyser & Output
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  // Visualizer helper
  public getVisualizerData(): number[] {
    if (!this.analyser || !this.dataArray) return [0, 0, 0, 0, 0, 0, 0, 0];
    this.analyser.getByteFrequencyData(this.dataArray);
    const result: number[] = [];
    const step = Math.max(1, Math.floor(this.dataArray.length / 8));
    for (let i = 0; i < 8; i++) {
      const val = this.dataArray[i * step] || 0;
      result.push(val / 255);
    }
    return result;
  }

  // --- Sound Effects (SFX) ---
  public playTone({
    freq,
    dur = 0.08,
    type = 'square',
    gain = 0.05,
    slide = null,
    delay = 0,
  }: {
    freq: number;
    dur?: number;
    type?: OscillatorType;
    gain?: number;
    slide?: number | null;
    delay?: number;
  }) {
    if (this._isMuted || this._sfxMuted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (slide) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    }

    amp.gain.setValueAtTime(gain, t);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    osc.connect(amp);
    amp.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  public sfxMove() {
    this.playTone({ freq: 240, dur: 0.035, type: 'square', gain: 0.04 });
  }

  public sfxRotate() {
    this.playTone({ freq: 380, dur: 0.07, type: 'triangle', gain: 0.06 });
  }

  public sfxHold() {
    this.playTone({ freq: 520, dur: 0.1, type: 'triangle', slide: 300, gain: 0.06 });
  }

  public sfxDrop() {
    this.playTone({ freq: 190, dur: 0.09, type: 'sawtooth', slide: 70, gain: 0.06 });
  }

  public sfxLock() {
    this.playTone({ freq: 150, dur: 0.08, type: 'square', gain: 0.05 });
  }

  public sfxClear(count: number) {
    if (count === 4) {
      // TETRIS fanfare!
      const tetrisNotes = [523.25, 659.25, 783.99, 1046.5];
      tetrisNotes.forEach((f, i) => {
        this.playTone({ freq: f, dur: 0.16, type: 'triangle', delay: i * 0.07, gain: 0.08 });
      });
      return;
    }
    for (let i = 0; i < count; i += 1) {
      this.playTone({ freq: 440 + i * 160, dur: 0.12, type: 'triangle', delay: i * 0.05, gain: 0.06 });
    }
  }

  public sfxRound() {
    this.playTone({ freq: 523, dur: 0.14, type: 'triangle', gain: 0.08 });
    this.playTone({ freq: 659, dur: 0.14, type: 'triangle', delay: 0.1, gain: 0.08 });
    this.playTone({ freq: 784, dur: 0.18, type: 'triangle', delay: 0.2, gain: 0.09 });
    this.playTone({ freq: 1046, dur: 0.26, type: 'triangle', delay: 0.3, gain: 0.1 });
  }

  public sfxStart() {
    this.playTone({ freq: 392, dur: 0.1, type: 'triangle', gain: 0.07 });
    this.playTone({ freq: 523, dur: 0.14, type: 'triangle', delay: 0.09, gain: 0.08 });
    this.playTone({ freq: 659, dur: 0.2, type: 'triangle', delay: 0.18, gain: 0.09 });
  }

  public sfxOver() {
    this.playTone({ freq: 349, dur: 0.2, type: 'sawtooth', slide: 120, gain: 0.06 });
    this.playTone({ freq: 220, dur: 0.35, type: 'sawtooth', delay: 0.16, slide: 70, gain: 0.06 });
  }

  // --- Background Music (BGM) Engine ---
  private scheduleNote(freq: number, startTime: number, durationSec: number, channel: 'lead' | 'bass') {
    if (!this.ctx || !this.bgmGain || freq <= 0) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    if (channel === 'lead') {
      // 8-bit pulse/square sound with slight vibrato and envelope
      osc.type = 'square';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2600, startTime);

      // Envelope: punchy retro arcade chiptune
      const vol = 0.045;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(vol, startTime + 0.015);
      gain.gain.setValueAtTime(vol * 0.8, startTime + durationSec * 0.7);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec * 0.95);
    } else {
      // Warm retro bass
      osc.type = 'triangle';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800, startTime);

      const vol = 0.065;
      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(vol, startTime + 0.01);
      gain.gain.setValueAtTime(vol * 0.7, startTime + durationSec * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSec * 0.92);
    }

    osc.frequency.setValueAtTime(freq, startTime);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    osc.start(startTime);
    osc.stop(startTime + durationSec);
  }

  private scheduleDrums(startTime: number, stepIndex: number) {
    if (!this.ctx || !this.bgmGain) return;

    // 16th note rhythm: Beat 1, 5, 9, 13 are quarter notes
    const isQuarter = stepIndex % 4 === 0;
    const beatIndex = Math.floor(stepIndex / 4) % 4; // 0: kick, 1: snare, 2: kick, 3: snare

    // Hi-hat on every 8th note
    if (stepIndex % 2 === 0) {
      // White noise burst for hi-hat
      this.playNoise(startTime, 0.03, isQuarter ? 0.02 : 0.012, 6000);
    }

    // Kick on beat 0 and 2
    if (isQuarter && (beatIndex === 0 || beatIndex === 2)) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, startTime);
      osc.frequency.exponentialRampToValueAtTime(35, startTime + 0.09);
      gain.gain.setValueAtTime(0.06, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
      osc.connect(gain);
      gain.connect(this.bgmGain);
      osc.start(startTime);
      osc.stop(startTime + 0.1);
    }

    // Snare on beat 1 and 3
    if (isQuarter && (beatIndex === 1 || beatIndex === 3)) {
      this.playNoise(startTime, 0.08, 0.035, 1800);
      const toneOsc = this.ctx.createOscillator();
      const toneGain = this.ctx.createGain();
      toneOsc.type = 'triangle';
      toneOsc.frequency.setValueAtTime(180, startTime);
      toneGain.gain.setValueAtTime(0.03, startTime);
      toneGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
      toneOsc.connect(toneGain);
      toneGain.connect(this.bgmGain);
      toneOsc.start(startTime);
      toneOsc.stop(startTime + 0.09);
    }
  }

  private playNoise(startTime: number, duration: number, gainLevel: number, cutoff: number) {
    if (!this.ctx || !this.bgmGain) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(cutoff, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.bgmGain);

    noise.start(startTime);
  }

  public setTrack(index: number) {
    if (index >= 0 && index < TRACKS.length) {
      this.currentTrackIndex = index;
      if (this.isBgmPlaying) {
        this.stopBgm();
        this.startBgm();
      }
    }
  }

  public getCurrentTrack(): TrackData {
    return TRACKS[this.currentTrackIndex] || TRACKS[0];
  }

  public getCurrentTrackIndex(): number {
    return this.currentTrackIndex;
  }

  public setSpeedMultiplier(mult: number) {
    this.speedMultiplier = Math.max(0.75, Math.min(2.0, mult));
  }

  // Independent channel scheduling times
  private leadNextTime = 0;
  private bassNextTime = 0;
  private drumNextTime = 0;

  public startBgm() {
    this.ensureContext();
    if (!this.ctx) return;
    if (this.isBgmPlaying) return;

    this.isBgmPlaying = true;
    this.leadStep = 0;
    this.bassStep = 0;
    this.drumStep = 0;
    const startOffset = this.ctx.currentTime + 0.05;
    this.leadNextTime = startOffset;
    this.bassNextTime = startOffset;
    this.drumNextTime = startOffset;

    this.scheduleNextTicks();
  }

  public stopBgm() {
    this.isBgmPlaying = false;
    if (this.timerId !== null) {
      window.clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public pauseBgm() {
    this.stopBgm();
  }

  public resumeBgm() {
    if (!this.isBgmPlaying) {
      this.startBgm();
    }
  }

  private scheduleNextTicks() {
    if (!this.isBgmPlaying || !this.ctx) return;

    const track = this.getCurrentTrack();
    const baseSecondsPer16th = 60 / track.tempo / 4;
    const secondsPer16th = baseSecondsPer16th / this.speedMultiplier;
    const lookAhead = 0.25; // seconds to schedule ahead
    const horizon = this.ctx.currentTime + lookAhead;

    // 1. Schedule Lead
    while (this.leadNextTime < horizon) {
      const [leadNote, leadDur] = track.lead[this.leadStep % track.lead.length];
      const leadFreq = NOTES[leadNote] || 0;
      const noteTimeSec = leadDur * secondsPer16th;
      this.scheduleNote(leadFreq, this.leadNextTime, noteTimeSec, 'lead');
      this.leadNextTime += noteTimeSec;
      this.leadStep = (this.leadStep + 1) % track.lead.length;
    }

    // 2. Schedule Bass
    while (this.bassNextTime < horizon) {
      const [bassNote, bassDur] = track.bass[this.bassStep % track.bass.length];
      const bassFreq = NOTES[bassNote] || 0;
      const noteTimeSec = bassDur * secondsPer16th;
      this.scheduleNote(bassFreq, this.bassNextTime, noteTimeSec, 'bass');
      this.bassNextTime += noteTimeSec;
      this.bassStep = (this.bassStep + 1) % track.bass.length;
    }

    // 3. Schedule Drums
    if (track.drums) {
      while (this.drumNextTime < horizon) {
        this.scheduleDrums(this.drumNextTime, this.drumStep);
        this.drumNextTime += secondsPer16th;
        this.drumStep = (this.drumStep + 1) % 10000;
      }
    }

    this.timerId = window.setTimeout(() => this.scheduleNextTicks(), 35);
  }

  // --- Volume / Mute Controls ---
  public toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this._isMuted ? 0 : 1, this.ctx.currentTime);
    }
    return this._isMuted;
  }

  public isMuted(): boolean {
    return this._isMuted;
  }

  public toggleBgmMute(): boolean {
    this._bgmMuted = !this._bgmMuted;
    if (this.bgmGain && this.ctx) {
      this.bgmGain.gain.setValueAtTime(this._bgmMuted ? 0 : this._bgmVolume, this.ctx.currentTime);
    }
    return this._bgmMuted;
  }

  public isBgmMuted(): boolean {
    return this._bgmMuted;
  }

  public setBgmVolume(val: number) {
    this._bgmVolume = Math.max(0, Math.min(1, val));
    if (this.bgmGain && this.ctx && !this._bgmMuted) {
      this.bgmGain.gain.setValueAtTime(this._bgmVolume, this.ctx.currentTime);
    }
  }

  public getBgmVolume(): number {
    return this._bgmVolume;
  }

  public toggleSfxMute(): boolean {
    this._sfxMuted = !this._sfxMuted;
    if (this.sfxGain && this.ctx) {
      this.sfxGain.gain.setValueAtTime(this._sfxMuted ? 0 : this._sfxVolume, this.ctx.currentTime);
    }
    return this._sfxMuted;
  }

  public isSfxMuted(): boolean {
    return this._sfxMuted;
  }

  public setSfxVolume(val: number) {
    this._sfxVolume = Math.max(0, Math.min(1, val));
    if (this.sfxGain && this.ctx && !this._sfxMuted) {
      this.sfxGain.gain.setValueAtTime(this._sfxVolume, this.ctx.currentTime);
    }
  }

  public getSfxVolume(): number {
    return this._sfxVolume;
  }

  public isBgmRunning(): boolean {
    return this.isBgmPlaying;
  }
}

export const soundEngine = new AudioEngine();
