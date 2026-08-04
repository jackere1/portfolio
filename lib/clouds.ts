// The cloud field, defined ONCE.
//
// The sky dome draws this deck and the ground is shadowed by it, and if those
// two ever sample different fields the shadows fall in the wrong places — which
// is worse than having no shadows at all, because the eye reads a cloud and
// then reads a shadow that does not belong to it.
//
// So both read this string. The sky projects a view ray onto the deck; the
// ground projects itself up the sun direction onto the same deck. Same noise,
// same scale, same drift.

/** Height of the deck, in metres. Fair-weather cumulus base over a summer
 *  steppe sits around here, and it sets how far a shadow is displaced from the
 *  cloud that casts it. */
export const CLOUD_DECK_HEIGHT = 2200

/** How much light a cloud takes away. Never all of it — the sky is still up
 *  there, so ground under cloud goes dim and blue, not black. */
export const CLOUD_SHADOW_STRENGTH = 0.62

export const CLOUD_GLSL = /* glsl */ `
  uniform float uCloudCover;
  uniform float uCloudTime;

  float cloudHash12(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * 0.1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }

  float cloudNoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(cloudHash12(i), cloudHash12(i + vec2(1.0, 0.0)), f.x),
      mix(cloudHash12(i + vec2(0.0, 1.0)), cloudHash12(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float cloudFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) {
      v += a * cloudNoise2(p);
      p = p * 2.03 + vec2(17.3, -9.1);
      a *= 0.5;
    }
    return v;
  }

  /** Deck coordinate -> cloud thickness in 0..1. The deck coordinate is the
   *  point on the ceiling divided by the ceiling's height, which is exactly
   *  what a view ray's xz/y already is — so the sky and the ground agree
   *  without either of them knowing about the other. */
  float cloudThickness(vec2 deck) {
    vec2 cp = deck * 2.1 + uCloudTime * vec2(0.016, 0.007);
    float n = cloudFbm(cp);
    n += (cloudFbm(cp * 4.3) - 0.5) * 0.16;
    float edge = 1.0 - uCloudCover;
    return clamp((n - edge) / 0.30, 0.0, 1.0);
  }
`

/** GLSL for the receiving end: how much sun reaches a world position. */
export const CLOUD_SHADOW_GLSL = /* glsl */ `
  uniform vec3  uCloudSunDir;
  uniform float uCloudDeckH;
  uniform float uCloudShadow;

  float cloudShadowAt(vec3 worldPos) {
    // Walk up the sun direction to the deck. Below a few degrees the ray lies
    // down nearly flat and the displacement runs away to the horizon, so the
    // shadow is faded out rather than allowed to smear across the whole world.
    float sy = uCloudSunDir.y;
    float grazing = smoothstep(0.02, 0.16, sy);
    if (grazing <= 0.001) return 1.0;

    float t = (uCloudDeckH - worldPos.y) / max(sy, 0.02);
    vec2 hit = worldPos.xz + uCloudSunDir.xz * t;
    float thick = cloudThickness(hit / uCloudDeckH);

    float shade = smoothstep(0.0, 0.35, thick);
    return 1.0 - shade * uCloudShadow * grazing;
  }
`
