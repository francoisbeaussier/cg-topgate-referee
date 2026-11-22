const BPM = 112
const STEP = 60 / BPM / 4
const ROOTS = [57, 53, 48, 55]
const ARP = [0, 7, 12, 7, 3, 7, 12, 15, 0, 7, 12, 7, 3, 7, 10, 12]

const hz = m => 440 * Math.pow(2, (m - 69) / 12)

export class Sound {
  constructor () {
    this.mode = 0
    this.ctx = null
    this.lastDraw = 0
    this.playing = false
  }

  setMode (mode) {
    this.mode = mode
    if (mode > 0) this.start()
    if (this.ctx) {
      if (mode > 0 && this.ctx.state === 'suspended') this.ctx.resume()
      this.master.gain.setTargetAtTime(mode > 0 ? 0.8 : 0, this.ctx.currentTime, 0.05)
      this.musicBus.gain.setTargetAtTime(mode >= 2 ? 0.48 : 0, this.ctx.currentTime, 0.1)
      if (window.__mix === 'music') { this.sfx.gain.cancelScheduledValues(0); this.sfx.gain.value = 0 }
      if (window.__mix === 'fx') { this.musicBus.gain.cancelScheduledValues(0); this.musicBus.gain.value = 0 }
    }
  }

  start () {
    if (this.ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    if (!AC) return
    const ctx = new AC()
    this.ctx = ctx
    this.master = ctx.createGain()
    this.master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    this.master.connect(comp)
    comp.connect(ctx.destination)
    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.9
    this.sfx.connect(this.master)
    this.musicBus = ctx.createGain()
    this.musicBus.gain.value = 0
    this.musicBus.connect(this.master)
    const len = ctx.sampleRate
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1

    this.motorGain = ctx.createGain()
    this.motorGain.gain.value = 0
    this.motorFilter = ctx.createBiquadFilter()
    this.motorFilter.type = 'lowpass'
    this.motorFilter.frequency.value = 900
    this.motorFilter.Q.value = 4
    this.motorA = ctx.createOscillator()
    this.motorA.type = 'sawtooth'
    this.motorB = ctx.createOscillator()
    this.motorB.type = 'square'
    this.motorB.detune.value = 14
    const bGain = ctx.createGain()
    bGain.gain.value = 0.4
    this.motorA.connect(this.motorFilter)
    this.motorB.connect(bGain)
    bGain.connect(this.motorFilter)
    this.motorFilter.connect(this.motorGain)
    this.motorGain.connect(this.sfx)
    this.motorA.start()
    this.motorB.start()

    this.step = 0
    this.nextStep = ctx.currentTime + 0.1
    this.timer = setInterval(() => this.tick(), 40)
    const wake = () => { if (this.ctx && this.mode > 0 && this.ctx.state === 'suspended') this.ctx.resume() }
    window.addEventListener('pointerdown', wake, true)
    window.addEventListener('keydown', wake, true)
  }

  tick () {
    const ctx = this.ctx
    if (!ctx) return
    const now = ctx.currentTime
    const alive = this.mode > 0 && performance.now() - this.lastDraw < 250
    if (alive !== this.playing) {
      this.playing = alive
      if (!alive) {
        this.motorGain.gain.setTargetAtTime(0, now, 0.05)
      }
    }
    if (!alive || this.mode < 2) {
      this.nextStep = Math.max(this.nextStep, now + 0.05)
      return
    }
    while (this.nextStep < now + 0.2) {
      this.music(this.step, this.nextStep)
      this.step++
      this.nextStep += STEP
    }
  }

  music (k, t) {
    const bar = Math.floor(k / 16) % 4
    const s = k % 16
    const root = ROOTS[bar]
    this.tone(hz(root - 12 + ARP[s]), t, STEP * 0.9, 'sawtooth', 0.22, this.musicBus, 700 + 500 * Math.sin(k / 23))
    if (s % 8 === 0) this.tone(hz(root - 24), t, STEP * 7, 'triangle', 0.3, this.musicBus, 400)
    if (s % 4 === 0) this.kick(t)
    if (s % 8 === 4) this.hit(t, 1600, 0.18, 0.12, this.musicBus)
    if (s % 2 === 1) this.hit(t, 8000, 0.04, 0.05, this.musicBus)
    if (bar === 3 && s >= 12) this.hit(t, 1200, 0.1, 0.06, this.musicBus)
  }

  tone (f, t, dur, type, vol, bus, cutoff) {
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f, t)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.005)
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur)
    let node = o
    if (cutoff) {
      const fl = ctx.createBiquadFilter()
      fl.type = 'lowpass'
      fl.frequency.value = cutoff
      o.connect(fl)
      node = fl
    }
    node.connect(g)
    g.connect(bus || this.sfx)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  kick (t) {
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.55, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18)
    o.connect(g)
    g.connect(this.musicBus)
    o.start(t)
    o.stop(t + 0.2)
  }

  hit (t, freq, dur, vol, bus, type) {
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type || (freq > 5000 ? 'highpass' : 'bandpass')
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur)
    src.connect(f)
    f.connect(g)
    g.connect(bus || this.sfx)
    src.start(t, Math.random() * 0.5)
    src.stop(t + dur + 0.05)
  }

  update (st) {
    if (!this.ctx || this.mode === 0) return
    this.lastDraw = performance.now()
    const now = this.ctx.currentTime
    const on = st.flying && !st.motorsOff && this.mode === 3
    const surge = this.boostAt ? Math.max(0, 1 - (now - this.boostAt) / 0.35) : 0
    const f = 90 * Math.pow(2, st.throttle / 100 * 2.2) * (1 + 0.4 * surge)
    this.motorA.frequency.setTargetAtTime(f, now, 0.06)
    this.motorB.frequency.setTargetAtTime(f * 2.01, now, 0.06)
    this.motorFilter.frequency.setTargetAtTime(500 + st.throttle * 18, now, 0.08)
    this.motorGain.gain.setTargetAtTime(on ? (0.016 + st.throttle * 0.000352) * (1 + 0.5 * surge) : 0, now, 0.08)
  }

  events (ev) {
    if (!this.ctx || this.mode === 0 || this.ctx.state !== 'running') return
    const t = this.ctx.currentTime + 0.01
    if (ev.gate) {
      const base = 76 + (ev.gateIndex % 5) * 2
      this.tone(hz(base), t, 0.25, 'sine', 0.3)
      this.tone(hz(base + 7), t + 0.07, 0.3, 'sine', 0.25)
    }
    if (ev.lap) [72, 76, 79, 84].forEach((m, k) => this.tone(hz(m), t + k * 0.09, 0.35, 'triangle', 0.25))
    if (ev.finish) [72, 76, 79, 84, 88, 91].forEach((m, k) => this.tone(hz(m), t + k * 0.11, 0.6, 'square', 0.12, null, 3000))
    if (ev.boost) {
      this.boostAt = this.ctx.currentTime
      const ctx = this.ctx
      const src = ctx.createBufferSource()
      src.buffer = this.noise
      const fl = ctx.createBiquadFilter()
      fl.type = 'bandpass'
      fl.Q.value = 2
      fl.frequency.setValueAtTime(300, t)
      fl.frequency.exponentialRampToValueAtTime(4000, t + 0.5)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(0.5, t + 0.08)
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.7)
      src.connect(fl)
      fl.connect(g)
      g.connect(this.sfx)
      src.start(t)
      src.stop(t + 0.75)
    }
    if (ev.charge) [88, 93, 100].forEach((m, k) => this.tone(hz(m), t + k * 0.05, 0.15, 'sine', 0.18))
    if (ev.item) this.tone(hz(64), t, 0.3, 'triangle', 0.25)
    if (ev.bump) this.hit(t, 2500, 0.06, 0.25)
    if (ev.pylon) {
      this.tone(70, t, 0.25, 'sine', 0.5)
      this.hit(t, 400, 0.15, 0.3)
    }
    if (ev.crash) {
      this.hit(t, 700, 0.5, 0.7, null, 'lowpass')
      this.tone(55, t, 0.4, 'sine', 0.6)
      for (let k = 0; k < 6; k++) this.hit(t + 0.05 + k * 0.06 + Math.random() * 0.03, 5000 + Math.random() * 3000, 0.03, 0.15)
    }
    if (ev.destroyed) {
      const ctx = this.ctx
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(400, t)
      o.frequency.exponentialRampToValueAtTime(50, t + 0.8)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.2, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.9)
      o.connect(g)
      g.connect(this.sfx)
      o.start(t)
      o.stop(t + 1)
      this.hit(t, 600, 0.6, 0.6, null, 'lowpass')
    }
  }
}
