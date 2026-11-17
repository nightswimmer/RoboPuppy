# RoboPuppy – project reference

Starting point for each Claude conversation. Updated at the end of every session.

## Goal
A Labrador-sized robotic dog built from 3D-printed and laser-cut parts, designed in SolidCraft. The robot is designed around its actuators. It must be able to trot dynamically.

## Requirements (from the owner)
- Torso about 60 cm long; everything else scaled to an average dog of that size.
- Legs: 3 axes each (hip abduction, hip pitch, knee).
- Head: 2 axes. Tilt is at the base of the neck (the whole neck nods); pan is at the top of the neck.
- Tail: 2 axes (wag and lift), both at the tail root.
- Empty bay in the middle of the torso for battery and electronics (contents decided later).
- Exposed mechanical look for now; no cosmetic body shell.
- Fabrication available: FDM printer with 300 mm+ bed, laser cutter (wood/acrylic), and metal/carbon sheet through an external service.

## Decisions so far
- **Leg actuators:** 12× RobStride 01 (17 N·m peak, 6 N·m rated, 380 g, Ø78.5 × 40.5 mm, CAN bus, 36 V rated, 24–50 V range). Accepted budget is roughly EUR 1,600–1,900 for all actuators.
- **Head and tail actuators:** serial bus servos (about 50 kg·cm class for neck tilt, Feetech STS3215 class for the other three). Not yet selected in detail or modelled accurately.
- **Leg architecture:** abduction actuator fixed to a torso bulkhead; hip-pitch actuator held in a carrier; knee actuator on the thigh, coaxial with the hip pitch, driving the knee through a 1.5:1 belt (20:30 teeth) that runs between two thigh plates.
- **Link lengths:** thigh 240 mm, shank 240 mm (kept for torque margin, giving a back height of about 475 mm).
- **Layout:** hip pitch axes 420 mm apart front to rear; abduction axes 60 mm either side of the centreline; overall width about 285 mm (accepted).
- **Battery:** 10S Li-ion (36 V). About 180 Wh (10S1P, ~0.8 kg) gives roughly 1 h; about 360 Wh (10S2P, ~1.5 kg) gives roughly 2 h. Estimated draw is 40–60 W standing, 120–200 W trotting, 0.5–1 kW peaks.
- **Mass target:** about 11 kg all-up. Structure is the uncertain item.

## Tooling
- SolidCraft is driven by Claude through its MCP connector (`solidcraft` server). The connector must be started with `--allow-path` pointing at this repo (set in the user-level `.claude.json`), otherwise it cannot save here.
- The whole-robot block-out is generated: `node cad/scripts/gen_blockout.js` writes command scripts to `cad/robot/build/` (git-ignored), and `solidcraft-cli run cad/robot/build/robot_blockout_all.json --save cad/robot/robot_blockout.sc` builds the model headlessly. Change layout numbers in the script, not in the model.
- If the SolidCraft window already has a file open, reopening the same path does not reload it; open a blank design first.

## Repository layout
- `cad/actuators/` – RobStride 01 reference model (simplified envelope with the real bolt patterns, from the official manual and STEP).
- `cad/leg/` – single-leg concept (articulated, simplified blocks).
- `cad/robot/` – whole-robot block-out (articulated, 16 joints, standing pose) and renders.
- `cad/scripts/` – generator script for the block-out.

## Current state
Concept stage. The actuator is chosen and modelled, and a whole-robot block-out exists that confirms proportions and the central bay (about 320 × 200 × 106 mm). Nothing is detailed for manufacture yet: no bolt holes, bearings, belts or real part shapes. See HANDOFF.md for the next steps.

## Coordinate convention
X forward, Y left, Z up. Origin at the torso centre, at the height of the hip abduction axes.
