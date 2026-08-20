#!/usr/bin/env node
/**
 * Generates the OxeeUI marks from the Oxeegen geometry.
 *
 * The mark is one circle cut by vertical entailles and horizontal entrefers.
 * Every void is the same width, which is what keeps the family tied to the
 * parent mark rather than reading as a pattern laid over it.
 *
 * Pieces are emitted as exact outlines (arc + line segments) rather than a
 * clipped circle, because the light edge has to run along the straight cuts
 * too — a clip would strip the stroke from exactly those sides.
 *
 * Usage: node brand/scripts/generate-marks.mjs
 */

import { writeFileSync } from 'node:fs'

const CX = 512,
  CY = 512,
  R = 450
const TOP = CY - R,
  BOT = CY + R,
  L = CX - R,
  RT = CX + R
const D = 2 * R

// Proportions measured on the Oxeegen mark, as fractions of the diameter.
const ARC = 0.303 * D
const ENTAILLE = 0.122 * D
const BAR = 0.149 * D
const ENTREFER = 38

const COL = { light: '#7742F9', base: '#5A21F2', deep: '#4A11DC', edge: '#BFA9FF' }

const LEFT_X = [L, L + ARC]
const CENTER_X = [L + ARC + ENTAILLE, L + ARC + ENTAILLE + BAR]
const RIGHT_X = [RT - ARC, RT]

/** Two horizontal bands with `topFrac` of the usable height above the entrefer. */
function bands(topFrac, gap = ENTREFER) {
  const a = (D - gap) * topFrac
  return [
    [TOP, TOP + a],
    [TOP + a + gap, BOT]
  ]
}

const rect = (x, [y0, y1]) => ({ x0: x[0], x1: x[1], y0, y1 })

const MARKS = {
  // Chosen direction: long band top-left and bottom-right, so the diagonal runs
  // with the gloss instead of against it.
  icon: [
    ...bands(2 / 3).map((b) => rect(LEFT_X, b)),
    rect(CENTER_X, [-10, 1034]),
    ...bands(1 / 3).map((b) => rect(RIGHT_X, b))
  ],
  // Small-size mark: the parent's three slices, which survive 16px where the
  // banded version closes up.
  logo: [rect(LEFT_X, [-10, 1034]), rect(CENTER_X, [-10, 1034]), rect(RIGHT_X, [-10, 1034])]
}

const EPS = 1e-7
const at = (t) => ({ x: CX + R * Math.cos(t), y: CY + R * Math.sin(t) })
const within = (p, r) =>
  p.x >= r.x0 - EPS && p.x <= r.x1 + EPS && p.y >= r.y0 - EPS && p.y <= r.y1 + EPS
const n = (v) => Math.round(v * 1000) / 1000

/** Angles where the circle crosses the rect boundary, refined by bisection. */
function crossings(r) {
  const STEPS = 8192
  const out = []
  let prev = within(at(0), r)
  for (let i = 1; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2
    const cur = within(at(t), r)
    if (cur !== prev) {
      let lo = ((i - 1) / STEPS) * Math.PI * 2
      let hi = t
      for (let k = 0; k < 60; k++) {
        const mid = (lo + hi) / 2
        if (within(at(mid), r) === prev) {
          lo = mid
        } else {
          hi = mid
        }
      }
      out.push({ t: (lo + hi) / 2, entering: cur })
      prev = cur
    }
  }
  return out.sort((a, b) => a.t - b.t)
}

/** Clockwise perimeter position, starting at the top-right corner. */
function perim(p, r) {
  const w = r.x1 - r.x0,
    h = r.y1 - r.y0
  if (Math.abs(p.x - r.x1) < 1e-6) {
    return p.y - r.y0
  }
  if (Math.abs(p.y - r.y1) < 1e-6) {
    return h + (r.x1 - p.x)
  }
  if (Math.abs(p.x - r.x0) < 1e-6) {
    return h + w + (r.y1 - p.y)
  }
  return 2 * h + w + (p.x - r.x0)
}

function cornersBetween(from, to, r) {
  const w = r.x1 - r.x0,
    h = r.y1 - r.y0,
    total = 2 * (w + h)
  const marks = [
    { s: 0, p: { x: r.x1, y: r.y0 } },
    { s: h, p: { x: r.x1, y: r.y1 } },
    { s: h + w, p: { x: r.x0, y: r.y1 } },
    { s: 2 * h + w, p: { x: r.x0, y: r.y0 } }
  ]
  const span = (to - from + total) % total
  return marks
    .map((c) => ({ ...c, d: (c.s - from + total) % total }))
    .filter((c) => c.d > 1e-6 && c.d < span - 1e-6)
    .sort((a, b) => a.d - b.d)
    .map((c) => c.p)
}

function outline(r) {
  const xs = crossings(r)
  if (xs.length === 0) {
    // No boundary crossing: either the disk is wholly inside the rect, or the
    // rect is wholly inside the disk.
    if (within(at(0), r)) {
      const a = at(0),
        b = at(Math.PI)
      return `M ${n(a.x)} ${n(a.y)} A ${R} ${R} 0 0 1 ${n(b.x)} ${n(b.y)} A ${R} ${R} 0 0 1 ${n(a.x)} ${n(a.y)} Z`
    }
    const c = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 }
    if (Math.hypot(c.x - CX, c.y - CY) > R) {
      return null
    }
    return `M ${n(r.x0)} ${n(r.y0)} L ${n(r.x1)} ${n(r.y0)} L ${n(r.x1)} ${n(r.y1)} L ${n(r.x0)} ${n(r.y1)} Z`
  }

  const start = xs.findIndex((c) => c.entering)
  const parts = []
  for (let k = 0; k < xs.length; k += 2) {
    const enter = xs[(start + k) % xs.length]
    const leave = xs[(start + k + 1) % xs.length]
    const a = at(enter.t),
      b = at(leave.t)
    const sweep = (leave.t - enter.t + Math.PI * 2) % (Math.PI * 2)
    parts.push(
      `${k === 0 ? `M ${n(a.x)} ${n(a.y)}` : `L ${n(a.x)} ${n(a.y)}`} A ${R} ${R} 0 ${sweep > Math.PI ? 1 : 0} 1 ${n(b.x)} ${n(b.y)}`
    )
    const next = xs[(start + k + 2) % xs.length]
    for (const c of cornersBetween(perim(b, r), perim(at(next.t), r), r)) {
      parts.push(`L ${n(c.x)} ${n(c.y)}`)
    }
  }
  return `${parts.join(' ')} Z`
}

function svg(name, { mono }) {
  const paths = MARKS[name].map(outline).filter(Boolean)
  const d = paths.map((p) => `    <path d="${p}"/>`).join('\n')
  if (mono) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img">
  <g fill="#fff">
${d}
  </g>
</svg>
`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" role="img">
  <defs>
    <linearGradient id="${name}-fill" x1="0.1" y1="0" x2="0.75" y2="1">
      <stop offset="0" stop-color="${COL.light}"/>
      <stop offset="0.55" stop-color="${COL.base}"/>
      <stop offset="1" stop-color="${COL.deep}"/>
    </linearGradient>
    <clipPath id="${name}-gloss">
      <path d="M0 800 C 280 720 690 540 1024 404 L1024 0 L0 0 Z"/>
    </clipPath>
  </defs>
  <g fill="url(#${name}-fill)">
${d}
  </g>
  <g clip-path="url(#${name}-gloss)" fill="#fff" opacity="0.14">
${d}
  </g>
  <g fill="none" stroke="${COL.edge}" stroke-width="6.5" stroke-linejoin="round">
${d}
  </g>
</svg>
`
}

for (const name of Object.keys(MARKS)) {
  writeFileSync(`brand/assets/${name}.svg`, svg(name, { mono: false }))
  writeFileSync(`brand/assets/${name}-mono.svg`, svg(name, { mono: true }))
}
console.log('entaille', n(ENTAILLE), '· entrefer', ENTREFER, '· arc', n(ARC), '· barre', n(BAR))
console.log(
  'bandes gauche',
  bands(2 / 3)
    .map(([a, b]) => n(b - a))
    .join(' / ')
)
console.log(
  'bandes droite',
  bands(1 / 3)
    .map(([a, b]) => n(b - a))
    .join(' / ')
)
console.log('wrote brand/assets/{icon,logo}{,-mono}.svg')
