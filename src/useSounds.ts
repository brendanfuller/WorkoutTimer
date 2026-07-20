// All cues are synthesized with the Web Audio API so no audio assets are needed.
let ctx: AudioContext | null = null

// Must be called from a user gesture (e.g. the Start button) so the browser
// allows audio playback.
export function unlockAudio() {
  ctx ??= new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine') {
  if (!ctx) return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = type
  osc.frequency.value = freq
  const t0 = ctx.currentTime + at
  gain.gain.setValueAtTime(0, t0)
  gain.gain.linearRampToValueAtTime(0.25, t0 + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

// Work is over, rest begins: two descending, mellow beeps ("wind down").
export function playWorkEnd() {
  tone(880, 0, 0.25)
  tone(660, 0.28, 0.35)
}

// Rest is over, next round begins: three rising, urgent beeps ("go!").
export function playRestEnd() {
  tone(523, 0, 0.15, 'square')
  tone(659, 0.18, 0.15, 'square')
  tone(880, 0.36, 0.3, 'square')
}

// Whole session finished: a little victory arpeggio.
export function playDone() {
  tone(523, 0, 0.2)
  tone(659, 0.2, 0.2)
  tone(784, 0.4, 0.2)
  tone(1047, 0.6, 0.5)
}
