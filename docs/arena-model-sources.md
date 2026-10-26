# Actual weapon assets and entrance-label font

## Kenney Blaster Kit 2.1

The harness equipment uses eight actual glTF binary models from the official
[Kenney Blaster Kit](https://kenney.nl/assets/blaster-kit), downloaded on
2026-10-25 from the pack's
[official version 2.1 archive](https://kenney.nl/media/pages/assets/blaster-kit/261d80a716-1753959510/kenney_blaster-kit_2.1.zip).
The source page and included license identify the pack as Creative Commons Zero
(CC0). The original license is preserved in
`assets/models/kenney-blasters/LICENSE.txt`. The models and shared texture are
copied byte-for-byte; `sources.json` records their SHA-256 hashes and file sizes.

The full pack overview and each selected silhouette were inspected before
mapping. The eight imported models were then rendered together in Chromium to
verify their actual geometry, materials and orientation. These are imported 3D
assets, not new box-shaped approximations of the source models.

| Harness | Original model | Distinct silhouette | Triangles |
| --- | --- | --- | ---: |
| DeepSeek Harness | `blaster-q.glb` | Split-prong front | 602 |
| DeepAgents | `blaster-f.glb` | Scoped precision blaster | 768 |
| Claude Code | `blaster-e.glb` | Long barrel and open stock | 802 |
| Codex CLI | `blaster-d.glb` | Stocked carbine and carry rail | 486 |
| OpenCode | `blaster-p.glb` | Three separate barrels | 882 |
| OpenHands SDK | `blaster-l.glb` | Broad twin-barrel front | 450 |
| Terminus-2 | `blaster-m.glb` | Heavy cylindrical body | 440 |
| mini-SWE-agent | `blaster-b.glb` | Compact handle-and-loop blaster | 368 |

All eight models total 447,052 bytes and 4,798 triangles. Their one shared local
`Textures/colormap.png` is 10,223 bytes. The asset choices are visual identities;
they do not rank the harnesses or imply author endorsement. The user-selected
presentation mounts the active harness weapon on the agent's back. The scene
renderer owns that mounting transform.

## Loader API and normalization

`v2/arena-models.js` exports `ARENA_WEAPONS` and async `loadArenaWeapons()`:

```js
const pool = await loadArenaWeapons();
const activeWeapon = pool.weapons[harnessIndex];
backMount.add(activeWeapon);
activeWeapon.scale.setScalar(1.8);
activeWeapon.rotation.x = -Math.PI / 2;
// Remove originals and any clones, then release the shared resources once:
pool.dispose();
```

Each public root has unit scale. Below it, the original model is centered at the
origin, rotated from its original -Z muzzle direction to +Z, and uniformly scaled
so its Z length is 1. Actual mesh, texture and material data are preserved. The
scope and magazine submeshes remain attached. The normalized public roots support
`clone(true)` for previews; these clones share geometry, materials and textures.
Call the pool's idempotent `dispose()` once when every original and clone is no
longer displayed. If scene teardown happens before loading resolves, immediately
dispose the returned pool when it arrives.

Loading is all-or-nothing so a failed asset cannot shift the harness-to-model
mapping. A partial failure releases successfully loaded assets. The loader makes
only same-site requests and requires no Draco decoder or external service.

The Chromium import check found no load/runtime errors or external requests. All
eight normalized bounds have Z length 1 and center approximately zero; repeated
disposal succeeded. A separate front/back inspection verified the muzzle
direction of the heavy Terminus-2 model as well.

## Vendored glTF support

The existing Three.js r170 MIT license covers two matching upstream modules:

- [GLTFLoader.js at r170](https://github.com/mrdoob/three.js/blob/r170/examples/jsm/loaders/GLTFLoader.js)
- [BufferGeometryUtils.js at r170](https://github.com/mrdoob/three.js/blob/r170/examples/jsm/utils/BufferGeometryUtils.js)

They live beside `assets/vendor/three/three.module.js`. The only modifications
replace their bare `three` imports with `./three.module.js` and the loader's
utility import with `./BufferGeometryUtils.js`. Together these add 142,058 bytes.
The upstream MIT license remains in `assets/vendor/three/LICENSE`.

## Jersey 10 pixel display font

The revised arena uses the official
[Jersey 10 family from Google Fonts](https://fonts.google.com/specimen/Jersey+10),
designed by Sarah Cadigan-Fried. Its original open-source project is
[Soft Type Jersey](https://github.com/scfried/soft-type-jersey); Google's metadata
identifies upstream commit `d8446c4c9c2ba14cf408c295be35213c006e19ff`.
The block-built glyphs provide a visibly different pixel treatment from the
previous Orbitron lettering. The font originated as part of a knitting-oriented
type collection; the arena adapts its pixel appearance to the game's signage.

Only one new family is shipped for this revision:

- `assets/fonts/jersey-10-latin.woff2`: unmodified Latin WOFF2, 13,276 bytes, regular weight 400,
  from [Google's official v4 asset](https://fonts.gstatic.com/s/jersey10/v4/GftH7vZKsggXMf9n_J5n_5jh.woff2).
- `assets/fonts/Jersey-10-OFL.txt`: original SIL Open Font License 1.1 from the
  [official Google Fonts source](https://github.com/google/fonts/blob/main/ofl/jersey10/OFL.txt).

Chakra Petch 700, Oxanium 700, Pixelify Sans 700 and Jersey 10 400 were compared
using actual Chromium font rendering before selection. At a common 40-pixel font
size, `mini-SWE-agent` measured approximately 221 pixels in Jersey 10 versus
306-308 pixels in the other three candidates. This narrower silhouette allows a
larger harness-label size while retaining the name's original capitalization.
The other candidate fonts were only loaded for the comparison and are not
included in the project.

The CSS family is `"Jersey 10"`, `font-weight: 400`, `font-style: normal`.
The single weight already has a heavy pixel silhouette: do not synthesize bold.
For CanvasTexture text, use `ctx.font = '400 190px "Jersey 10", monospace'`
and await `document.fonts.load('400 190px "Jersey 10"')` before drawing or
refresh the texture once that promise resolves. The numeric size is a starting
point for the existing 2048-pixel sign texture; fit the actual string inside its
safe area. Its smaller glyph height within the em means it should be set larger
than the previous Orbitron size.

The intended combination is Jersey 10 for entrance titles, the larger `Go`
prompt, and harness-wheel labels, with the existing body font for explanations.
`Go` retains an uppercase G and lowercase o; harness names such as
`mini-SWE-agent` retain their spelling. This Latin subset does not contain Chinese
glyphs, so the site's existing CJK fallback remains necessary for translations.

The local WOFF2 passed a Chromium `FontFace.load()` check. At 190 pixels the
longer `HR & SOCIAL SCIENCE` title measured 1,323 pixels wide and 103 pixels high,
within the existing 2048-pixel texture width. At 30 pixels the wheel's two-line
`mini-SWE` / `agent` treatment measured 93 pixels on its longer line. The public
asset and reference checks also passed after adding the font and its license.

## Retained Orbitron display font

The earlier version bundled the official
[Orbitron family from Google Fonts](https://fonts.google.com/specimen/Orbitron).
The original Latin variable WOFF2 (weights 400 through 900) is stored as
`assets/fonts/orbitron-latin-variable.woff2`, 11,800 bytes. It was obtained from
the official Google Fonts CSS response and
[Google's v35 font asset](https://fonts.gstatic.com/s/orbitron/v35/yMJRMIlzdpvBhQQL_Qq7dy0.woff2).
The unmodified SIL Open Font License 1.1 is retained as
`assets/fonts/Orbitron-OFL.txt`, copied from the
[official Google Fonts repository](https://github.com/google/fonts/blob/main/ofl/orbitron/OFL.txt).

The asset remains available under the CSS family name `Orbitron`. For a Three.js CanvasTexture, await
`document.fonts.load('700 24px Orbitron')` before drawing the label; otherwise the
first texture may permanently contain fallback glyphs. This Latin asset does not
claim Chinese glyph coverage, so translated supporting text retains the site's
existing CJK font stack.
