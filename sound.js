// =============================================================
// sound.js — all sounds, made in code with the Web Audio API
// (no sound files). Little effects (coins, pops, chimes) and calm
// background music that plays forever: soft chords, a slow bass
// and a dreamy, random melody with an echo.
//
// Browsers only allow sound after the player touches the screen or
// presses a key, so nothing plays before that. Volumes and the music
// speed live in CONFIG.sound; on/off switches in state.settings.
// =============================================================

var audio = {
  ctx: null,          // the AudioContext (made on the first touch)
  effects: null,      // volume knob for sound effects
  music: null,        // volume knob for the music
  echo: null,         // where melody notes go for their soft echo
  lastCoin: 0,        // when the last coin sound played (so many coins don't get noisy)
  nextBeat: 0,        // when (audio clock) the next music beat should play
  beat: 0,            // which beat of the song we're on
  timer: null,        // the music scheduler
};

// Musical note -> frequency. n = semitones away from A4 (440 Hz).
function noteFreq(n) {
  return 440 * Math.pow(2, n / 12);
}

// Start the audio engine (call from a touch or key press).
function startAudio() {
  if (audio.ctx) {
    // wake it up if it was paused ('suspended'), or stopped by the phone
    // itself, e.g. after a call or locking an iPhone ('interrupted')
    if (audio.ctx.state !== 'running') audio.ctx.resume();
    return;
  }
  var AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return; // a very old browser: just no sound
  try {
    audio.ctx = new AudioCtx();
  } catch (e) {
    return;
  }
  var c = audio.ctx;
  // a gentle compressor at the end keeps everything soft and even
  var comp = c.createDynamicsCompressor();
  comp.connect(c.destination);

  audio.effects = c.createGain();
  audio.effects.connect(comp);
  audio.music = c.createGain();
  audio.music.connect(comp);

  // the echo: a delay that feeds back into itself, slightly muffled
  var delay = c.createDelay(2);
  delay.delayTime.value = 60 / CONFIG.sound.musicBpm * 0.75;
  var feedback = c.createGain();
  feedback.gain.value = 0.35;
  var muffle = c.createBiquadFilter();
  muffle.type = 'lowpass';
  muffle.frequency.value = 1800;
  delay.connect(muffle);
  muffle.connect(feedback);
  feedback.connect(delay);
  muffle.connect(audio.music);
  audio.echo = delay;

  applySoundSettings();
  audio.nextBeat = c.currentTime + 0.3;
  audio.timer = setInterval(scheduleMusic, 120);
}

// Turn effects / music up or down to match the settings (gently, no clicks).
function applySoundSettings() {
  if (!audio.ctx) return;
  var t = audio.ctx.currentTime;
  var s = state.settings;
  audio.effects.gain.setTargetAtTime(s.sound ? CONFIG.sound.effectsVolume : 0, t, 0.05);
  audio.music.gain.setTargetAtTime(s.music ? CONFIG.sound.musicVolume : 0, t, 0.6);
}

// Pause all sound while the game is hidden (another app, locked phone).
function pauseAudio(hidden) {
  if (!audio.ctx) return;
  if (hidden) audio.ctx.suspend();
  else audio.ctx.resume();
}

// Play one note: a wave of `type` at `freq` Hz, starting at `when` (audio
// clock), fading in over `attack` and out over `release` seconds.
// `out` is where it goes (effects, music or the echo).
function playNote(freq, when, attack, hold, release, volume, type, out, filterHz) {
  var c = audio.ctx;
  var osc = c.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  var env = c.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(volume, when + attack);
  env.gain.setValueAtTime(volume, when + attack + hold);
  env.gain.exponentialRampToValueAtTime(0.0001, when + attack + hold + release);
  var last = env;
  if (filterHz) {
    var f = c.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterHz;
    env.connect(f);
    last = f;
  }
  osc.connect(env);
  last.connect(out);
  osc.start(when);
  osc.stop(when + attack + hold + release + 0.05);
}

// ---------- Sound effects ----------

// Can we play an effect right now?
function effectsOn() {
  return audio.ctx && state.settings.sound && audio.ctx.state === 'running';
}

// A coin clink: two quick bright notes (three for VIPs).
function playCoin(vip) {
  if (!effectsOn()) return;
  var c = audio.ctx, t = c.currentTime;
  if (t - audio.lastCoin < 0.07) return; // many payments at once: one clink is enough
  audio.lastCoin = t;
  var wobble = (Math.random() - 0.5) * 0.6; // tiny pitch change each time
  playNote(noteFreq(15 + wobble), t, 0.003, 0.02, 0.12, 0.25, 'triangle', audio.effects);
  playNote(noteFreq(22 + wobble), t + 0.06, 0.003, 0.02, 0.2, 0.22, 'triangle', audio.effects);
  if (vip) playNote(noteFreq(27 + wobble), t + 0.12, 0.003, 0.03, 0.3, 0.2, 'triangle', audio.effects);
}

// A soft "pop" when something is built.
function playBuild() {
  if (!effectsOn()) return;
  var c = audio.ctx, t = c.currentTime;
  var osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(260, t);
  osc.frequency.exponentialRampToValueAtTime(620, t + 0.12);
  var env = c.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.exponentialRampToValueAtTime(0.4, t + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  osc.connect(env); env.connect(audio.effects);
  osc.start(t); osc.stop(t + 0.3);
  playNote(noteFreq(19), t + 0.1, 0.005, 0.03, 0.3, 0.12, 'triangle', audio.effects);
}

// A little rising sparkle for upgrades.
function playUpgrade() {
  if (!effectsOn()) return;
  var t = audio.ctx.currentTime;
  [15, 19, 22, 27].forEach(function (n, i) {
    playNote(noteFreq(n), t + i * 0.06, 0.004, 0.02, 0.25, 0.16, 'triangle', audio.effects);
  });
}

// "Ding-dong" when a helper is hired.
function playHire() {
  if (!effectsOn()) return;
  var t = audio.ctx.currentTime;
  playNote(noteFreq(10), t, 0.005, 0.1, 0.6, 0.25, 'sine', audio.effects);
  playNote(noteFreq(6), t + 0.25, 0.005, 0.1, 0.8, 0.25, 'sine', audio.effects);
}

// A happy chime for a new area or a new menu item.
function playChime(big) {
  if (!effectsOn()) return;
  var t = audio.ctx.currentTime;
  var notes = big ? [8, 12, 15, 20, 24] : [12, 15, 19];
  notes.forEach(function (n, i) {
    playNote(noteFreq(n), t + i * 0.09, 0.005, 0.05, big ? 1.2 : 0.6, 0.18, 'sine', audio.effects);
    playNote(noteFreq(n + 12), t + i * 0.09, 0.005, 0.02, 0.4, 0.05, 'triangle', audio.effects);
  });
}

// A tiny soft click when the barista picks something up.
function playPickup() {
  if (!effectsOn()) return;
  var t = audio.ctx.currentTime;
  playNote(noteFreq(7), t, 0.003, 0.01, 0.08, 0.15, 'sine', audio.effects);
}

// ---------- Music ----------
// A slow loop of four chords (Fmaj7, Am7, Dm7, Bbmaj7: warm and calm).
// Every beat may get a soft melody note from the F major pentatonic scale,
// so the tune never repeats exactly but always sounds gentle.

// Each chord: the bass note first, then the chord, in semitones from A4
// (so -4 = F4, 3 = C5).
var CHORDS = [
  [-16, -4, 0, 3, 7],   // Fmaj7:  F3 bass, then F A C E
  [-12, 0, 3, 7, 10],   // Am7:    A3 bass, then A C E G
  [-19, -7, -4, 0, 3],  // Dm7:    D3 bass, then D F A C
  [-23, -11, -7, -4, 0],// Bbmaj7: Bb2 bass, then Bb D F A
];
// F major pentatonic, one octave up (F G A C D F G A)
var MELODY = [8, 10, 12, 15, 17, 20, 22, 24];

// Schedule the music a little ahead of time (called every 120 ms).
function scheduleMusic() {
  var c = audio.ctx;
  if (!c || c.state !== 'running') return;
  if (!state.settings.music) { audio.nextBeat = c.currentTime + 0.3; return; }
  var beatLen = 60 / CONFIG.sound.musicBpm;
  // fell behind (the phone was busy)? skip the missed beats instead of
  // playing them all at once
  if (audio.nextBeat < c.currentTime) audio.nextBeat = c.currentTime + 0.05;
  while (audio.nextBeat < c.currentTime + 0.6) {
    playMusicBeat(audio.beat, audio.nextBeat, beatLen);
    audio.nextBeat += beatLen;
    audio.beat += 1;
  }
}

// Play everything that belongs on one beat of the song.
function playMusicBeat(beat, t, beatLen) {
  var bar = Math.floor(beat / 4), inBar = beat % 4;
  var chord = CHORDS[bar % CHORDS.length];
  if (inBar === 0) {
    // a new chord: soft pad notes that swell in and last the whole bar
    for (var i = 1; i < chord.length; i++) {
      playNote(noteFreq(chord[i]), t, 0.9, beatLen * 3, 1.6, 0.05, 'triangle', audio.music, 900);
    }
    // the bass note
    playNote(noteFreq(chord[0]), t, 0.05, beatLen * 1.5, 1.2, 0.16, 'sine', audio.music);
  }
  if (inBar === 2) playNote(noteFreq(chord[0] + 12), t, 0.05, beatLen * 0.5, 0.8, 0.07, 'sine', audio.music);
  // a melody note now and then, sometimes on the off-beat
  if (Math.random() < 0.45) {
    var n = MELODY[Math.floor(Math.random() * MELODY.length)];
    var when = t + (Math.random() < 0.3 ? beatLen / 2 : 0);
    playNote(noteFreq(n), when, 0.01, 0.05, 1.1, 0.07, 'sine', audio.music);
    playNote(noteFreq(n), when, 0.01, 0.05, 1.1, 0.04, 'sine', audio.echo);
  }
}
