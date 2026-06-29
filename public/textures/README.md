# Textures

Hybrid PBR: real photo textures on hero surfaces only (concrete, steppe, metal);
everything else is procedural. Loaded by `lib/textures.tsx` (`usePbrMaterial` / `<PbrMaterial>`).

## Layout

Each set is a directory of same-named maps:

```
<set>/
  albedo.jpg      # base colour   (sRGB)
  normal.jpg      # OpenGL normal (linear)
  roughness.jpg   # roughness     (linear)
  ao.jpg          # optional ambient occlusion (linear; needs geometry.uv2)
```

## Current sets (CC0, from ambientCG)

| set                  | source       | size  | maps                      |
|----------------------|--------------|-------|---------------------------|
| `concrete-foundation`| Concrete034  | 1024² | albedo, normal, roughness |
| `steppe-grass`       | Grass004     | 512²  | albedo, normal, roughness |
| `brushed-metal`      | Metal032     | 512²  | albedo, normal, roughness |

All sourced from https://ambientcg.com (CC0), downsized + recompressed (mozjpeg) to
keep the total payload ~0.5 MB. No AO maps yet (Concrete034 ships none).

## Tier degradation

`hooks/use-gpu-tier.ts` → `QualityConfig.textureMaps` decides what loads:
ultra/high = all maps · medium = albedo + roughness · low/fallback = none (flat material).

## Deferred: KTX2 / Basis

`usePbrMaterial` accepts `ext: "ktx2"` and the drei `useKTX2` path exists, but there is
no `toktx`/`basisu` converter on this machine yet, so we ship JPG. To upgrade later:
copy `node_modules/three/examples/jsm/libs/basis/` → `public/basis/`, convert each map
(`toktx --t2 --encode uastc` for normals, `etc1s` for the rest), and switch the loader's
default `ext` to `"ktx2"`. GPU-compressed KTX2 stays small in VRAM — worth it once larger
or more sets are added.
