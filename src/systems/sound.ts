// Sons « bip-boup » synthétisés en WebAudio (rien à charger), repris du prototype.
// Le bouton SON du HUD coupe tout ; le choix est mémorisé dans localStorage.

const KEY = 'paulochon.muted';

export type SfxKind =
  | 'jump' | 'stomp' | 'pick' | 'swing' | 'crack' | 'clong' | 'whistle' | 'death'
  | 'slip' | 'flag' | 'pouf' | 'sneeze' | 'win' | 'pop'
  | 'boing' | 'buzz' | 'splash' | 'slurp' | 'chomp' | 'clang' | 'bong' | 'sizzle' | 'cling' | 'alert' | 'boom' | 'whoosh' | 'gate';

let ctx: AudioContext | null = null;
let muted = loadMuted();

function loadMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(f0: number, f1: number, dur: number, type: OscillatorType = 'square', vol = 0.1, delay = 0): void {
  const a = audio();
  if (!a) return;
  try {
    const t0 = a.currentTime + delay;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g);
    g.connect(a.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.03);
  } catch {
    /* pas de son : tant pis */
  }
}

function noise(dur: number, vol = 0.2, delay = 0): void {
  const a = audio();
  if (!a) return;
  try {
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource();
    const g = a.createGain();
    src.buffer = buf;
    g.gain.value = vol;
    src.connect(g);
    g.connect(a.destination);
    src.start(a.currentTime + delay);
  } catch {
    /* idem */
  }
}

export const sound = {
  get muted(): boolean {
    return muted;
  },

  toggle(): boolean {
    muted = !muted;
    try {
      localStorage.setItem(KEY, muted ? '1' : '0');
    } catch {
      /* ignore */
    }
    return muted;
  },

  /** À appeler depuis un geste de l'utilisateur : Safari n'autorise le son qu'après un toucher. */
  unlock(): void {
    audio();
  },

  /** `arg` : durée en secondes pour 'whistle' (le sifflement de l'enclume dure autant que l'alerte). */
  play(kind: SfxKind, arg = 1): void {
    if (muted) return;
    switch (kind) {
      case 'jump': tone(320, 640, 0.14, 'square', 0.07); break;
      case 'stomp': tone(220, 70, 0.18, 'square', 0.12); noise(0.08, 0.1); break;
      case 'pick': tone(660, 660, 0.08, 'triangle', 0.15); tone(990, 990, 0.14, 'triangle', 0.15, 0.08); break;
      case 'swing': noise(0.1, 0.08); tone(500, 200, 0.1, 'sawtooth', 0.04); break;
      case 'crack': noise(0.22, 0.25); tone(140, 60, 0.2, 'square', 0.1); break;
      case 'clong': tone(180, 170, 0.6, 'triangle', 0.25); tone(540, 520, 0.5, 'sine', 0.12); noise(0.1, 0.2); break;
      case 'whistle': tone(1600, 500, arg, 'sine', 0.05); break;
      case 'death':
        tone(392, 370, 0.25, 'triangle', 0.16, 0.15);
        tone(349, 330, 0.25, 'triangle', 0.16, 0.42);
        tone(311, 140, 0.8, 'triangle', 0.16, 0.7);
        break;
      case 'slip': tone(300, 1200, 0.35, 'sine', 0.12); break;
      case 'flag': tone(523, 523, 0.1, 'square', 0.07); tone(784, 784, 0.15, 'square', 0.07, 0.1); break;
      case 'pouf': noise(0.15, 0.12); break;
      case 'sneeze': noise(0.45, 0.3); tone(600, 200, 0.3, 'sawtooth', 0.08); break;
      case 'win': [523, 659, 784, 1046].forEach((f, i) => tone(f, f, 0.2, 'square', 0.08, i * 0.13)); break;
      case 'pop': tone(500, 900, 0.08, 'triangle', 0.1); break;
      case 'boing': tone(180, 900, 0.3, 'sine', 0.2); tone(900, 300, 0.2, 'sine', 0.1, 0.3); break;
      case 'buzz': tone(220, 240, 0.5, 'sawtooth', 0.05); tone(225, 260, 0.5, 'sawtooth', 0.04, 0.02); break;
      case 'splash': noise(0.35, 0.25); tone(500, 120, 0.3, 'sine', 0.1); break;
      case 'slurp': tone(900, 200, 0.25, 'sawtooth', 0.09); noise(0.12, 0.15, 0.1); break;
      case 'chomp': tone(200, 80, 0.12, 'square', 0.16); tone(160, 60, 0.14, 'square', 0.16, 0.14); noise(0.1, 0.2); break;
      case 'clang': tone(300, 280, 0.45, 'triangle', 0.22); tone(900, 860, 0.35, 'square', 0.06); noise(0.06, 0.2); break;
      case 'bong': tone(120, 110, 0.5, 'sine', 0.3); tone(240, 230, 0.4, 'triangle', 0.1); break;
      case 'sizzle': noise(0.5, 0.2); tone(1200, 300, 0.4, 'sawtooth', 0.04); break;
      case 'cling': tone(1800, 1700, 0.25, 'sine', 0.1); tone(2400, 2300, 0.2, 'sine', 0.06, 0.05); break;
      case 'alert': tone(700, 700, 0.07, 'square', 0.06); tone(900, 900, 0.09, 'square', 0.06, 0.09); break;
      case 'boom': tone(90, 40, 0.5, 'sine', 0.35); noise(0.3, 0.3); break;
      case 'whoosh': noise(0.18, 0.1); tone(400, 800, 0.15, 'sine', 0.04); break;
      case 'gate': tone(160, 100, 0.4, 'sawtooth', 0.12); noise(0.25, 0.15, 0.25); break;
    }
  },
};
