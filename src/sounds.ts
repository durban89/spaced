let ctx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', ramp?: number) {
  const c = getCtx()
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, c.currentTime)
  if (ramp) osc.frequency.linearRampToValueAtTime(ramp, c.currentTime + duration)
  gain.gain.setValueAtTime(0.3, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + duration)
  osc.connect(gain).connect(c.destination)
  osc.start()
  osc.stop(c.currentTime + duration)
}

export function playForgotten() {
  playTone(300, 0.2, 'triangle', 150)
}

export function playFuzzy() {
  playTone(440, 0.15, 'sine')
}

export function playRemembered() {
  playTone(523, 0.12, 'sine')
  setTimeout(() => playTone(659, 0.12, 'sine'), 80)
}
