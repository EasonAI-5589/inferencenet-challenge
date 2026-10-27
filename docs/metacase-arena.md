# Metacase Challenge cinematic arena — handoff to haohaha

The v2 homepage `#arena` chapter is a full-width, scroll-directed 3D scene.
The shared homepage toy robot faces three domain challenge rooms. Native page scroll
owns the camera, the eight-slot equipment wheel, room transitions and episode
progress. Scrolling backwards reverses the sequence. Scrolling previews a harness;
clicking its wheel slot or the confirmation button equips it. The confirmed
equipment stays with the agent through later chapters and reverse scrolling.

## Library homepage migration (2026-10-26)

This version is based on the published library homepage at commit `131248c`.
Only its Challenge chapter is replaced; the new Library, Catalogue, Initiative
statement and the remaining homepage sections are retained. The Challenge reuses
the published scene's circular wooden reading hall, blue rug, cream walls and
dark wooden room frames. Surrounding shelves, ladders, reading desks and warm
lamps follow `metacase-library.js`; teal, amber and violet identify the three fields.
The accepted landing, toy robot, sixteen category orbs and deployable weapons
remain controlled by the same reversible scroll timeline.

## Three directions and deployable harnesses (2026-10-26)

Entering the chapter from above brings the robot down onto the launch plaza.
The descent follows the visible section's approach to its pinned position; the
first part of the episode then lifts the robot into foot-thruster flight. Both
directions of scrolling reconstruct the same landing and takeoff. Reduced-motion
and compact slider layouts begin with the robot already on the ground.

Doorway signs carry only the main direction name. The sixteen directories are
individual floating lights inside the rooms, with saturated teal, amber or violet
labels on pale tinted plaques. Approaching a room reveals its labels; the complete
bilingual directory remains readable in the adjacent accessible panel.

The rooms now use the project's latest taxonomy in `v2/arena-data.js`:
Economics (`econ/`, five directories), Finance (`fin/`, six), and Social Science
(`soc/`, five). Every directory has its exact ID and bilingual name/description.
The active room's directory is readable beside the scene; phones can swipe its
category row. This taxonomy does not imply that every category has published
benchmark tasks or measured results.

The protagonist is the actual `mc-kit.robot()` used in the other homepage scenes,
with foot thrusters added. Confirmed equipment starts on its back. As the agent
approaches a room, the weapon deploys to its side and points its actual +Z muzzle
at that room; a projected glass tag displays the selected harness name. Reverse
scrolling docks the weapon again without replacing the selection. The environment
adds bookshelves, sixteen case tiles, reading desks, ladders, warm lamps and
paper traffic through `arena-campus.js`.

## Homepage visual integration (2026-10-26)

The Challenge now shares the surrounding homepage's warm library setting,
Inter / Space Mono typography, numbered chapter label, glass loadout card, field
colours and signature progress rail. `mc-rail.js` gives the Challenge the same
signature rail as the preceding chapters. `arena-scene.js` composes the existing `mc-kit.js`
rounded toy geometry and signature tiles, and follows the live page theme.
Scroll choreography, all eight loadouts, explicit equipment confirmation,
foot-thruster flight and proximity prompts remain available.

The old peripheral telemetry overlay is no longer mounted. Its reusable source
and attribution remain in `arena-motion.js`; the camera still uses that module's
Catmull-Rom helper. The scene uses private copies of shared kit resources so its
teardown cannot dispose geometry or materials used by neighboring chapters.

On short screens (up to 860px wide and 720px high), a normally scrolling frame
and visible episode slider keep the equipment wheel and confirmation reachable.
Reduced-motion mode also exposes the slider. Standard desktop and portrait-phone
layouts continue to use native scrolling for the episode.

## Preview

From the repository root, start a local server on an available port:

```sh
python -m http.server 4198 --bind 127.0.0.1
```

Open `http://127.0.0.1:4198/v2/#arena`. Keep the repository directory structure
intact so the modules, fonts and GLB models resolve correctly.

No build or frontend installation is required. The six scenes are:

1. Enter from behind the agent, facing the challenge chambers.
2. Open a radial equipment wheel; scroll to preview eight harness architectures,
   then click a slot or the confirmation button to equip one.
3. Approach Economics and its five case categories.
4. Move to Finance and its six case categories.
5. Move to Social Science and its five case categories.
6. Pull back and retain the case as reusable experience.

The equipment wheel includes DeepSeek Harness, DeepAgents, Claude Code, Codex CLI,
OpenCode, OpenHands SDK, Terminus-2 and mini-SWE-agent, taken from the site's own
Harness catalogue. They are ecosystem examples, not eight newly evaluated
Dev100 configurations. Harbor remains an evaluation framework, not an equipment
slot. The three rooms represent the three main directions in the latest
16-directory taxonomy. Scene actions are conceptual, not measured run results.

The agent begins without confirmed equipment. Visitors can continue scrolling
without making a selection; the page never locks scrolling or silently equips a
default. Returning to the wheel previews other harnesses without replacing the
confirmed choice. A new explicit selection replaces it. Arrow keys move the
wheel's keyboard focus and preview; Enter or Space equips the focused slot.
The confirmation button is also keyboard accessible. Outside the equipment
chapter, hidden wheel controls are removed from keyboard navigation.

## Implementation

| File | Responsibility |
| --- | --- |
| `v2/index.html` | Static accessible scene and homepage identity |
| `v2/arena.css` | Full-width sticky stage, equipment wheel and minimal captions |
| `v2/arena.js` | Reversible scroll timeline; separate preview and confirmed equipment; six chapters; bilingual UI |
| `v2/arena-scene.js` | Perspective camera choreography, refined procedural character and rooms |
| `v2/arena-data.js` | Three directions, sixteen bilingual directories and harness names |
| `v2/arena-campus.js` | Library shelves, reading desks, ladders, lamps and case papers |
| `v2/arena-subtracks.js` | Sixteen room-interior light orbs and bilingual category labels |
| `v2/mc-rail.js` | Signature progress rail shared by the homepage chapters |
| `v2/arena-models.js` | Local Kenney GLB equipment loading and normalization |
| `v2/arena-motion.js` | Actually adapted demonstration motion/drawing code |
| `assets/models/kenney-blasters/` | Eight CC0 equipment models and their original license |
| `assets/vendor/three/three.module.js` | Local unmodified Three.js 0.170.0, MIT license alongside |
| `scripts/test-arena.mjs` | Browser acceptance for native scroll previews, explicit equipment, keyboard and touch |

See [motion source record](arena-motion-sources.md) for exact upstream files,
functions and commit. The demonstration integration is executable code, not an
iframe or video. The earlier telemetry overlay is retained as reusable source but is no longer
mounted by the homepage; its camera interpolation helper remains in use. Public EWM camera code informed the normalized keyframe interpolation.
No third-party character or room models were copied. The equipment uses local
Kenney Blaster Kit models; see [model sources and license](arena-model-sources.md).

New runtime assets are local. Scene loading is deferred until nearby; rendering
stops offscreen and when the tab is hidden. Reduced motion uses explicit range
navigation instead of camera motion tied to scrolling. The range is also reachable
by keyboard and becomes visible when focused. Failed WebGL has a text fallback.
On narrow screens the homepage navigation wraps into a compact control row and
an independently scrollable link row. The scene follows the measured header
height. The mobile reduced-motion layout reserves
separate space for the progress range and equipment confirmation.

## Checks

```sh
node scripts/check.mjs
node --test scripts/test-initiative.mjs
# Playwright is needed; PLAYWRIGHT_MODULE can name an existing package install.
# BROWSER_EXECUTABLE can select an existing Chrome/Chromium executable.
node scripts/test-arena.mjs
```

Browser checks cover full-width scenes at 1440×1000 and 1280×800, all eight previews
reached by scroll, explicit confirmation, persistence across later chapters and
reverse scrolling, room transitions, keyboard selection, native wheel input,
Chinese switching and light/dark themes. A 390×844 mobile case checks touch
selection, confirmation visibility and horizontal overflow. Reduced motion and a
blocked renderer module exercise the explicit range and equipment fallback.
The normal-renderer checks also wait for all eight local CC0 weapon models to load.

## Handoff to haohaha

**Handoff owner: haohaha.** The entry is `v2/index.html#arena`. This change
contains the editable website source and its local assets; the separately
generated single-file homepage export is not part of the repository change.

Review the equipment chapter by scrolling through the eight harnesses, clicking
a sector or the confirmation button, and continuing into the rooms. The chosen
CC0 weapon starts on the agent's back and deploys beside it, aimed at the active
room and labeled with its harness name. Foot thrusters replace walking. Doorway
signs use Inter and Space Mono to match the homepage, and `Go for this challenge!` dissolves
in on approach and out on departure. Wheel labels and selection states use the homepage field colours. Scrolling backwards preserves the confirmed equipment.

Use `v2/arena.js` for chapter text and selection behavior, `v2/arena.css` for
the wheel and responsive layout, `v2/arena-scene.js` for the camera, character,
rooms and text textures, and `v2/arena-models.js` for weapon mappings. Preserve
the local model/font/vendor licenses and the source records linked above.

The Metacase Challenge identity and initiative explanation are applied to the v2
homepage. Other existing content pages retain their current identity and can be
aligned in a subsequent site-wide content pass. The Challenge arena uses the
new three-direction taxonomy; existing task-detail pages retain their published
pilot descriptions.
