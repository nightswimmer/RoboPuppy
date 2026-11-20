# RoboPuppy – project reference

Starting point for each Claude conversation. Updated at the end of every session.

## Goal
A Labrador-sized robotic dog built from 3D-printed and laser-cut parts, designed in SolidCraft. The robot is designed around its actuators. It must be able to trot dynamically.

## Requirements (from the owner)
- Torso about 60 cm long; everything else scaled to an average dog of that size.
- Legs: 3 axes each (hip abduction, hip pitch, knee).
- Head: 2 axes. Tilt is at the base of the neck (the whole neck nods); pan is at the top of the neck. Neck is short (about 92 mm).
- Tail: 2 axes (wag and lift), both at the tail root.
- Empty bay in the middle of the torso for battery and electronics (contents decided later).
- Exposed mechanical look for now; no cosmetic body shell.
- Fabrication available: FDM printer with 300 mm+ bed, laser cutter (wood/acrylic), and metal/carbon sheet through an external service.

## Decisions so far
- **Leg actuators:** 12× RobStride 01 (17 N·m peak, 6 N·m rated, 380 g, Ø78.5 × 40.5 mm, CAN bus, 36 V rated, 24–50 V range). Accepted budget is roughly EUR 1,600–1,900 for all actuators.
- **Head and tail actuators:** four Feetech STS-family serial bus servos (STS3215 class for head pan and both tail axes, a stronger one of the same size for neck tilt). Modelled as 45 × 24.7 × 35 mm bodies from memory of the datasheet; dimensions not yet verified. They need about 12 V, so a step-down converter from the 36 V battery.
- **Neck:** tilt servo lies on top of the deck at the front (ahead of the hip carriers' sweep); a printed neck (yoke, 45 mm tube at 45°, cradle) carries the pan servo.
- **Head:** hollow printed shell (skull 110 × 100 × 85, muzzle 95 × 56 × 48, 2.5 mm walls) on the pan servo horn. One camera behind each eye, 64 mm apart; keep-out sized for a Raspberry Pi Camera Module 3 (assumption until the computer is chosen). The rest of the head is left empty for future additions.
- **Tail:** wag servo hangs under the rear tip of the deck spine with its shaft up through the deck; it carries the lift servo; the tail is a flexible 300 mm TPU rod on a yoke.
- **Leg architecture:** abduction actuator fixed to the torso; hip-pitch actuator held in a printed carrier; knee actuator on the thigh, coaxial with the hip pitch, driving the knee through a 1.5:1 belt (HTD 5M, 15 mm wide, 635 mm long, 24:36 teeth) between two thigh plates. The shank blade swings beside the belt, not in its plane.
- **Thigh plates:** 3 mm aluminium, laser-cut (owner's choice for now; carbon would save about 0.55 kg in total).
- **Hip spacer:** a printed horseshoe (RP-108, 35 mm thick, the full gap between the plates) ties the two thigh plates together around the hip, where one plate is on the hip-pitch actuator and the other on the knee actuator. The upper six knee-actuator screws pass through both plates and the spacer (shared 9-hole pattern; the inner plate has three extra holes for hex-key access). Two through-bolts at its leg ends replace the two upper standoffs. The bore (Ø56) and the open bottom clear the belt and the hip pulley.
- **Link lengths:** thigh 242.2 mm (set by the belt), shank 242 mm. Back height about 470 mm standing.
- **Hip layout:** the thigh plane is 42 mm outboard of the abduction axis so it clears the abduction actuator and the torso. Abduction axes are 42 mm either side of the centreline. Hip pitch axes are 420 mm apart front to rear.
- **Width:** 323 mm over the knee actuators (accepted).
- **Torso:** each pair of abduction actuators is clamped between a bulkhead and a mid frame (3 mm aluminium). A printed belly pan spans between the mid frames; a 2 mm aluminium deck closes the top and extends as a spine to the neck and tail. Each spine end is stiffened by a bent 3 mm aluminium angle rib (front RP-205, 174 mm; rear RP-206, 125 mm, stopping 1 mm short of the tail wag servo), screwed to the deck along the centreline. The rib root passes through a slot in the bulkhead up to the mid frame. Lower corners are rounded about the abduction axes and the top is only 120 mm wide, so the thighs can swing past.
- **Knee direction:** all four knees bend backward.
- **Battery:** 10S Li-ion (36 V). About 180 Wh (10S1P, ~0.8 kg) gives roughly 1 h; about 360 Wh (10S2P, ~1.5 kg) gives roughly 2 h. Estimated draw is 40–60 W standing, 120–200 W trotting, 0.5–1 kW peaks.
- **Shared parts across sides:** the assembly is mirrored left to right, but every fabricated part must be the same on both sides (owner's rule). Parts are symmetric or work turned over. The hip carrier has the actuator hole pattern every 60° and a plug slot top and bottom, so one carrier fits all four hips with the actuator plug pointing up.
- **Joint directions:** hip pitch and knee turn about +Y on every leg; positive abduction is outward on both sides. Actuator flange convention: a dowel pin in line with the plug, M4 holes 30° off.
- **Mass:** target about 11 kg; current estimate 10.8–11.5 kg (the hip spacers and spine ribs added about 300 g; the head shell is about 230 g and the tail 137 g if solid; all of these should be lightened).
- **Joint limits found so far (all four legs driven together):** abduction outward just under 36° (the hip carrier meets the deck); inward, the front and rear legs on the same side collide at 36°. Knee fold 145° (from the old model).

## Tooling
- **Modelling rules** are in the `cad-modelling` skill (`.claude/skills/cad-modelling/SKILL.md`; the owner plans to move it to the personal skills folder). In short: one file per part, reuse by instancing, same parts on both sides, fully constrained sketches, one sketch and one hole feature per hole group, patterns and mirrors for repeats.
- **Models are generated, not hand-edited.** Node scripts in `cad/scripts/` write command scripts to `cad/*/build/` (git-ignored) and run them in SolidCraft. Run from the repo root:
  - `node cad/scripts/build.js all --app` builds every part, then the leg and the robot. `parts <key>` builds one part; `leg` or `robot` one assembly.
  - `node cad/scripts/build.js symmetry --app` checks that every part used on both sides equals its own mirror image.
  - `node cad/scripts/build.js check robot --app` (or `leg`) runs a clash check on the saved assembly and writes renders to its `build/` folder.
  - `node cad/scripts/build.js pose HipAbduction -45 45 --app` drives that joint on all four legs to each angle and clash-checks the robot there.
  - `node cad/scripts/build.js ping [words] --app` tests the connection and lists app commands matching the words.
  - A part build fails if any sketch is not fully constrained.
- **How Claude reaches SolidCraft (`--app`):** Windows Smart App Control blocks the unsigned `solidcraft-cli.exe` (SolidCraft's Windows builds are not code-signed yet; their issue #8317). That blocks both the CLI and the `solidcraft` MCP connector, which is the same exe. The desktop app itself runs, so `--app` sends the command scripts to the open app over its local control channel (`cad/scripts/lib/control.js`; TCP port in `%LOCALAPPDATA%\SolidCraft\control\current.port`, with a token file next to it). The app must be open with Preferences > Assistant > "Let AI agents connect" on. Each build runs in a new tab, saves, and closes that tab; the owner's tabs are left alone. Without `--app` the build uses the CLI at `C:\Program Files\SolidCraft\`, which works once Windows lets it run.
- `.claude/settings.local.json` exempts `node cad/scripts/build.js *` from the Claude Code sandbox so the build can reach the app's port.
- The app re-saves every part file it rebuilds, and .sc files are binary, so a full rebuild shows every part as changed in git.
- **Generator files:** `dims.js` (every dimension, passed to the part files as named parameters), `parts.js` (one definition per part), `assemblies.js` (leg modules, leg and robot), `build.js` (runner), `lib/` (sketch helpers, placement maths, control-channel client).
- **How assemblies are structured:** SolidCraft flattens a linked assembly file (its part list and joints are lost), so only part files are linked. The leg is defined once in `assemblies.js` as three rigid modules (hip, thigh, lower leg). In the robot, modules are local sub-assemblies placed twice or four times: two hip modules and two thigh modules (one per hand), one lower leg. A right-hand module places the same part files in mirrored positions; the build refuses a mirrored part.
- Named views (`view.apply {view: ...}`) frame the renders oddly; check the model visually in the app.
- Interference checks can run long: use `engine.batch` (one-hour timeout), not `engine.execute` (60 s).

## Repository layout
- `cad/parts/` – one design file per unique part (29 files), purchased parts and keep-out volumes included.
- `cad/leg/` – single-leg assembly (`leg.sc`, front-left leg on a bulkhead), render and BOM.
- `cad/robot/` – whole-robot assembly (`robot.sc`, saved in the standing pose), renders and `bom.csv` (27 items).
- `cad/scripts/` – generators.
- `cad/actuators/` – older RobStride 01 reference model from the official drawing; the assemblies use `cad/parts/robstride01.sc`.
- **No production files in the repo** (owner's decision): DXF, 3MF and STEP exports go to `cad/*/export/`, which is git-ignored, and are only produced once the whole design is complete. The export step has not been rewritten for the new part files yet.
- Superseded, kept for now: `cad/leg/leg_module_concept.sc`, `cad/robot/robot_blockout.*`, `cad/scripts/gen_blockout.js`.

## Current state
First detailed pass, in linked part files. The whole robot is one articulated assembly (16 joints): a detailed torso, four detailed legs with real bolt patterns, and a neck, head and tail built around servo positions. The latest session stiffened the hip end of the thigh (hip spacer) and the two spine ends (angle ribs), and made the build run through the open desktop app. The standing pose and abduction at ±36° and ±45° were clash-checked on the new model; the other sweeps have not been rerun. Nothing has been printed or cut; see HANDOFF.md for what is missing before a first test build.

## Coordinate convention
X forward, Y left, Z up. Origin at the torso centre, at the height of the hip abduction axes. Leg-local frame: origin where the abduction axis meets the hip pitch axis, Y outward. Each part file has its own frame, described in a comment above the part in parts.js.
