/* global PIXI */
import { Sound } from './Sound.js'
const WIDTH = 1920
const HEIGHT = 1080

export const fpvOptions = { view: -2, chase: 0, smooth: 1, sound: 0, units: 0 }
const SPEED_UNIT = [['km/h', 0.1], ['mph', 0.1 / 1.609344], ['u/turn', 1]]

const SKY = 0x0b1633
const GROUND = 0x121a12
const FLOOR = 0x1d2b1b
const GRID = 0x3d6a3d
const FOV = 100 * Math.PI / 180
const NEAR = 30

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k]
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const norm = a => { const l = Math.sqrt(dot(a, a)); return l === 0 ? a : mul(a, 1 / l) }
const lerp = (a, b, t) => a + (b - a) * t
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
const catmull = (p0, p1, p2, p3, t) => 0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t)
const WEIGHTS = [1, 2, 3, 2, 1]
const toColor = c => typeof c === 'string' ? parseInt(c.replace('#', ''), 16) : c

const ZOOM_FRAG = `
precision highp float;
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 inputSize;
uniform vec4 inputClamp;
uniform vec4 outputFrame;
uniform vec2 uCenter;
uniform float uStrength;
uniform float uInner;
void main(void) {
  vec2 pos = vTextureCoord * inputSize.xy;
  vec2 c = uCenter - outputFrame.xy;
  vec2 dir = pos - c;
  float d = length(dir);
  float k = clamp((d - uInner) / max(1.0, uInner), 0.0, 1.0) * uStrength;
  vec4 acc = vec4(0.0);
  for (int i = 0; i < 12; i++) {
    float t = float(i) / 11.0;
    vec2 p = c + dir * (1.0 - k * t * 0.12);
    acc += texture2D(uSampler, clamp(p * inputSize.zw, inputClamp.xy, inputClamp.zw));
  }
  gl_FragColor = acc / 12.0;
}`

const setT = (o, text) => {
  if (o._t !== text) {
    o.text = text
    o._t = text
  }
}
const setS = (o, key, value) => {
  const sig = Array.isArray(value) ? value.join() : value
  if (!o._s) o._s = {}
  if (o._s[key] !== sig) {
    o.style[key] = value
    o._s[key] = sig
  }
}

function layout (n) {
  if (n <= 2) return [[0, 0, WIDTH / 2, HEIGHT, 0], [WIDTH / 2, 0, WIDTH / 2, HEIGHT, 1]].slice(0, n)
  const w = WIDTH / 2
  const h = HEIGHT / 2
  return [[0, 0, w, h, 0], [w, 0, w, h, 1], [0, h, w, h, 2], [w, h, w, h, 3]].slice(0, n)
}

function clipSeg (a, b) {
  if (a[2] < NEAR && b[2] < NEAR) return null
  if (a[2] >= NEAR && b[2] >= NEAR) return [a, b]
  const t = (NEAR - a[2]) / (b[2] - a[2])
  const m = lerp3(a, b, t)
  return a[2] < NEAR ? [m, b] : [a, m]
}

function clipPoly (pts) {
  const out = []
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i]
    const b = pts[(i + 1) % pts.length]
    const ain = a[2] >= NEAR
    const bin = b[2] >= NEAR
    if (ain) out.push(a)
    if (ain !== bin) out.push(lerp3(a, b, (NEAR - a[2]) / (b[2] - a[2])))
  }
  return out
}

export class FpvModule {
  constructor () {
    FpvModule.instance = this
    this.views = []
  }

  static get moduleName () {
    return 'fpv'
  }

  static refresh () {
    if (FpvModule.instance) FpvModule.instance.draw()
  }

  static setSound (mode) {
    if (!FpvModule.sound) FpvModule.sound = new Sound()
    FpvModule.sound.setMode(mode)
  }

  soundStep (h) {
    const snd = FpvModule.sound
    if (!snd || snd.mode === 0 || this.g.intro || !this.tr || !this.tr.length) return
    const ti = this.cur && this.cur.ti != null ? this.cur.ti : 0
    const raw = this.row(h, ti)
    const prev = this.row(h, ti - 1)
    snd.update({ flying: raw[15] === 1, motorsOff: raw[14] > 0 || raw[12] <= 0, throttle: raw[16], speed: raw[9], draft: raw[29] === 1 })
    if (this.soundTi === ti && this.soundH === h) return
    const forward = this.soundTi != null && ti === this.soundTi + 1 && this.soundH === h
    this.soundTi = ti
    this.soundH = h
    if (!forward) return
    const ev = {
      gate: raw[10] !== prev[10] && raw[15] !== 0,
      gateIndex: prev[10],
      lap: raw[11] > prev[11] && raw[15] !== 2,
      finish: raw[15] === 2 && prev[15] !== 2,
      boost: raw[26] === 1,
      charge: raw[28] === 1,
      item: raw[25] !== 0 && prev[25] === 0,
      destroyed: raw[15] === 0 && prev[15] !== 0
    }
    for (const e of (this.cur && this.cur.e) || []) {
      if (e[0] !== h && e[1] !== h) continue
      if (e[1] < 0) ev.pylon = true
      if (e[10] === 1) ev.crash = true
      else if (e[1] >= 0) ev.bump = true
    }
    snd.events(ev)
  }

  handleGlobalData (players, data) {
    if (!data || !data.gates) return
    this.players = players
    this.g = data
    this.last = data.d0
    this.trail = []
    const R = data.r[0]
    this.rings = data.gates.map(gt => {
      const c = [gt[0], gt[1], gt[2]]
      const n = [gt[3] / 1000, gt[4] / 1000, gt[5] / 1000]
      const side = Math.hypot(n[0], n[1]) < 1e-6 ? [1, 0, 0] : norm([-n[1], n[0], 0])
      const up = norm(cross(n, side))
      const pts = []
      for (let k = 0; k < 32; k++) {
        const a = 2 * Math.PI * k / 32
        pts.push(add(c, add(mul(side, R * Math.cos(a)), mul(up, R * Math.sin(a)))))
      }
      const mesh = []
      const hs = 95, hw = hs * Math.sqrt(3), lim = R - 40
      const at = (u, v) => add(c, add(mul(side, u), mul(up, v)))
      for (let row = -12; row <= 12; row++) {
        for (let col = -12; col <= 12; col++) {
          const hu = col * hw + (row % 2 ? hw / 2 : 0), hv = row * hs * 1.5
          if (Math.hypot(hu, hv) > lim + hs) continue
          const vx = []
          for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + k * Math.PI / 3; vx.push([hu + hs * Math.cos(a), hv + hs * Math.sin(a)]) }
          for (let k = 0; k < 3; k++) {
            const A = vx[k], B = vx[k + 1]
            if (Math.hypot(A[0], A[1]) < lim && Math.hypot(B[0], B[1]) < lim) mesh.push([at(A[0], A[1]), at(B[0], B[1])])
          }
        }
      }
      return { c, n, side, pts, mesh }
    })
    const [AX, AY, AZ] = data.arena
    const hi = AZ - 700
    this.tvCams = [
      [500, 500, hi], [AX / 2, 500, hi], [AX - 500, 500, hi], [AX - 500, AY / 2, hi],
      [AX - 500, AY - 500, hi], [AX / 2, AY - 500, hi], [500, AY - 500, hi], [500, AY / 2, hi],
      [500, 500, 900], [AX - 500, 500, 900], [AX - 500, AY - 500, 900], [500, AY - 500, 900]
    ]
    this.tvMemo = null
  }

  plan (ti, key) {
    const T = this.tr
    if (!T || !T.length || !this.tvCams) return { cam: 0, target: typeof key === 'number' ? key : 0, sw: -99 }
    if (!this.planMemo || this.planMemo.T !== T) this.planMemo = { T, plans: {} }
    if (!this.planMemo.plans[key]) this.planMemo.plans[key] = []
    const plan = this.planMemo.plans[key]
    const n = this.players.length
    const cost = (c, P, dir) => {
      const d = Math.hypot(c[0] - P[0], c[1] - P[1], c[2] - P[2])
      const toCam = norm(sub(c, P))
      return Math.abs(d - 4500) / 1500 + (d < 1500 ? 5 : 0) + (1 - dot(dir, toCam)) * 0.6
    }
    const last = Math.max(0, Math.min(ti, T.length - 1))
    for (let k = plan.length; k <= last; k++) {
      const prev = k > 0 ? plan[k - 1] : { cam: -1, target: -1, held: 0, tHeld: 0, sw: -99, fromCam: -1, fromTarget: -1 }
      let { cam, target, held, tHeld, sw, fromCam, fromTarget } = prev
      const rows = T[k]
      const oldCam = cam
      const oldTarget = target
      if (key === 'L') {
        let leader = 0
        for (let j = 0; j < n; j++) if (rows[j][21] === 1) { leader = j; break }
        if (target < 0 || (leader !== target && tHeld >= 20) || (rows[target][15] === 0 && rows[leader][15] !== 0)) {
          if (target !== leader) tHeld = 0
          target = leader
        }
      } else target = key
      const P = [rows[target][0], rows[target][1], rows[target][2]]
      const Q = k > 0 ? T[k - 1][target] : rows[target]
      let dir = norm([P[0] - Q[0], P[1] - Q[1], P[2] - Q[2]])
      if (dot(dir, dir) < 0.5) dir = [1, 0, 0]
      let best = 0
      let bestCost = Infinity
      this.tvCams.forEach((c, ci) => {
        const x = cost(c, P, dir)
        if (x < bestCost) { bestCost = x; best = ci }
      })
      if (cam < 0) { cam = best; held = 0 } else {
        const c = this.tvCams[cam]
        const d = Math.hypot(c[0] - P[0], c[1] - P[1], c[2] - P[2])
        const forced = (d < 1200 || d > 10000) && held >= 5
        if (best !== cam && (forced || (held >= 40 && bestCost < cost(c, P, dir) * 0.7 - 0.2))) { cam = best; held = 0 }
      }
      if (k > 0 && (cam !== oldCam || target !== oldTarget)) { sw = k; fromCam = oldCam; fromTarget = oldTarget }
      plan.push({ cam, target, held: held + 1, tHeld: tHeld + 1, sw, fromCam, fromTarget })
    }
    return plan[last]
  }

  camFor (j, mode, camIdx) {
    const s = this.drone(j)
    if (!s) return null
    const tilt = (s.raw[24] == null ? 30 : s.raw[24]) * Math.PI / 180
    let F = norm(add(mul(s.f, Math.cos(tilt)), mul(s.u, Math.sin(tilt))))
    let U = norm(sub(mul(s.u, Math.cos(tilt)), mul(s.f, Math.sin(tilt))))
    let eye = s.p
    if (mode === 1) {
      const tiL = this.cur && this.cur.ti != null ? this.cur.ti : 0
      const tl = this.progress == null ? 1 : this.progress
      const lagged = (k0, off) => {
        let acc = [0, 0, 0]
        for (let k = 0; k < 8; k++) {
          const r = this.row(j, k0 - k)
          acc = add(acc, mul([r[off] / 1000, r[off + 1] / 1000, r[off + 2] / 1000], Math.pow(0.55, k)))
        }
        return norm(acc)
      }
      const lf = norm(lerp3(lagged(tiL - 1, 3), lagged(tiL, 3), tl))
      const lu = norm(lerp3(lagged(tiL - 1, 6), lagged(tiL, 6), tl))
      F = norm(add(mul(lf, Math.cos(tilt)), mul(lu, Math.sin(tilt))))
      U = norm(sub(mul(lu, Math.cos(tilt)), mul(lf, Math.sin(tilt))))
      eye = add(sub(s.p, mul(F, 700)), mul(U, 230))
    }
    const t = this.progress == null ? 1 : this.progress
    const spd = s.prevRaw ? lerp(s.prevRaw[9], s.raw[9], t) : s.raw[9]
    let fov = FOV + Math.min(30, spd / 25) * Math.PI / 180
    if (mode === 2) {
      eye = this.tvCams[camIdx < 0 ? 0 : camIdx]
      F = norm(sub(s.p, eye))
      U = norm(sub([0, 0, 1], mul(F, F[2])))
      if (dot(U, U) < 0.5) U = [0, 1, 0]
      const dist = Math.hypot(s.p[0] - eye[0], s.p[1] - eye[1], s.p[2] - eye[2])
      fov = Math.max(25 * Math.PI / 180, Math.min(70 * Math.PI / 180, 2 * Math.atan(2200 / Math.max(1, dist))))
    }
    return { eye, F, U, fov }
  }

  handleFrameData (frameInfo, data) {
    if (data) this.last = data
    if (!this.last) return {}
    if (!this.trail) this.trail = []
    const pos = this.last.d
    const prevT = this.trail.length ? this.trail[this.trail.length - 1] : null
    if (!prevT || prevT.some((q, j) => q[0] !== pos[j][0] || q[1] !== pos[j][1] || q[2] !== pos[j][2])) this.trail.push(pos)
    const ti = this.trail.length - 1
    return { d: this.last.d, c: this.last.c, n: frameInfo.number, ti, e: (data && data.e) || [], T: this.trail, G: this.g, R: this.rings, P: this.players }
  }

  updateScene (previousData, currentData, progress) {
    this.prev = previousData
    this.cur = currentData
    this.progress = progress
    this.draw()
  }

  reinitScene (container) {
    if (this.root) {
      if (this.root.parent) this.root.parent.removeChild(this.root)
      this.root.destroy({ children: true })
    }
    this.root = new PIXI.Container()
    container.addChild(this.root)
    this.root.interactive = true
    this.root.hitArea = new PIXI.Rectangle(0, 0, WIDTH, HEIGHT)
    this.root.on('pointermove', e => {
      this.pointer = e.data.getLocalPosition(this.root)
      this.updateTip()
    })
    this.root.on('pointerout', () => {
      this.pointer = null
      this.updateTip()
    })
    this.views = []
    for (let i = 0; i < 4; i++) {
      const c = new PIXI.Container()
      const gfx = new PIXI.Graphics()
      const mask = new PIXI.Graphics()
      const hud = new PIXI.Text('', { fontFamily: 'sans-serif', fontSize: 22, fill: 0xffffff, fontWeight: 'bold', stroke: 0x000000, strokeThickness: 4, padding: 8 })
      const lapT = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 34, fontWeight: '900', fontStyle: 'italic', fill: ['#ffffff', '#4de1ff'], stroke: 0x000000, strokeThickness: 5, padding: 12 })
      const gateT = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 26, fontWeight: '900', fontStyle: 'italic', fill: ['#ffffff', '#5dff7a'], stroke: 0x000000, strokeThickness: 4, padding: 12 })
      const big = new PIXI.Text('', { fontFamily: 'sans-serif', fontSize: 64, fill: 0xff4040, fontWeight: 'bold' })
      const pos = new PIXI.Text('', { fontFamily: 'sans-serif', fontSize: 90, fill: 0xffffff, fontWeight: 'bold', fontStyle: 'italic', stroke: 0x000000, strokeThickness: 6, padding: 12 })
      const mode = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 40, fontWeight: '900', fontStyle: 'italic', fill: ['#ffffff', '#4de1ff'], stroke: 0x000000, strokeThickness: 5, letterSpacing: 4, padding: 12 })
      mode.anchor.set(0.5, 0)
      const pop = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 40, fontWeight: '900', fontStyle: 'italic', fill: ['#fff7c2', '#ffb300'], stroke: 0x000000, strokeThickness: 5, letterSpacing: 4, padding: 12 })
      pop.anchor.set(0.5, 0)
      const spdT = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 40, fontWeight: '900', fontStyle: 'italic', fill: ['#ffffff', '#cfd8ff'], stroke: 0x000000, strokeThickness: 5, padding: 12, align: 'right' })
      spdT.anchor.set(1, 0.5)
      const unitT = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 16, fontWeight: '900', fill: '#cfd8ff', stroke: 0x000000, strokeThickness: 4, padding: 8 })
      unitT.anchor.set(1, 0)
      const draftT = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 40, fontWeight: '900', fontStyle: 'italic', fill: ['#ffffff', '#b8c7ff'], stroke: 0x000000, strokeThickness: 5, letterSpacing: 4, padding: 12 })
      draftT.anchor.set(0.5, 0)
      pos.anchor.set(0, 1)
      big.anchor.set(0.5)
      const gray = new PIXI.filters.ColorMatrixFilter()
      gray.desaturate()
      const zoom = new PIXI.Filter(undefined, ZOOM_FRAG, { uCenter: [0, 0], uStrength: 0, uInner: 100 })
      const hudG = new PIXI.Graphics()
      const trimG = new PIXI.Graphics()
      const trimT = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 30, fontWeight: '900', fontStyle: 'italic', fill: ['#ffffff', '#8f84ff'], stroke: 0x000000, strokeThickness: 5, align: 'center', lineHeight: 40, padding: 12 })
      trimT.anchor.set(0.5)
      const mapT = []
      for (let k = 0; k < 4; k++) {
        const tx = new PIXI.Text('', { fontFamily: 'Arial Black, Impact, sans-serif', fontSize: 12, fontWeight: '900', fill: 0xffffff, stroke: 0x000000, strokeThickness: 3, padding: 4 })
        mapT.push(tx)
      }
      c.addChild(gfx, hudG, hud, lapT, gateT, big, pos, mode, pop, draftT, spdT, unitT, trimG, trimT, ...mapT, mask)
      c.mask = mask
      this.root.addChild(c)
      this.views.push({ c, gfx, hudG, mask, hud, lapT, gateT, big, pos, mode, pop, draftT, spdT, unitT, gray, zoom, trimG, trimT, mapT })
    }
    this.tipG = new PIXI.Graphics()
    this.tipT = new PIXI.Text('', { fontFamily: 'sans-serif', fontSize: 26, fontWeight: 'bold', fill: 0xffffff, padding: 6 })
    this.root.addChild(this.tipG, this.tipT)
    this.draw()
  }

  updateTip () {
    if (!this.tipG) return
    this.tipG.clear()
    let text = ''
    if (this.pointer) {
      const { x, y } = this.pointer
      for (const vw of this.views) {
        if (!vw.c.visible || !vw.hits) continue
        for (const hh of vw.hits) if (x >= hh[0] && x <= hh[2] && y >= hh[1] && y <= hh[3]) text = hh[4]
      }
    }
    setT(this.tipT, text)
    if (!text) return
    const pad = 12
    const tw = this.tipT.width + pad * 2
    const th = this.tipT.height + pad
    let tx = this.pointer.x + 24
    let ty = this.pointer.y - th - 12
    if (tx + tw > WIDTH) tx = this.pointer.x - tw - 24
    if (ty < 0) ty = this.pointer.y + 24
    this.tipG.lineStyle(2, 0x4de1ff, 0.8)
    this.tipG.beginFill(0x070b18, 0.92)
    this.tipG.drawRoundedRect(tx, ty, tw, th, 10)
    this.tipG.endFill()
    this.tipT.x = tx + pad
    this.tipT.y = ty + pad / 2
  }

  animateScene () {}

  row (i, k) {
    const T = this.tr
    return T[Math.max(0, Math.min(T.length - 1, k))][i]
  }

  smooth (i, k, off) {
    let acc = [0, 0, 0]
    for (let d = -2; d <= 2; d++) {
      const r = this.row(i, k + d)
      acc = add(acc, mul([r[off], r[off + 1], r[off + 2]], WEIGHTS[d + 2]))
    }
    return norm(acc)
  }

  drone (i) {
    const T = this.tr
    const ti = this.cur && this.cur.ti != null ? this.cur.ti : (T ? T.length - 1 : -1)
    if (!T || ti < 0 || !T[ti] || !T[ti][i]) return null
    const t = this.progress == null ? 1 : this.progress
    const r0 = this.row(i, ti - 2)
    const r1 = this.row(i, ti - 1)
    const r2 = this.row(i, ti)
    const r3 = this.row(i, ti + 1)
    const ev = ((this.cur && this.cur.e) || []).find(e => e[0] === i || e[1] === i)
    if (ev) {
      const tc = Math.max(0.001, Math.min(0.999, ev[2] / 1000))
      const pc = ev[0] === i ? [ev[3], ev[4], ev[5]] : [ev[6], ev[7], ev[8]]
      const p = t < tc ? lerp3(r1.slice(0, 3), pc, t / tc) : lerp3(pc, r2.slice(0, 3), (t - tc) / (1 - tc))
      const f = norm(lerp3(this.smooth(i, ti - 1, 3), this.smooth(i, ti, 3), t))
      const u = norm(lerp3(this.smooth(i, ti - 1, 6), this.smooth(i, ti, 6), t))
      return { p, f, u, raw: r2, prevRaw: r1 }
    }
    if (!fpvOptions.smooth) {
      const p = lerp3(r1.slice(0, 3), r2.slice(0, 3), t)
      const f = norm(lerp3(r1.slice(3, 6), r2.slice(3, 6), t))
      const u = norm(lerp3(r1.slice(6, 9), r2.slice(6, 9), t))
      return { p, f, u, raw: r2, prevRaw: r1 }
    }
    const p = [0, 1, 2].map(k => catmull(r0[k], r1[k], r2[k], r3[k], t))
    const f = norm(lerp3(this.smooth(i, ti - 1, 3), this.smooth(i, ti, 3), t))
    const u = norm(lerp3(this.smooth(i, ti - 1, 6), this.smooth(i, ti, 6), t))
    return { p, f, u, raw: r2, prevRaw: r1 }
  }

  draw () {
    if (this.cur && this.cur.T) {
      this.tr = this.cur.T
      this.g = this.cur.G
      this.rings = this.cur.R
      this.players = this.cur.P
    } else {
      this.tr = this.trail
    }
    if (!this.root || !this.g || !this.players || !this.last) return
    this.root.visible = true
    const n = this.players.length
    const me = this.players.findIndex(p => p.isMe)
    let pick = fpvOptions.view === -2 ? Math.max(0, me) : fpvOptions.view === -3 ? 'L' : fpvOptions.view
    let chaseMode = fpvOptions.chase
    if (this.g.intro) {
      const phase = Math.floor((((this.cur && this.cur.n) || 0) * 0.15) / 5) % 3
      pick = phase === 0 ? -1 : 0
      chaseMode = phase === 2 ? 1 : 0
    }
    this.chaseMode = chaseMode
    const tiD = this.cur && this.cur.ti != null ? this.cur.ti : 0
    const rects = pick === 'L' ? [[0, 0, WIDTH, HEIGHT, 'L']] : pick >= 0 ? [[0, 0, WIDTH, HEIGHT, pick % n]] : layout(n)
    try {
      this.soundStep(pick === 'L' ? this.plan(tiD, 'L').target : pick >= 0 ? pick % n : Math.max(0, me))
    } catch (err) {}
    this.views.forEach((vw, k) => {
      vw.c.visible = k < rects.length
      if (k >= rects.length) vw.hits = []
      if (k < rects.length) {
        try {
          this.drawView(vw, rects[k])
        } catch (err) {
          if (!this.warned) {
            this.warned = true
            console.error('FpvModule draw error', err)
          }
        }
      }
    })
    this.updateTip()
  }

  drawView (vw, rect) {
    const [x, y, w, h, key] = rect
    vw.hits = []
    const hit = (x0, y0, x1, y1, text) => vw.hits.push([x0, y0, x1, y1, text])
    const pl = this.plan(this.cur && this.cur.ti != null ? this.cur.ti : 0, key)
    const i = pl.target
    const gfx = vw.gfx
    gfx.clear()
    vw.mask.clear()
    vw.mask.beginFill(0xffffff)
    vw.mask.drawRect(x, y, w, h)
    vw.mask.endFill()
    gfx.lineStyle(0)
    gfx.beginFill(0x0a0e1a)
    gfx.drawRect(x, y, w, h)
    gfx.endFill()

    const s = this.drone(i)
    if (!s) return
    const chase = this.chaseMode >= 1
    const tv = this.chaseMode === 2
    const tiC = this.cur && this.cur.ti != null ? this.cur.ti : 0
    const tC = this.progress == null ? 1 : this.progress
    const camNow = this.camFor(i, this.chaseMode, pl.cam)
    let { eye, F, U } = camNow
    let fovBase = camNow.fov
    const blendAge = (tiC - pl.sw + tC) / 8
    if (pl.sw >= 0 && blendAge < 1 && pl.fromTarget >= 0) {
      const camOld = this.camFor(pl.fromTarget, this.chaseMode, pl.fromCam)
      if (camOld) {
        const b = blendAge * blendAge * (3 - 2 * blendAge)
        eye = lerp3(camOld.eye, eye, b)
        F = norm(lerp3(camOld.F, F, b))
        U = norm(sub(lerp3(camOld.U, U, b), mul(F, dot(lerp3(camOld.U, U, b), F))))
        fovBase = lerp(camOld.fov, fovBase, b)
      }
    }
    const R = cross(F, U)
    const t = this.progress == null ? 1 : this.progress
    const tiNow = this.cur && this.cur.ti != null ? this.cur.ti : 0
    let since = -1
    for (let k = 0; k < 4 && tiNow - k >= 0; k++) {
      if (this.tr[tiNow - k][i][26]) { since = k; break }
    }
    const boostFx = since < 0 ? 0 : Math.max(0, 1 - (since + t) / 4)
    const spd = s.prevRaw ? lerp(s.prevRaw[9], s.raw[9], t) : s.raw[9]
    const fov = fovBase + (tv ? 0 : 0.12 * boostFx)
    const foc = (w / 2) / Math.tan(fov / 2)
    const cx = x + w / 2
    const cy = y + h / 2
    const cam = P => { const d = sub(P, eye); return [dot(d, R), dot(d, U), dot(d, F)] }
    const proj = c => [cx + foc * c[0] / c[2], cy - foc * c[1] / c[2]]
    const fillPoly = (pts, color, alpha) => {
      const cl = clipPoly(pts.map(cam))
      if (cl.length < 3) return
      gfx.lineStyle(0)
      gfx.beginFill(color, alpha == null ? 1 : alpha)
      gfx.drawPolygon(cl.flatMap(proj))
      gfx.endFill()
    }
    const line = (A, B, width, color, alpha) => {
      const seg = clipSeg(cam(A), cam(B))
      if (!seg) return
      const a = proj(seg[0])
      const b = proj(seg[1])
      gfx.lineStyle(width, color, alpha)
      gfx.moveTo(a[0], a[1])
      gfx.lineTo(b[0], b[1])
    }

    const [AX, AY, AZ] = this.g.arena
    fillPoly([[0, 0, 0], [AX, 0, 0], [AX, AY, 0], [0, AY, 0]], 0x181226)
    fillPoly([[0, 0, AZ], [AX, 0, AZ], [AX, AY, AZ], [0, AY, AZ]], 0x0a0e1a)
    const walls = [
      { o: [0, 0, 0], u: [1, 0, 0], len: AX, base: 0x111829 },
      { o: [AX, 0, 0], u: [0, 1, 0], len: AY, base: 0x151c30 },
      { o: [AX, AY, 0], u: [-1, 0, 0], len: AX, base: 0x111829 },
      { o: [0, AY, 0], u: [0, -1, 0], len: AY, base: 0x151c30 }
    ]
    const WP = (wl, a, z) => [wl.o[0] + wl.u[0] * a, wl.o[1] + wl.u[1] * a, z]
    for (const wl of walls) {
      fillPoly([WP(wl, 0, 0), WP(wl, wl.len, 0), WP(wl, wl.len, AZ), WP(wl, 0, AZ)], wl.base)
      for (let a = 0; a < wl.len; a += 1500) {
        for (let r = 0; r < 3; r++) {
          const z0 = r * 1200 + 60
          const z1 = z0 + 1080
          const inset = 70
          fillPoly([WP(wl, a + inset, z0), WP(wl, a + 1500 - inset, z0), WP(wl, a + 1500 - inset, z1), WP(wl, a + inset, z1)], ((a / 1500 + r) % 2) ? 0x1a2546 : 0x162040)
        }
      }
      for (let a = 3000; a < wl.len; a += 3000) {
        line(WP(wl, a, 0), WP(wl, a, AZ), 14, 0x4de1ff, 0.1)
        line(WP(wl, a, 0), WP(wl, a, AZ), 3, 0x9ff3ff, 0.85)
      }
    }
    for (let k = 1000; k < AX; k += 1000) {
      line([k, 0, 0], [k, AY, 0], 1, 0x34264f, 0.9)
      line([0, k, 0], [AX, k, 0], 1, 0x34264f, 0.9)
    }
    const corners = [[0, 0], [AX, 0], [AX, AY], [0, AY]]
    for (let k = 0; k < 4; k++) {
      const [ax, ay] = corners[k]
      const [bx, by] = corners[(k + 1) % 4]
      line([ax, ay, 400], [bx, by, 400], 10, 0x4de1ff, 0.12)
      line([ax, ay, 400], [bx, by, 400], 3, 0x4de1ff, 0.9)
      line([ax, ay, AZ - 300], [bx, by, AZ - 300], 10, 0xff4dd2, 0.1)
      line([ax, ay, AZ - 300], [bx, by, AZ - 300], 3, 0xff4dd2, 0.8)
      line([ax, ay, 0], [ax, ay, AZ], 2, 0x2c3a60, 1)
    }
    for (let k = 2000; k < AX; k += 2000) {
      const strip = [[k - 120, 1200, AZ - 2], [k + 120, 1200, AZ - 2], [k + 120, AY - 1200, AZ - 2], [k - 120, AY - 1200, AZ - 2]]
      fillPoly([[k - 400, 1000, AZ - 1], [k + 400, 1000, AZ - 1], [k + 400, AY - 1000, AZ - 1], [k - 400, AY - 1000, AZ - 1]], 0x2a3a66, 0.6)
      fillPoly(strip, 0xe6efff, 0.95)
    }

    const next = s.raw[10]
    const drawPylon = (py) => {
      const [px, py0, pr] = py
      const sides = 12
      const ring = []
      for (let k = 0; k < sides; k++) {
        const a = k / sides * Math.PI * 2
        ring.push([px + pr * Math.cos(a), py0 + pr * Math.sin(a)])
      }
      for (let k = 0; k < sides; k++) {
        const A = ring[k]
        const B = ring[(k + 1) % sides]
        const ma = (k + 0.5) / sides * Math.PI * 2
        const nx = Math.cos(ma)
        const ny = Math.sin(ma)
        if (nx * (eye[0] - (A[0] + B[0]) / 2) + ny * (eye[1] - (A[1] + B[1]) / 2) <= 0) continue
        const shade = 0.55 + 0.45 * Math.max(0, nx * 0.6 + ny * 0.8)
        const base = Math.round(0x1c * shade) * 65536 + Math.round(0x26 * shade) * 256 + Math.round(0x40 * shade)
        fillPoly([[A[0], A[1], 0], [B[0], B[1], 0], [B[0], B[1], AZ], [A[0], A[1], AZ]], base)
      }
      for (const z of [400, 1600, 2800, AZ - 300]) {
        for (let k = 0; k < sides; k++) {
          const A = ring[k]
          const B = ring[(k + 1) % sides]
          const ma = (k + 0.5) / sides * Math.PI * 2
          if (Math.cos(ma) * (eye[0] - (A[0] + B[0]) / 2) + Math.sin(ma) * (eye[1] - (A[1] + B[1]) / 2) <= 0) continue
          const zz = Math.max(cam([A[0], A[1], z])[2], NEAR)
          const wd = Math.max(1.5, Math.min(12, foc * 40 / zz))
          line([A[0], A[1], z], [B[0], B[1], z], wd * 2.4, 0xff9f40, 0.2)
          line([A[0], A[1], z], [B[0], B[1], z], wd, 0xffb347, 0.95)
        }
      }
    }
    const order = this.rings.map((r, gi) => ({ gi, z: cam(r.c)[2] }))
    ;(this.g.pylons || []).forEach((py, k) => {
      const dx = py[0] - eye[0]
      const dy = py[1] - eye[1]
      const dh = Math.hypot(dx, dy)
      const near = dh > 1 ? [py[0] - dx / dh * py[2], py[1] - dy / dh * py[2], eye[2]] : [py[0], py[1], eye[2]]
      order.push({ py, z: cam(near)[2] })
    })
    order.sort((a, b) => b.z - a.z)
    for (const { gi, z, py } of order) {
      if (py) { drawPylon(py); continue }
      const r = this.rings[gi]
      const isNext = gi === next
      const wrong = dot(sub(s.p, r.c), r.n) > 0
      const color = wrong ? (isNext ? 0xff4d4d : 0x993333) : isNext ? 0x5dff7a : gi === 0 ? 0xffd34d : 0x4de1ff
      const width = Math.max(1.5, Math.min(60, foc * 80 / Math.max(z, NEAR)))
      let flash = 0
      for (const e of (this.cur && this.cur.e) || []) if (e[1] === -10 - gi && t >= e[2] / 1000) flash = Math.max(flash, e[10] === 1 ? 1 : 0.7)
      for (const e of (this.prev && this.prev.e) || []) if (e[1] === -10 - gi) flash = Math.max(flash, (e[10] === 1 ? 1 : 0.7) * Math.max(0, 0.6 - t))
      const ringCol = flash > 0 ? (flash >= 0.9 ? 0xff7a1a : 0xffffff) : color
      const facing = dot(sub(eye, r.c), r.n) > 0
      line([r.c[0], r.c[1], 0], r.c, 1, color, 0.25)
      if (facing && r.mesh) {
        fillPoly(r.pts, flash > 0 ? ringCol : 0xff3b3b, (isNext ? 0.16 : 0.1) + 0.25 * flash)
        const mw = Math.max(1, Math.min(6, foc * 14 / Math.max(z, NEAR)))
        for (const [A, B] of r.mesh) line(A, B, mw, flash > 0 ? ringCol : 0xff5a5a, (isNext ? 0.55 : 0.32) + 0.4 * flash)
      }
      for (let k = 0; k < 32; k++) {
        const A = r.pts[k]
        const B = r.pts[(k + 1) % 32]
        line(A, B, width * (2.2 + 1.5 * flash), ringCol, Math.max(isNext ? 0.25 : 0.1, 0.45 * flash))
        line(A, B, width, ringCol, Math.max(isNext ? 1 : 0.55, flash))
      }
    }

    if (this.g.t) {
      const [sx, sy, sz, sr] = this.g.t
      const found = this.tr[tiNow].some(r => r[30] > 0)
      const n = [Math.SQRT1_2, Math.SQRT1_2, 0]
      const side = [-n[1], n[0], 0]
      const pts = []
      for (let k = 0; k < 32; k++) {
        const a = 2 * Math.PI * k / 32
        pts.push([sx + side[0] * sr * Math.cos(a), sy + side[1] * sr * Math.cos(a), sz + sr * Math.sin(a)])
      }
      const z = Math.max(cam([sx, sy, sz])[2], NEAR)
      const width = Math.max(1.5, Math.min(14, foc * 45 / z))
      for (let k = 0; k < 32; k++) {
        const A = pts[k]
        const B = pts[(k + 1) % 32]
        line(A, B, width * 2.4, 0x6a5cff, found ? 0.3 : 0.08)
        line(A, B, width, found ? 0xb3abff : 0x6a5cff, found ? 1 : 0.35)
      }
    }

    const cellCol = [0xffe14d, 0x4da6ff, 0xf0f0ff]
    const timers = (this.cur && this.cur.c) || (this.last && this.last.c) || []
    const spin = ((this.cur && this.cur.n) || 0) * 0.15 + (this.progress || 0) * 0.15
    ;(this.g.cells || []).forEach((cl, k) => {
      if (timers[k] > 0) return
      const c0 = [cl[0], cl[1], cl[2]]
      const cs = Math.cos(spin) * 160
      const sn = Math.sin(spin) * 160
      const pts = [add(c0, [cs, sn, 0]), add(c0, [-sn, cs, 0]), add(c0, [-cs, -sn, 0]), add(c0, [sn, -cs, 0])]
      const tp = add(c0, [0, 0, 220])
      const bt = add(c0, [0, 0, -220])
      const col = cellCol[cl[3]]
      for (let e = 0; e < 4; e++) {
        const z = Math.max(cam(pts[e])[2], NEAR)
        const wd = Math.max(1, Math.min(8, foc * 22 / z))
        line(pts[e], pts[(e + 1) % 4], wd, col, 1)
        line(pts[e], tp, wd, col, 1)
        line(pts[e], bt, wd, col, 1)
      }
      const cc = cam(c0)
      if (cc[2] > NEAR) {
        const q = proj(cc)
        gfx.lineStyle(0)
        gfx.beginFill(col, 0.25)
        gfx.drawCircle(q[0], q[1], Math.max(4, foc * 260 / cc[2]))
        gfx.endFill()
      }
    })

    const ti = this.cur && this.cur.ti != null ? this.cur.ti : -1
    for (let j = 0; j < this.players.length; j++) {
      if ((j === i && !chase) || ti < 1) continue
      const col = toColor(this.players[j].color)
      const o = this.drone(j)
      if (!o) continue
      let prevP = o.p
      for (let b = 1; b < 15 && ti - b >= 0; b++) {
        const q = this.tr[ti - b][j]
        if (q[15] === 0) break
        const fade = Math.pow(1 - (b - 1) / 14, 2.5)
        const z = Math.max(cam(prevP)[2], NEAR)
        const wd = Math.max(1, Math.min(14, foc * 60 / z)) * fade
        const drafted = s.raw[29] && b < 6
        line(prevP, q, wd * 2.5, col, (drafted ? 0.35 : 0.12) * fade)
        line(prevP, q, wd, drafted ? 0xffffff : col, (drafted ? 1 : 0.75) * fade)
        prevP = [q[0], q[1], q[2]]
      }
    }

    const tiE = this.cur && this.cur.ti != null ? this.cur.ti : 0
    const stateAt = (j, tf) => {
      const i0 = Math.floor(tf)
      const fr = tf - i0
      const a = this.row(j, i0)
      const b = this.row(j, i0 + 1)
      return { p: lerp3(a.slice(0, 3), b.slice(0, 3), fr), f: norm(lerp3(a.slice(3, 6), b.slice(3, 6), fr)), u: norm(lerp3(a.slice(6, 9), b.slice(6, 9), fr)), raw: b }
    }
    const drawQuad = (o, j, alphaMul, echo) => {
      const c = cam(o.p)
      if (c[2] < (j === i ? 100 : 250)) return
      const q = proj(c)
      const col = o.raw[15] === 0 ? 0x666666 : toColor(this.players[j].color)
      const oR = cross(o.f, o.u)
      const ghostA = (o.raw[23] > 0 ? 0.35 : 1) * alphaMul
      const crashed = o.raw[14] > 0 && o.raw[15] === 1
      const bodyCol = crashed ? 0x8a8f98 : col
      const W = (a, b, z) => add(add(add(o.p, mul(o.f, a)), mul(oR, b)), mul(o.u, z || 0))
      const above = dot(o.u, sub(eye, o.p)) > 0
      const shade = (c0, k) => ((Math.round(((c0 >> 16) & 255) * k) << 16) | (Math.round(((c0 >> 8) & 255) * k) << 8) | Math.round((c0 & 255) * k))
      const drawBody = () => {
        const hub = []
        for (let k = 0; k < 8; k++) {
          const ang = 2 * Math.PI * (k + 0.5) / 8
          hub.push(cam(W(48 * Math.cos(ang), 48 * Math.sin(ang), 9)))
        }
        if (hub.some(b => b[2] < NEAR)) return
        gfx.lineStyle(Math.max(1, foc * 7 / c[2]), 0xffffff, 0.75 * ghostA)
        gfx.beginFill(shade(bodyCol, above ? 1 : 0.8), ghostA)
        gfx.drawPolygon(hub.flatMap(proj))
        gfx.endFill()
      }
      const drawArms = () => {
        const arms = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => {
          const wc = W(96 * a, 96 * b)
          return { wc, rc: cam(wc) }
        }).sort((m, n2) => n2.rc[2] - m.rc[2])
        for (const arm of arms) {
          if (arm.rc[2] < NEAR) continue
          const rp = proj(arm.rc)
          gfx.lineStyle(Math.max(1, foc * 19 / c[2]), 0x9aa3ad, 0.9 * ghostA)
          gfx.moveTo(q[0], q[1])
          gfx.lineTo(rp[0], rp[1])
          const ring = []
          for (let k = 0; k < 14; k++) {
            const ang = 2 * Math.PI * k / 14
            ring.push(cam(add(arm.wc, add(mul(o.f, 63 * Math.cos(ang)), mul(oR, 63 * Math.sin(ang))))))
          }
          if (ring.every(r => r[2] > NEAR)) {
            gfx.lineStyle(Math.max(1, foc * 12 / arm.rc[2]), col, ghostA)
            gfx.beginFill(bodyCol, (crashed ? 0.5 : 0.3) * ghostA)
            gfx.drawPolygon(ring.flatMap(proj))
            gfx.endFill()
          }
        }
      }
      if (above) { drawArms(); drawBody() } else { drawBody(); drawArms() }
      if (echo) return
      if (o.raw[22] > 0) {
        gfx.lineStyle(Math.max(1, foc * 20 / c[2]), 0x4da6ff, 0.8)
        gfx.beginFill(0x4da6ff, 0.15)
        gfx.drawCircle(q[0], q[1], foc * 260 / c[2])
        gfx.endFill()
      }
      if (c[2] > 2500) {
        gfx.lineStyle(2, col, 0.9)
        gfx.drawCircle(q[0], q[1], 10)
      }
    }
    for (let j = 0; j < this.players.length; j++) {
      if (j === i && !chase) continue
      const o = this.drone(j)
      if (!o) continue
      let sinceJ = -1
      for (let k = 0; k < 6 && tiE - k >= 0; k++) {
        if (this.tr[tiE - k][j][26]) { sinceJ = k; break }
      }
      const fxJ = sinceJ < 0 ? 0 : Math.max(0, 1 - (sinceJ + t) / 6)
      if (fxJ > 0) {
        for (let k = 20; k >= 1; k--) {
          const tf = tiE - 1 + t - k * 0.12
          if (tf < 0) continue
          drawQuad(stateAt(j, tf), j, 0.7 * Math.sqrt(fxJ) * (1 - k / 21), true)
        }
      }
      drawQuad(o, j, 1, false)
    }

    const sparks = (list, base) => {
      for (const e of list || []) {
        const tc = e[2] / 1000
        const age = base === 0 ? (t - tc) / Math.max(0.001, 1 - tc) : 1 + t
        if (base === 0 && t < tc) continue
        const fade = Math.max(0, 1 - age * 0.55)
        if (fade <= 0) continue
        const m = cam([(e[3] + e[6]) / 2, (e[4] + e[7]) / 2, (e[5] + e[8]) / 2])
        if (m[2] < NEAR) continue
        const q = proj(m)
        const crash = e[10] === 1
        const sz = Math.min(Math.min(w, h) * 0.22, foc * (crash ? 420 : 220) / m[2])
        const col = crash ? 0xff7a1a : 0xfff2b3
        gfx.lineStyle(0)
        gfx.beginFill(col, 0.35 * fade)
        gfx.drawCircle(q[0], q[1], sz * (0.4 + 0.6 * Math.min(1, age)))
        gfx.endFill()
        for (let k = 0; k < (crash ? 16 : 10); k++) {
          const a = k * 2.399 + e[0] * 0.7 + e[1] * 1.3
          const r1 = sz * (0.2 + 0.5 * age)
          const r2 = r1 + sz * (crash ? 0.9 : 0.6) * fade
          gfx.lineStyle(Math.max(1.5, sz / 25), col, fade)
          gfx.moveTo(q[0] + Math.cos(a) * r1, q[1] + Math.sin(a) * r1)
          gfx.lineTo(q[0] + Math.cos(a) * r2, q[1] + Math.sin(a) * r2)
        }
      }
    }
    sparks(this.cur && this.cur.e, 0)
    sparks(this.prev && this.prev.e, 1)

    const gc = cam(this.rings[next].c)
    const gp = gc[2] > NEAR ? proj(gc) : null
    if (!gp || gp[0] < x || gp[0] > x + w || gp[1] < y || gp[1] > y + h) {
      const ang = Math.atan2(-gc[1], gc[0])
      const ax = cx + Math.cos(ang) * (w / 2 - 50)
      const ay = cy + Math.sin(ang) * (h / 2 - 50)
      gfx.lineStyle(0)
      gfx.beginFill(0x5dff7a, 0.9)
      gfx.drawPolygon([ax + Math.cos(ang) * 30, ay + Math.sin(ang) * 30,
        ax + Math.cos(ang + 2.4) * 22, ay + Math.sin(ang + 2.4) * 22,
        ax + Math.cos(ang - 2.4) * 22, ay + Math.sin(ang - 2.4) * 22])
      gfx.endFill()
    }

    const hg = vw.hudG
    hg.clear()
    const streaks = (k0, n, alpha, inner) => {
      for (let k = 0; k < n; k++) {
        const a = ((k * 137.5 + k0) % 360) * Math.PI / 180
        const r1 = Math.min(w, h) * (inner + ((k * 53) % 17) / 90)
        const r2 = r1 + Math.min(w, h) * 0.25
        hg.lineStyle(2 + (k % 3), 0xffffff, alpha)
        hg.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1)
        hg.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2)
      }
    }
    if (boostFx > 0 && !tv) streaks((tiNow - since) * 31, 28, 0.7 * boostFx, 0.18 + 0.12 * (since + t))
    if (s.raw[29] && !tv) streaks(17, 14, 0.25, 0.42 + 0.05 * t)

    const color = toColor(this.players[i].color)
    hg.lineStyle(2, 0xffffff, 0.5)
    hg.moveTo(cx - 12, cy)
    hg.lineTo(cx + 12, cy)
    hg.moveTo(cx, cy - 12)
    hg.lineTo(cx, cy + 12)

    if (s.raw[31] != null && s.raw[31] >= 0 && this.g.bank) {
      const left = Math.max(0, Math.min(1, s.raw[31] / this.g.bank))
      const used = 1 - left
      const isz = Math.min(w, h) / 9
      const r = isz * 0.41
      const sx = x + w - 35 * h / 1080 - r
      const sy = y + h - 107 * h / 1080
      const col = left < 0.25 ? 0xff9d1a : 0xffffff
      const lw = Math.max(2, isz / 14)
      const a0 = -Math.PI / 2
      hit(sx - r, sy - r - isz * 0.15, sx + r, sy + r, `Time bank: ${s.raw[31]} ms left`)
      hg.lineStyle(0)
      hg.beginFill(col, 0.08)
      hg.moveTo(sx, sy)
      hg.arc(sx, sy, r * 0.8, a0, a0 + used * Math.PI * 2)
      hg.lineTo(sx, sy)
      hg.endFill()
      hg.lineStyle(lw, col, 0.3)
      hg.drawCircle(sx, sy, r)
      hg.moveTo(sx, sy - r)
      hg.lineTo(sx, sy - r - isz * 0.12)
      hg.moveTo(sx - isz * 0.11, sy - r - isz * 0.12)
      hg.lineTo(sx + isz * 0.11, sy - r - isz * 0.12)
      const ha = a0 + used * Math.PI * 2
      hg.lineStyle(Math.max(2.5, isz / 11), col, 0.3)
      hg.moveTo(sx, sy)
      hg.lineTo(sx + Math.cos(ha) * r * 0.78, sy + Math.sin(ha) * r * 0.78)
      hg.lineStyle(0)
    }
    this.minimap(hg, x + w - Math.min(w, h) * 0.34 - 12, y + 12, Math.min(w, h) * 0.34, i, vw)

    const raw = s.raw
    const sticks = [[raw[17], raw[16] * 2 - 100], [raw[19], raw[18]]]
    const sr = Math.min(w, h) / 14.7
    for (let k = 0; k < 2; k++) {
      const sx = cx + (k === 0 ? -1.3 : 1.3) * sr
      const sy = y + h - sr - 14
      hg.lineStyle(2, 0xffffff, 0.6)
      hg.beginFill(0x000000, 0.3)
      hg.drawRoundedRect(sx - sr, sy - sr, 2 * sr, 2 * sr, sr / 6)
      hg.endFill()
      hg.lineStyle(1, 0xffffff, 0.2)
      hg.moveTo(sx - sr, sy)
      hg.lineTo(sx + sr, sy)
      hg.moveTo(sx, sy - sr)
      hg.lineTo(sx, sy + sr)
      hg.lineStyle(0)
      hg.beginFill(color)
      const reach = sr * 0.8 / 100
      hg.drawCircle(sx + sticks[k][0] * reach, sy - sticks[k][1] * reach, sr / 5)
      hg.endFill()
      hit(sx - sr, sy - sr, sx + sr, sy + sr, k === 0 ? `Left stick: THROTTLE ${raw[16]}, YAW ${raw[17]}` : `Right stick: PITCH ${raw[18]}, ROLL ${raw[19]}`)
    }

    const sy0 = y + h - sr - 14
    const maxB = this.g.boosts || 0
    const have = raw[13]
    const pips = Math.max(maxB, have)
    const bw = sr * 0.8
    const bh = sr * 1.7
    const gotBolt = s.prevRaw && have > s.prevRaw[13]
    const isz = sr * 1.1
    const partial = have < maxB && this.g.recharge ? (this.g.recharge - raw[27]) / this.g.recharge : 0
    if (pips > 0) {
      hit(cx + 3.0 * sr, sy0 - isz * 0.8, cx + 3.0 * sr + pips * isz * 1.4, sy0 + isz * 0.8, 'Boost: go faster!')
    }
    for (let k = 0; k < pips; k++) {
      const bx = cx + 3.0 * sr + (k + 0.5) * isz * 1.4
      const juice = gotBolt && k === have - 1 ? 1 + 0.7 * (1 - t) : 1
      const on = k < have
      const ring = k === have && have < maxB ? partial : -1
      this.icon(hg, k >= maxB ? 4 : 3, bx, sy0, isz * juice, on, ring)
      if (juice > 1) {
        hg.lineStyle(3, 0xffffff, 1 - t)
        hg.drawCircle(bx, sy0, isz * (0.8 + 2.5 * t))
      }
    }

    if ((this.g.cells || []).length > 0) {
      const prevItem = s.prevRaw ? s.prevRaw[25] : 0
      for (let it = 1; it <= 2; it++) {
        const ix = cx - 3.0 * sr - (it - 0.5) * isz * 1.4
        const iy = sy0
        const timer = it === 1 ? raw[22] : raw[23]
        const prevTimer = s.prevRaw ? (it === 1 ? s.prevRaw[22] : s.prevRaw[23]) : 0
        const held = raw[25] === it
        const active = timer > 0
        const picked = held && prevItem !== it
        const used = active && prevTimer === 0
        const juice = picked || used ? 1 + 0.7 * (1 - t) : 1
        this.icon(hg, it, ix, iy, isz * juice, held || active, active ? timer / 30 : -1)
        const what = it === 1 ? 'SHIELD: impacts cause no CRASH' : 'GHOST: flies through other drones'
        hit(ix - isz * 0.7, iy - isz * 0.8, ix + isz * 0.7, iy + isz * 0.8, what)
        if (used) {
          hg.lineStyle(3, it === 1 ? 0x4da6ff : 0xf0f0ff, 1 - t)
          hg.drawCircle(ix, iy, isz * (0.8 + 2.5 * t))
        }
      }
    }

    hg.lineStyle(6, color, 1)
    hg.drawRect(x + 3, y + 3, w - 6, h - 6)

    const laps = this.g.laps
    const fx = ''
    const gates = this.rings.length
    setT(vw.hud, this.players[i].name)
    setS(vw.hud, 'fill', color)
    setT(vw.lapT, `LAP ${Math.min(raw[11] + 1, laps)}/${laps}`)
    setT(vw.gateT, `GATE ${raw[10] === 0 ? gates : raw[10]}/${gates}`)
    const acro = raw[20] === 2
    setT(vw.mode, acro ? 'ACRO' : 'ANGLE')
    setS(vw.mode, 'fill', acro ? ['#fff2b3', '#ff7a1a'] : ['#ffffff', '#4de1ff'])
    setS(vw.mode, 'fontSize', Math.round(Math.min(w, h) / 16))
    vw.mode.x = cx
    vw.mode.y = y + 10
    const mb = Math.round(Math.min(w, h) / 16)
    hit(cx - mb * 2.6, y + 10, cx + mb * 2.6, y + 10 + mb * 1.3, acro ? 'ACRO: the sticks set rotation speeds, no self-levelling' : 'ANGLE: the sticks set the lean angle, self-levelling')
    const badge = Math.round(Math.min(w, h) / 16)
    const sbH = h * 0.36
    const sbX = x + w - 34
    const sbY = cy - sbH / 2
    const sfrac = Math.max(0, spd) / 800
    const su = SPEED_UNIT[fpvOptions.units] || SPEED_UNIT[0]
    hit(sbX - mb * 3, sbY, sbX + 16, sbY + sbH, `Speed: ${Math.round(spd)} units/turn (${Math.round(spd * 0.1)} km/h, ${Math.round(spd * 0.1 / 1.609344)} mph)`)
    hg.lineStyle(2, 0xffffff, 0.5)
    hg.beginFill(0x000000, 0.3)
    hg.drawRoundedRect(sbX, sbY, 16, sbH, 6)
    hg.endFill()
    hg.lineStyle(0)
    const boosting = boostFx > 0
    const drafting = !!raw[29]
    const fillH = sbH * Math.min(1, sfrac)
    if (boosting) {
      hg.beginFill(0xff9d1a, 0.25 * Math.min(1, boostFx * 1.5))
      hg.drawRoundedRect(sbX - 6, sbY + sbH - fillH - 6, 28, fillH + 12, 10)
      hg.endFill()
    }
    hg.beginFill(boosting ? 0xff9d1a : drafting ? 0xb8c7ff : 0x4de1ff, 0.9)
    hg.drawRoundedRect(sbX + 3, sbY + sbH - fillH, 10, fillH, 4)
    hg.endFill()
    if (drafting) {
      const phase = (((this.cur && this.cur.n) || 0) + t) * 0.6 % 1
      hg.lineStyle(2, 0xffffff, 0.8)
      for (let k = 0; k < 6; k++) {
        const yy = sbY + sbH - ((k + phase) / 6) * fillH
        if (yy < sbY + sbH - fillH + 2) continue
        hg.moveTo(sbX + 4, yy)
        hg.lineTo(sbX + 12, yy - 5)
      }
      hg.lineStyle(0)
    }
    setT(vw.spdT, `${Math.round(spd * su[1])}`)
    setS(vw.spdT, 'fontSize', Math.round(badge * 1.1))
    setS(vw.spdT, 'fill', boosting ? ['#fff7c2', '#ff9d1a'] : drafting ? ['#ffffff', '#b8c7ff'] : ['#ffffff', '#cfd8ff'])
    vw.spdT.x = sbX - 10
    vw.spdT.y = cy
    setT(vw.unitT, su[0])
    setS(vw.unitT, 'fontSize', Math.max(10, Math.round(badge * 0.38)))
    vw.unitT.x = sbX - 12
    vw.unitT.y = cy + badge * 0.55
    setT(vw.pop, boostFx > 0 ? 'BOOST' : '')
    setS(vw.pop, 'fontSize', badge)
    vw.pop.scale.set(1 + 0.5 * Math.max(0, boostFx - 0.6))
    vw.pop.alpha = Math.min(1, boostFx * 1.6)
    vw.pop.x = cx
    vw.pop.y = y + 14 + badge * 1.25
    let foundAt = -1
    if (raw[30] > 0) {
      for (let k = tiNow; k >= 0; k--) {
        if (!(this.row(i, k)[30] > 0)) break
        foundAt = k
      }
    }
    const trimAge = foundAt < 0 ? -1 : tiNow - foundAt + t
    const fg = vw.trimG
    fg.clear()
    if (trimAge >= 0 && trimAge < 45 && this.g.k) {
      const fade = Math.min(1, trimAge / 3, (45 - trimAge) / 6)
      if (!this.trimNames) {
        const raw = atob(this.g.k)
        let txt = ''
        for (let q = 0; q < raw.length; q++) txt += String.fromCharCode(raw.charCodeAt(q) ^ ((q * 37 + 11) & 255))
        this.trimNames = txt.split('\n')
      }
      const names = this.trimNames
      const pw = Math.min(w * 0.7, 900)
      const ph = Math.min(h * 0.8, 150 + names.length * 58)
      fg.lineStyle(4, 0x8f84ff, 0.9 * fade)
      fg.beginFill(0x07051a, 0.85 * fade)
      fg.drawRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 24)
      fg.endFill()
      setT(vw.trimT, 'THANK YOU\n\n' + names.join('\n'))
      setS(vw.trimT, 'fontSize', Math.round(Math.min(42, ph / (names.length + 3.5))))
      setS(vw.trimT, 'lineHeight', Math.round(Math.min(54, ph / (names.length + 3))))
      vw.trimT.alpha = fade
      vw.trimT.x = cx
      vw.trimT.y = cy
    } else setT(vw.trimT, '')
    setT(vw.draftT, raw[29] ? 'DRAFT' : '')
    setS(vw.draftT, 'fontSize', badge)
    vw.draftT.alpha = 0.7 + 0.3 * Math.sin(((this.cur && this.cur.n) || 0) * 1.3 + t * 1.3)
    vw.draftT.x = cx
    vw.draftT.y = y + 14 + badge * (boostFx > 0 ? 2.5 : 1.25)
    const blur = tv ? 0 : Math.max(boostFx, raw[29] ? 0.35 : 0)
    const filters = []
    if (blur > 0.01) {
      vw.zoom.uniforms.uCenter = [cx, cy]
      vw.zoom.uniforms.uStrength = blur
      vw.zoom.uniforms.uInner = Math.min(w, h) * 0.25
      filters.push(vw.zoom)
    }
    if (raw[14] > 0 || raw[15] === 0) filters.push(vw.gray)
    const fkey = filters.map(f => (f === vw.zoom ? 'z' : 'g')).join()
    if (vw._fkey !== fkey) {
      gfx.filters = filters.length ? filters : null
      vw._fkey = fkey
    }
    const hkey = raw[14] > 0 || raw[15] === 0
    if (vw._hkey !== hkey) {
      hg.filters = hkey ? [vw.gray] : null
      vw._hkey = hkey
    }
    const unit = Math.min(w, h)
    setS(vw.hud, 'fontSize', Math.round(unit / 34))
    setS(vw.lapT, 'fontSize', Math.round(unit / 22))
    setS(vw.gateT, 'fontSize', Math.round(unit / 30))
    vw.hud.x = x + 16
    vw.hud.y = y + 10
    vw.lapT.x = x + 14
    vw.lapT.y = y + 10 + unit / 26
    vw.gateT.x = x + 16
    vw.gateT.y = y + 10 + unit / 26 + unit / 16
    const batW = unit / 6.5
    const batH = batW / 3.4
    const batX = x + 18
    const batY = y + 14 + unit / 26 + unit / 16 + unit / 22
    const batLevel = Math.max(0, Math.min(100, raw[12])) / 100
    hit(batX - 4, batY - 4, batX + batW + 10, batY + batH + 4, `Battery: ${Math.round(batLevel * 100)}%`)
    const batCol = batLevel > 0.5 ? 0x5dff7a : batLevel > 0.25 ? 0xffe14d : 0xff4d4d
    hg.lineStyle(2, 0xffffff, 0.85)
    hg.beginFill(0x000000, 0.35)
    hg.drawRoundedRect(batX, batY, batW, batH, batH / 4)
    hg.endFill()
    hg.lineStyle(0)
    hg.beginFill(0xffffff, 0.85)
    hg.drawRect(batX + batW, batY + batH * 0.3, batH * 0.2, batH * 0.4)
    hg.endFill()
    if (batLevel > 0) {
      hg.beginFill(batCol, 0.95)
      hg.drawRoundedRect(batX + 3, batY + 3, (batW - 6) * batLevel, batH - 6, batH / 6)
      hg.endFill()
    }
    const dmg = Math.min(20, raw[32] || 0)
    if (dmg > 0) {
      const dY = batY + batH + 5
      const dH = Math.max(4, batH / 3)
      hit(batX - 4, dY - 2, batX + batW + 4, dY + dH + 2, `Damage: ${raw[32]} (max thrust ${100 - 2 * dmg}%)`)
      hg.beginFill(0x000000, 0.35)
      hg.drawRect(batX, dY, batW, dH)
      hg.endFill()
      for (let k = 0; k < dmg; k++) {
        hg.beginFill(dmg >= 15 ? 0xff4040 : 0xff9d1a, 0.95)
        hg.drawRect(batX + 1 + k * batW / 20, dY + 1, batW / 20 - 2, dH - 2)
        hg.endFill()
      }
    }
    setT(vw.big, raw[15] === 0 ? 'DESTROYED' : raw[15] === 2 ? 'FINISHED' : raw[14] > 0 ? `CRASH ${raw[14]}` : '')
    setS(vw.big, 'fill', raw[15] === 2 ? 0x5dff7a : 0xff4040)
    const place = raw[21]
    const suffix = place === 1 ? 'st' : place === 2 ? 'nd' : place === 3 ? 'rd' : 'th'
    setT(vw.pos, place ? `${place}${suffix}` : '')
    setS(vw.pos, 'fontSize', Math.round(Math.min(w, h) / 7))
    setS(vw.pos, 'fill', place === 1 ? 0xffd34d : 0xffffff)
    vw.pos.x = x + 20
    vw.pos.y = y + h - 12
    vw.big.x = cx
    vw.big.y = cy - h / 4
  }

  icon (gfx, type, cx, cy, size, on, frac) {
    const col = type === 1 ? 0x4da6ff : type === 3 ? 0xffe14d : type === 4 ? 0xff9d4d : 0xf0f0ff
    const s = size / 2
    const pts = []
    if (type >= 3) {
      const lw = on ? Math.max(2.5, size / 8.5) : Math.max(1.8, size / 13.5)
      const lc = on ? (type === 4 ? 0xff9d4d : 0xffffff) : 0x8899aa
      for (const dy of [-s * 0.55, 0, s * 0.55]) {
        gfx.lineStyle(lw, lc, on ? 1 : 0.7)
        gfx.moveTo(cx - s * 0.7, cy + dy + s * 0.3)
        gfx.lineTo(cx, cy + dy - s * 0.3)
        gfx.lineTo(cx + s * 0.7, cy + dy + s * 0.3)
      }
      if (frac > 0) {
        gfx.lineStyle(Math.max(3, size / 10), 0xffffff, 1)
        gfx.moveTo(cx, cy - s * 1.25)
        gfx.arc(cx, cy, s * 1.25, -Math.PI / 2, -Math.PI / 2 - 2 * Math.PI * frac, true)
        gfx.moveTo(cx, cy)
      }
      return
    } else if (type === 1) {
      pts.push(cx - s * 0.8, cy - s * 0.85, cx, cy - s, cx + s * 0.8, cy - s * 0.85, cx + s * 0.75, cy + s * 0.1)
      for (let k = 0; k <= 6; k++) {
        const a = k / 6
        pts.push(cx + s * 0.75 * (1 - a) * Math.cos(a * 1.2), cy + s * 0.1 + s * 0.9 * a)
      }
      for (let k = 6; k >= 0; k--) {
        const a = k / 6
        pts.push(cx - s * 0.75 * (1 - a) * Math.cos(a * 1.2), cy + s * 0.1 + s * 0.9 * a)
      }
      pts.push(cx - s * 0.75, cy + s * 0.1)
    } else {
      for (let k = 0; k <= 10; k++) {
        const a = Math.PI + Math.PI * k / 10
        pts.push(cx + Math.cos(a) * s * 0.75, cy - s * 0.15 + Math.sin(a) * s * 0.8)
      }
      pts.push(cx + s * 0.75, cy + s * 0.9)
      for (let k = 1; k <= 6; k++) pts.push(cx + s * 0.75 - k * s * 0.25, cy + s * (k % 2 === 1 ? 0.6 : 0.9))
    }
    gfx.lineStyle(Math.max(2, size / 14), on ? 0xffffff : 0x8899aa, on ? 1 : 0.7)
    gfx.beginFill(col, on ? 1 : 0)
    gfx.drawPolygon(pts)
    gfx.endFill()
    if (type === 2) {
      gfx.lineStyle(0)
      gfx.beginFill(on ? 0x0b1633 : 0x8899aa, on ? 1 : 0.7)
      gfx.drawCircle(cx - s * 0.28, cy - s * 0.2, s * 0.13)
      gfx.drawCircle(cx + s * 0.28, cy - s * 0.2, s * 0.13)
      gfx.endFill()
    }
    if (frac > 0) {
      gfx.lineStyle(Math.max(3, size / 10), col, 1)
      gfx.moveTo(cx, cy - s * 1.25)
      gfx.arc(cx, cy, s * 1.25, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * frac)
      gfx.moveTo(cx, cy)
    }
  }

  mapFrame () {
    if (this.mapBox && this.mapBox.g === this.g) return this.mapBox
    const xs = []
    const ys = []
    this.rings.forEach(r => { xs.push(r.c[0]); ys.push(r.c[1]) })
    ;(this.g.pylons || []).forEach(q => { xs.push(q[0] - q[2], q[0] + q[2]); ys.push(q[1] - q[2], q[1] + q[2]) })
    ;(this.g.cells || []).forEach(c => { xs.push(c[0]); ys.push(c[1]) })
    const m = 900
    const x0 = Math.min(...xs) - m
    const x1 = Math.max(...xs) + m
    const y0 = Math.min(...ys) - m
    const y1 = Math.max(...ys) + m
    const span = Math.max(x1 - x0, y1 - y0)
    const n = this.rings.length
    const pts = []
    for (let k = 0; k < n; k++) {
      const p0 = this.rings[(k - 1 + n) % n].c
      const p1 = this.rings[k].c
      const p2 = this.rings[(k + 1) % n].c
      const p3 = this.rings[(k + 2) % n].c
      for (let q = 0; q < 10; q++) {
        const t = q / 10
        pts.push([catmull(p0[0], p1[0], p2[0], p3[0], t), catmull(p0[1], p1[1], p2[1], p3[1], t)])
      }
    }
    this.mapBox = { g: this.g, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, span, spline: pts }
    return this.mapBox
  }

  minimap (gfx, mx, my, size, me, vw) {
    const box = this.mapFrame()
    const sc = size / box.span
    const px = X => mx + size / 2 + (X - box.cx) * sc
    const py = Y => my + size / 2 - (Y - box.cy) * sc
    const inset = size * 0.05
    const qx = X => Math.max(mx + inset, Math.min(mx + size - inset, px(X)))
    const qy = Y => Math.max(my + inset, Math.min(my + size - inset, py(Y)))
    const style = 1
    const ti = this.cur && this.cur.ti != null ? this.cur.ti : 0
    const t = this.progress == null ? 1 : this.progress
    gfx.lineStyle(2, 0x4de1ff, 0.45)
    gfx.beginFill(0x070b18, 0.62)
    gfx.drawRoundedRect(mx, my, size, size, size * 0.08)
    gfx.endFill()
    gfx.lineStyle(1, 0xff4dd2, 0.25)
    gfx.drawRoundedRect(mx + 4, my + 4, size - 8, size - 8, size * 0.07)
    const n = this.rings.length
    const unit = size / 200
    const sp = box.spline
    const [AX, AY] = this.g.arena
    const inX = X => px(X) >= mx + 2 && px(X) <= mx + size - 2
    const inY = Y => py(Y) >= my + 2 && py(Y) <= my + size - 2
    const ya = Math.max(my + 2, py(AY))
    const yb = Math.min(my + size - 2, py(0))
    const xa = Math.max(mx + 2, px(0))
    const xb = Math.min(mx + size - 2, px(AX))
    gfx.lineStyle(2 * unit, 0xff4dd2, 0.7)
    for (const X of [0, AX]) if (inX(X) && ya < yb) { gfx.moveTo(px(X), ya); gfx.lineTo(px(X), yb) }
    for (const Y of [0, AY]) if (inY(Y) && xa < xb) { gfx.moveTo(xa, py(Y)); gfx.lineTo(xb, py(Y)) }
    const path = (wd, col, al) => {
      gfx.lineStyle(wd, col, al)
      gfx.moveTo(px(sp[0][0]), py(sp[0][1]))
      for (let k = 1; k <= sp.length; k++) gfx.lineTo(px(sp[k % sp.length][0]), py(sp[k % sp.length][1]))
    }
    if (style === 0) {
      for (const [wd, al, col] of [[7 * unit, 0.15, 0x4de1ff], [2.2 * unit, 0.9, 0x9ff3ff]]) {
        gfx.lineStyle(wd, col, al)
        for (let gi = 0; gi < n; gi++) {
          const a = this.rings[gi].c
          const b = this.rings[(gi + 1) % n].c
          gfx.moveTo(px(a[0]), py(a[1]))
          gfx.lineTo(px(b[0]), py(b[1]))
        }
      }
    } else if (style === 1) {
      path(13 * unit, 0x4de1ff, 0.1)
      path(4.5 * unit, 0x9ff3ff, 0.5)
      for (let k = 5; k < sp.length; k += 10) {
        const a = sp[k]
        const b = sp[(k + 1) % sp.length]
        const dx = px(b[0]) - px(a[0])
        const dy = py(b[1]) - py(a[1])
        const l = Math.hypot(dx, dy) || 1
        const ux = dx / l
        const uy = dy / l
        const cxp = px(a[0])
        const cyp = py(a[1])
        const c = 4 * unit
        gfx.lineStyle(1.6 * unit, 0xffffff, 0.6)
        gfx.moveTo(cxp - ux * c - uy * c, cyp - uy * c + ux * c)
        gfx.lineTo(cxp, cyp)
        gfx.lineTo(cxp - ux * c + uy * c, cyp - uy * c - ux * c)
      }
    } else {
      path(15 * unit, 0x9ff3ff, 0.35)
      path(13 * unit, 0x1a2340, 0.95)
      for (let k = 0; k < sp.length; k += 2) {
        const a = sp[k]
        const b = sp[(k + 1) % sp.length]
        gfx.lineStyle(1.5 * unit, 0x9ff3ff, 0.6)
        gfx.moveTo(px(a[0]), py(a[1]))
        gfx.lineTo(px(b[0]), py(b[1]))
      }
    }
    const meD = this.drone(me)
    const next = meD ? meD.raw[10] : -1
    const timers = (this.cur && this.cur.c) || (this.last && this.last.c) || []
    ;(this.g.pylons || []).forEach(q => {
      const r = Math.max(2.5 * unit, q[2] * sc)
      gfx.lineStyle(0)
      gfx.beginFill(0xff9f40, 0.18)
      gfx.drawCircle(px(q[0]), py(q[1]), r * 1.8)
      gfx.endFill()
      gfx.lineStyle(1.6 * unit, 0xffb347, 1)
      gfx.beginFill(0x1c2640, 1)
      gfx.drawCircle(px(q[0]), py(q[1]), r)
      gfx.endFill()
    })
    ;(this.g.cells || []).forEach((cl, k) => {
      if (timers[k] > 0) return
      const type = cl[3] === 0 ? 3 : cl[3] === 1 ? 1 : 2
      this.icon(gfx, type, px(cl[0]), py(cl[1]), 11 * unit, true, -1)
    })
    this.rings.forEach((r, gi) => {
      const half = this.g.r[0] * 1.7
      if (Math.abs(r.n[2]) > 0.99) {
        const color = gi === next ? 0x5dff7a : gi === 0 ? 0xffd34d : 0x4de1ff
        gfx.lineStyle(gi === next ? 4.5 * unit : 3 * unit, color, gi === next ? 1 : 0.8)
        gfx.drawCircle(px(r.c[0]), py(r.c[1]), Math.max(4 * unit, this.g.r[0] * sc))
        return
      }
      const ax = px(r.c[0] - r.side[0] * half)
      const ay = py(r.c[1] - r.side[1] * half)
      const bx = px(r.c[0] + r.side[0] * half)
      const by = py(r.c[1] + r.side[1] * half)
      if (gi === 0) {
        for (let q = 0; q < 6; q++) {
          gfx.lineStyle(4 * unit, q % 2 ? 0x111111 : 0xffffff, 1)
          gfx.moveTo(ax + (bx - ax) * q / 6, ay + (by - ay) * q / 6)
          gfx.lineTo(ax + (bx - ax) * (q + 1) / 6, ay + (by - ay) * (q + 1) / 6)
        }
      } else {
        const color = gi === next ? 0x5dff7a : 0x4de1ff
        gfx.lineStyle(gi === next ? 4.5 * unit : 3 * unit, color, gi === next ? 1 : 0.8)
        gfx.moveTo(ax, ay)
        gfx.lineTo(bx, by)
      }
      if (gi === next) {
        const pulse = 0.5 + 0.5 * Math.sin((ti + t) * 1.6)
        gfx.lineStyle(1.5 * unit, 0x5dff7a, 0.25 + 0.35 * pulse)
        gfx.drawCircle(px(r.c[0]), py(r.c[1]), (6 + 3 * pulse) * unit)
      }
    })
    for (let j = 0; j < this.players.length; j++) {
      for (let k = 0; k < 4 && ti - k >= 1; k++) {
        const a = this.row(j, ti - k - 1)
        const b = this.row(j, ti - k)
        if (a[10] === b[10] || b[15] === 0) continue
        const g = this.rings[a[10]]
        const age = (k + t) / 4
        if (age >= 1) continue
        gfx.lineStyle(2.5 * unit * (1 - age), toColor(this.players[j].color), 1 - age)
        gfx.drawCircle(px(g.c[0]), py(g.c[1]), (5 + 14 * age) * unit)
      }
    }
    const pos = []
    for (let j = 0; j < this.players.length; j++) {
      const d = this.drone(j)
      if (!d) continue
      const col = d.raw[15] === 0 ? 0x666666 : toColor(this.players[j].color)
      let prev = d.p
      for (let b = 1; b <= 10 && ti - b >= 0; b++) {
        const q = this.row(j, ti - b)
        const fade = 1 - (b - 1) / 10
        gfx.lineStyle(2.2 * unit * fade, col, 0.75 * fade)
        gfx.moveTo(qx(prev[0]), qy(prev[1]))
        gfx.lineTo(qx(q[0]), qy(q[1]))
        prev = q
      }
      pos.push({ j, d, col })
    }
    for (const { j, d } of pos) {
      if (!d.raw[29]) continue
      let best = null
      let bd = 1e9
      for (const o of pos) {
        if (o.j === j) continue
        const dist = Math.hypot(o.d.p[0] - d.p[0], o.d.p[1] - d.p[1], o.d.p[2] - d.p[2])
        if (dist < bd) { bd = dist; best = o }
      }
      if (!best || bd > 2000) continue
      const ax = qx(d.p[0])
      const ay = qy(d.p[1])
      const bx = qx(best.d.p[0])
      const by = qy(best.d.p[1])
      for (let q = 0; q < 6; q += 2) {
        gfx.lineStyle(1.5 * unit, 0xffffff, 0.8)
        gfx.moveTo(ax + (bx - ax) * q / 6, ay + (by - ay) * q / 6)
        gfx.lineTo(ax + (bx - ax) * (q + 1) / 6, ay + (by - ay) * (q + 1) / 6)
      }
    }
    const ev = (this.cur && this.cur.e) || []
    for (const { j, d, col } of pos) {
      const x = qx(d.p[0])
      const y = qy(d.p[1])
      const h = Math.atan2(-d.f[1], d.f[0])
      const off = x !== px(d.p[0]) || y !== py(d.p[1])
      if (off) {
        const ang = Math.atan2(py(d.p[1]) - y, px(d.p[0]) - x)
        const ax = x + Math.cos(ang) * 9 * unit
        const ay = y + Math.sin(ang) * 9 * unit
        gfx.lineStyle(0)
        gfx.beginFill(col, 0.9)
        gfx.drawPolygon([ax + Math.cos(ang) * 4 * unit, ay + Math.sin(ang) * 4 * unit,
          ax + Math.cos(ang + 2.3) * 3.5 * unit, ay + Math.sin(ang + 2.3) * 3.5 * unit,
          ax + Math.cos(ang - 2.3) * 3.5 * unit, ay + Math.sin(ang - 2.3) * 3.5 * unit])
        gfx.endFill()
      }
      const fadeOff = off ? 0.5 : 1
      if (d.raw[26]) {
        gfx.lineStyle(3 * unit, 0xffb300, 0.9)
        gfx.moveTo(x, y)
        gfx.lineTo(x - Math.cos(h) * 14 * unit, y - Math.sin(h) * 14 * unit)
      }
      if (ev.some(e => (e[0] === j || e[1] === j) && e[10] === 1)) {
        for (let q = 0; q < 8; q++) {
          const a = q * Math.PI / 4 + 0.3
          gfx.lineStyle(2 * unit, 0xff7a1a, 1)
          gfx.moveTo(x + Math.cos(a) * 4 * unit, y + Math.sin(a) * 4 * unit)
          gfx.lineTo(x + Math.cos(a) * 11 * unit, y + Math.sin(a) * 11 * unit)
        }
      }
      const big = j === me
      const arm = (big ? 6 : 4.6) * unit
      const rr = (big ? 2.6 : 2) * unit
      for (const da of [Math.PI / 4, 3 * Math.PI / 4, 5 * Math.PI / 4, 7 * Math.PI / 4]) {
        const ex = x + Math.cos(h + da) * arm
        const ey = y + Math.sin(h + da) * arm
        gfx.lineStyle(1.2 * unit, big ? 0xffffff : 0xc9d0d8, fadeOff)
        gfx.moveTo(x, y)
        gfx.lineTo(ex, ey)
        gfx.lineStyle(1.2 * unit, big ? 0xffffff : col, fadeOff)
        gfx.beginFill(col, 0.85 * fadeOff)
        gfx.drawCircle(ex, ey, rr)
        gfx.endFill()
      }
      gfx.lineStyle(0)
      gfx.beginFill(big ? 0xffffff : col, fadeOff)
      gfx.drawCircle(x, y, (big ? 2.4 : 1.8) * unit)
      gfx.endFill()
    }
    if (vw && vw.mapT) {
      vw.mapT.forEach((tx, k) => {
        const it = pos[k]
        if (!it) { setT(tx, ''); return }
        setT(tx, String(it.d.raw[21]))
        setS(tx, 'fontSize', Math.max(10, Math.round(10 * unit)))
        tx.x = qx(it.d.p[0]) + 7 * unit
        tx.y = qy(it.d.p[1]) - 13 * unit
      })
    }
  }
}
