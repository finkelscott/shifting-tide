// A raymarched monochrome ocean with film grain, after the backdrop on
// earendil.com, itself built on afl_ext's "Very fast procedural ocean"
// (MIT License, 2017-2024). Rewritten for the claude-code/shader language.
import {
  abs, atan, buffer, clamp, dot, dt, exp, floor, fract, length, max, min, mix,
  normalize, picture, pointers, pow, scene, shader, sin, cos, size, smoothstep,
  sqrt, step, table, time, vec2, vec3, vec4,
} from 'claude-code/shader'
import type { Buffer } from 'claude-code/shader'

// Per octave: direction * frequency (x, y), time multiplier, weight.
const OCT_A = table([
  [-0.08547, 0.996341, 2, 1], [0.58159, 1.02672, 2.14, 0.8],
  [1.310331, 0.470969, 2.2898, 0.64], [1.042729, -1.269752, 2.450086, 0.512],
  [-1.599003, -1.09638, 2.621592, 0.4096], [-2.212568, 0.581703, 2.805103, 0.32768],
  [-1.698544, 2.098224, 3.001461, 0.262144], [-0.302457, 3.171082, 3.211563, 0.209715],
  [1.820089, 3.288814, 3.436372, 0.167772], [4.154544, 1.553387, 3.676918, 0.134218],
  [3.426197, -3.95654, 3.934303, 0.107374], [-5.036149, -3.574809, 4.209704, 0.085899],
] as const)
// Per octave: direction * drag (x, y), footprint limit, fade scale.
const OCT_C = table([
  [-0.032479, 0.378609, 3.769911, 0.397887], [0.187292, 0.330639, 3.19484, 0.469507],
  [0.357602, 0.128532, 2.707492, 0.554018], [0.241162, -0.293668, 2.294484, 0.653742],
  [-0.313404, -0.21489, 1.944478, 0.771415], [-0.367511, 0.096622, 1.647863, 0.91027],
  [-0.239094, 0.295354, 1.396494, 1.074118], [-0.03608, 0.378283, 1.183469, 1.26746],
  [0.184001, 0.332481, 1.00294, 1.495603], [0.355934, 0.133084, 0.849949, 1.764811],
  [0.248757, -0.287263, 0.720296, 2.082477], [-0.30987, -0.219955, 0.61042, 2.457323],
] as const)

const MEAN = 0.4657596
const WATER_TOP = 0.6
const WATER_BOTTOM = -1.4
const CAM_H = 1.5
const PROJ = 1.5
const TILT_C = cos(0.14)
const TILT_S = sin(0.14)
const SUN = normalize(vec3(-0.0773503, 0.6, 0.5773503))
const HORIZON_GLOW = vec3(0.03, 0.035, 0.05)

const swell = (p: vec2): number => {
  const phase = dot(p, vec2(-0.2425356, 0.9701425)) * 0.18 - time * 0.08
  const fade = smoothstep(28, 4, length(p - vec2(time * 0.2, 1)))
  return sin(phase) * fade * 0.35
}

// Sum of exp(sin) octaves with domain drag; octaves finer than the pixel's
// footprint fade out so distant water does not alias.
const waves4 = (p0: vec2, footprint: number): number => {
  let p = vec2(p0)
  const shift = length(p0) * 0.1
  let sum = 0
  for (let i = 0; i < 4; i++) {
    const a = OCT_A.at(i)
    const c = OCT_C.at(i)
    if (footprint >= c.z) break
    const f = min((c.z - footprint) * c.w, 1) * a.w
    const x = dot(p, a.xy) + time * a.z + shift
    const e = exp(sin(x) - 1)
    sum += (e - MEAN) * f
    p = vec2(p - c.xy * (e * cos(x) * f))
  }
  return MEAN + sum * 0.3387534 + swell(p0)
}

const waves12 = (p0: vec2, footprint: number): number => {
  let p = vec2(p0)
  const shift = length(p0) * 0.1
  let sum = 0
  for (let i = 0; i < 12; i++) {
    const a = OCT_A.at(i)
    const c = OCT_C.at(i)
    if (footprint >= c.z) break
    const f = min((c.z - footprint) * c.w, 1) * a.w
    const x = dot(p, a.xy) + time * a.z + shift
    const e = exp(sin(x) - 1)
    sum += (e - MEAN) * f
    p = vec2(p - c.xy * (e * cos(x) * f))
  }
  return MEAN + sum * 0.2147581 + swell(p0)
}

const marchHeight = (p: vec2, fp: number): number => waves4(p, fp) - 1

const atmosphere = (r: vec3): vec3 => {
  const t1 = 1 / (r.y + 0.1)
  const t2 = 1 / (SUN.y * 11 + 1)
  const rs = pow(abs(dot(SUN, r)), 2)
  const sunColor = vec3(mix(vec3(1), max(vec3(0), vec3(1) - vec3(5.5, 13, 22.4) / 22.4), t2))
  const blue = vec3(vec3(12, 12, 13) / 22.4 * sunColor)
  let blue2 = vec3(max(vec3(0), blue - vec3(12, 12, 13) * 0.002 * (t1 - 6 * SUN.y * SUN.y)))
  blue2 = vec3(blue2 * t1 * (0.24 + rs * 0.24))
  return vec3(blue2 * (1 + pow(1 - r.y, 3)) * 0.5)
}

const nightSky = (r: vec3): vec3 => {
  const c = vec3(mix(vec3(0.03, 0.035, 0.05), vec3(0.015, 0.02, 0.04), clamp(r.y * 0.5 + 0.5, 0, 1)))
  return vec3(c + HORIZON_GLOW * exp(-max(r.y, 0) * 9))
}

// Stars are held still, like the grain below. A point that swings between
// light and dark is exactly what the renderer freezes a shader for.
const STAR_SCALE = 48
const starField = (r: vec3): number => {
  // Keyed to azimuth and altitude, so the field sits in the sky dome instead of
  // swimming sideways as the camera tracks along the swell.
  const cell = vec2(vec2(atan(r.x, r.z), r.y) * STAR_SCALE)
  const id = vec2(floor(cell))
  const f = vec2(cell - id)
  const h1 = fract(sin(dot(id, vec2(12.9898, 78.233))) * 43758.5453)
  const h2 = fract(sin(dot(id, vec2(39.3468, 11.1357))) * 24634.6345)
  const h3 = fract(sin(dot(id, vec2(73.1562, 52.7631))) * 31415.9265)
  const h4 = fract(sin(dot(id, vec2(26.6519, 63.8142))) * 18927.4271)
  // Density is drawn from a much coarser grid, so the field gathers into groups
  // with darker lanes between them rather than scattering evenly. This is what
  // makes it read as constellations instead of noise.
  const patch = vec2(floor(vec2(cell * 0.16)))
  const drift = fract(sin(dot(patch, vec2(45.233, 17.879))) * 9471.3129)
  const present = step(mix(0.95, 0.74, drift), h1)
  const centre = vec2(0.15 + h2 * 0.7, 0.15 + h3 * 0.7)
  // Pinpricks. The core is about two device pixels across; going much below
  // that and a static point starts to drop out between pixels entirely.
  const d = length(vec2(f - centre))
  const core = pow(1 - smoothstep(0, 0.09, d), 2) + 0.14 * pow(1 - smoothstep(0, 0.22, d), 3)
  // Many faint, a few bright, and none through the horizon haze.
  const mag = 0.3 + h4 * 0.7
  return present * core * mag * mag * smoothstep(0.015, 0.2, r.y)
}

// Smooth value noise on a hashed lattice: the lattice corners are hashed the
// same way as the stars, then blended with a smootherstep weight.
const lattice = (p: vec2): number => fract(sin(dot(p, vec2(27.619, 57.583))) * 43758.5453)

const vnoise = (p: vec2): number => {
  const i = vec2(floor(p))
  const f = vec2(p - i)
  const w = vec2(f * f * (3 - f * 2))
  const a = lattice(i)
  const b = lattice(vec2(i + vec2(1, 0)))
  const c = lattice(vec2(i + vec2(0, 1)))
  const e = lattice(vec2(i + vec2(1, 1)))
  return mix(mix(a, b, w.x), mix(c, e, w.x), w.y)
}

// A thin deck of cloud for the day sky. Three octaves, thresholded into a few
// soft shapes rather than an even overcast, and drifting slowly enough that it
// never reads as motion against the waves.
const cloudField = (r: vec3): number => {
  // 1/height flattens the dome, so shapes stretch toward the horizon the way a
  // real cloud deck does when you look along it instead of up at it.
  const p = vec2(vec2(atan(r.x, r.z) * 2.2, 0.5 / max(r.y, 0.06)) + vec2(time * 0.004, 0))
  let n = 0
  let amp = 0.5
  let q = vec2(p)
  for (let i = 0; i < 3; i++) {
    n += vnoise(q) * amp
    q = vec2(q * 2.02)
    amp = amp * 0.5
  }
  // Three octaves at halving amplitude average about 0.44, so the carve has to
  // sit near that to form shapes at all; 0.5 upward left almost nothing.
  // Held off the horizon, where the haze band already sits.
  return smoothstep(0.42, 0.62, n) * smoothstep(0.04, 0.24, r.y)
}

// ACES fitted, written out lane by lane (column-major as in the original).
const aces = (c: vec3): vec3 => {
  const v = vec3(
    0.59719 * c.x + 0.35458 * c.y + 0.04823 * c.z,
    0.076 * c.x + 0.90834 * c.y + 0.01566 * c.z,
    0.0284 * c.x + 0.13383 * c.y + 0.83777 * c.z,
  )
  const a = vec3(v * (v + 0.0245786) - 0.000090537)
  const b = vec3(v * (0.983729 * v + 0.432951) + 0.238081)
  const q = vec3(a / b)
  const o = vec3(
    1.60475 * q.x - 0.53108 * q.y - 0.07367 * q.z,
    -0.10208 * q.x + 1.10813 * q.y - 0.00605 * q.z,
    -0.00327 * q.x - 0.07276 * q.y + 1.07602 * q.z,
  )
  return vec3(pow(clamp(o, 0, 1), vec3(1 / 2.2)))
}

// Pointer heat, after the backdrop on radar.cloudflare.com: a gaussian splat
// under each pointer over a frame-to-frame decay, so the field lags the cursor
// instead of tracking it rigidly. Radar ping-pongs two targets; one
// self-reading buffer does the same work here.
// The splat is laid at four points along the travel since the last frame: at 30
// fps a quick sweep crosses hundreds of points, and a single splat per frame
// leaves a dotted trail rather than a stroke.
// Two lobes, as Radar's shader has a core over a wider presence: one gaussian
// alone at this size reads as a smudge with no centre to it.
const HEAT_CORE = 20
const HEAT_HALO = 55
const HEAT_CORE_W = 0.7
const HEAT_DECAY = 3
// Deposit per second at the centre. A resting pointer settles where deposit
// meets decay, at GAIN / DECAY, so keep their ratio under 1 or the blob clips
// to flat and stops reading as a falloff at all.
const HEAT_GAIN = 3.3
const HEAT_SPLATS = 4

// Peaks at 1, so GAIN stays the centre's deposit rate whatever the lobe mix.
const heatFalloff = (d: number): number =>
  exp(-(d * d) / (2 * HEAT_CORE * HEAT_CORE)) * HEAT_CORE_W +
  exp(-(d * d) / (2 * HEAT_HALO * HEAT_HALO)) * (1 - HEAT_CORE_W)
const heat: Buffer = buffer({ scale: 0.5, float: 16, filter: 'linear' }, p => {
  let h = heat.sample(p.uv).x * exp(-dt * HEAT_DECAY)
  for (const ptr of pointers) {
    // A lifted pointer keeps depositing for up to a second, fading as it goes.
    const fade = clamp(1 - ptr.gone, 0, 1)
    // Split across the splats, so a sweep spreads one pointer's worth of heat
    // along the stroke instead of depositing four times over.
    for (let i = 0; i < HEAT_SPLATS; i++) {
      const q = vec2(mix(ptr.was, ptr.at, i / (HEAT_SPLATS - 1)))
      const d = length(vec2(p.point - q))
      h = h + (heatFalloff(d) * fade * dt * HEAT_GAIN) / HEAT_SPLATS
    }
  }
  return vec4(clamp(h, 0, 1), 0, 0, 1)
})

const ocean = picture(px => {
  // The Svg under the shader paints its top-left corner light or dark with the
  // app's mode; reading it tells the shader whether it is night.
  const probe = scene.sample(vec2(0.002, 0.998))
  const night = 1 - smoothstep(0.25, 0.55, dot(probe.rgb, vec3(0.299, 0.587, 0.114)))

  const aspect = size.x / max(size.y, 1)
  const uv = vec2((px.uv * 2 - 1) * vec2(aspect, 1))
  const proj = normalize(vec3(uv.x, uv.y, PROJ))
  const ray = vec3(proj.x, TILT_C * proj.y + TILT_S * proj.z, TILT_C * proj.z - TILT_S * proj.y)

  const daySky = (r: vec3): vec3 => atmosphere(r)
  const sky = (r: vec3): vec3 => vec3(mix(daySky(r), nightSky(r), night))

  let C = vec3(0)
  let tonedBoost = 2
  if (ray.y >= 0) {
    // The direct sky alone. Reflected, a point this bright meets a moving
    // normal and reads as a sparkle, which is the flicker that stops a shader.
    // Stars by night, cloud by day, each fading as the other comes in. Both ride
    // the direct sky only: reflected off moving water they shimmer.
    // Cloud DARKENS the sky rather than brightening it. In light mode the final
    // output lands in mix(0.62, 0.97) and the sky already sits high in that
    // band, so a brighter cloud has no headroom and reads as nothing at all.
    const lit = vec3(sky(ray) + vec3(starField(ray) * night * 1.7))
    C = vec3(mix(lit, vec3(lit * 0.5), cloudField(ray) * (1 - night)))
  } else {
    const origin = vec3(time * 0.2, CAM_H, 1)
    const dy = min(ray.y, -0.0001)
    const tNear = (origin.y - WATER_TOP) / -dy
    const tFar = min((origin.y - WATER_BOTTOM) / -dy, 400)
    const pixelAngle = 2 / (PROJ * max(size.y, 1))
    const lod = pixelAngle / sqrt(max(-dy, 0.01))

    // March between the bounding planes, then one regula falsi step.
    const stepScale = 1 / (0.25 - dy)
    let t = tNear
    let a = tNear
    let gapA = 0
    let gapB = 0
    let hit = 0
    for (let i = 0; i < 14; i++) {
      const p = vec3(origin + ray * t)
      const gap = p.y - marchHeight(p.xz, t * lod)
      if (gap < 0) {
        gapB = gap
        break
      }
      if (gap < 0.25 * t * lod * -dy) {
        hit = 1
        break
      }
      a = t
      gapA = gap
      t = t + gap * stepScale
      if (t >= tFar) {
        t = tFar
        hit = 1
        break
      }
    }
    let dist = t
    if (hit < 0.5 && gapB < 0) {
      const den = gapA - gapB
      dist = mix(a, t, gapA / max(den, 0.0001))
    }

    const hitPos = vec3(origin + ray * dist)
    const footprint = dist * lod
    const blend = min(1, sqrt(dist * 0.01) * 1.1)
    const e = max(0.01, dist * pixelAngle)
    const H = waves12(hitPos.xz, footprint)
    const hx = waves12(vec2(hitPos.xz - vec2(e, 0)), footprint)
    const hz = waves12(vec2(hitPos.xz + vec2(0, e)), footprint)
    let N = normalize(vec3(hx - H, e, H - hz))
    N = normalize(vec3(mix(N, vec3(0, 1, 0), 0.45 * blend)))

    const fSharp = 0.04 + 0.96 * pow(1 - max(0, dot(-N, ray)), 5)
    const fFlat = 0.04 + 0.96 * pow(1 - max(0, -dy), 5)
    const fresnel = mix(fSharp, fFlat, 0.5 * blend)

    let R = vec3(ray - N * (2 * dot(N, ray)))
    R.y = abs(R.y)
    const reflection = sky(R)
    const scatterBase = vec3(mix(vec3(0.08, 0.08, 0.09), vec3(0.02, 0.02, 0.03), night))
    const scattering = vec3(scatterBase * (0.2 + (hitPos.y + 1)))
    C = vec3(reflection * fresnel + scattering)

    const fog = vec3(mix(vec3(0.55, 0.55, 0.58), vec3(0.03, 0.035, 0.05) + HORIZON_GLOW, night))
    C = vec3(mix(C, fog, 1 - exp(-dist * 0.02)))
    tonedBoost = mix(1.4, 1.9, night)
  }
  const toned = aces(vec3(C * tonedBoost))

  // Monochrome film grain, held still so it never flickers.
  let gray = dot(toned, vec3(0.299, 0.587, 0.114))

  // The heat reads as a lift by night and a shadow by day, for the same reason
  // the cloud does: in light mode the output lands in mix(0.62, 0.97), and the
  // sky already sits high in that band, so brightening it has no headroom.
  // A gaussian's tail is most of its area, which is what reads as a smudge.
  // Radar gets its edge from quantising the field into stripe bands; with no
  // stripes here, a response curve does the same job: everything under 0.22 is
  // discarded and the ramp above it is short, so the halo ends somewhere
  // instead of fading forever.
  const warmth = smoothstep(0.22, 0.6, clamp(heat.sample(px.uv).x, 0, 1))
  gray = clamp(mix(gray - warmth * gray, gray + warmth * (1 - gray), night), 0, 1)

  const n = fract(sin(dot(px.pixel, vec2(12.9898, 78.233))) * 43758.5453)
  const variance = mix(0.75, 0.6, night)
  const o = variance * variance
  const g = (1 / (o * 2.5066)) * exp(-(n * n) / (2 * o * o))
  gray = clamp(gray + g * (1 - gray) * mix(0.4, 0.065, night), 0, 1)
  const dark = mix(0.62, 0.05, night)
  const light = mix(0.97, 1, night)
  return vec4(vec3(mix(dark, light, gray)), 1)
})

export default shader({ fps: 30, passes: [heat, ocean] })
