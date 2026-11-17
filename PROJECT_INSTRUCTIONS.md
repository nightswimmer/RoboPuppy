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
- **Link lengths:** thigh 242.2 mm (set by the belt), shank 242 mm. Back height about 470 mm standing.
- **Hip layout:** the thigh plane is 42 mm outboard of the abduction axis so it clears the abduction actuator and the torso. Abduction axes are 42 mm either side of the centreline. Hip pitch axes are 420 mm apart front to rear.
- **Width:** 323 mm over the knee actuators (accepted).
- **Torso:** each pair of abduction actuators is clamped between a bulkhead and a mid frame (3 mm aluminium). A printed belly pan spans between the mid frames; a 2 mm aluminium deck closes the top and extends as a spine to the neck and tail. Lower corners are rounded about the abduction axes and the top is only 120 mm wide, so the thighs can swing past.
- **Knee direction:** all four knees bend backward.
- **Battery:** 10S Li-ion (36 V). About 180 Wh (10S1P, ~0.8 kg) gives roughly 1 h; about 360 Wh (10S2P, ~1.5 kg) gives roughly 2 h. Estimated draw is 40–60 W standing, 120–200 W trotting, 0.5–1 kW peaks.
- **Mass:** target about 11 kg; current estimate 10.5–11.2 kg (the head shell is about 230 g and the tail 137 g if solid; both should be lightened).

## Tooling
- SolidCraft is driven by Claude through its MCP connector (`solidcraft` server). The connector must be started with `--allow-path` pointing at this repo (set in the user-level `.claude.json`), otherwise it cannot save here.
- **Models are generated, not hand-edited.** Node scripts in `cad/scripts/` write command scripts to `cad/*/build/` (git-ignored), and `solidcraft-cli run <script.json> --save <file.sc>` builds each model headlessly. Change dimensions in the scripts, then rebuild:
  - `lib_leg.js` – leg dimensions and geometry, shared by the two generators below.
  - `gen_leg.js` – single leg (`cad/leg/leg_detailed.sc`).
  - `gen_robot.js` – whole robot (`cad/robot/robot.sc`), torso dimensions at the top.
- The MCP connector is used for looking at the result: renders, joint sweeps and collision checks.
- If the SolidCraft window already has a file open, reopening the same path does not reload it; open a blank design first.
- Joint sweep replies are very large; they are saved to a file and the stop points extracted with a script.

## Repository layout
- `cad/actuators/` – RobStride 01 reference model (simplified envelope with the real bolt patterns).
- `cad/leg/` – detailed single leg and renders.
- **No production files in the repo** (owner's decision): DXF, 3MF and STEP exports go to `cad/*/export/`, which is git-ignored, and are only produced once the whole design is complete. `node cad/scripts/gen_leg.js --export` writes the plate DXFs and the export script.
- `cad/robot/` – whole-robot model (`robot.sc`) and renders.
- `cad/scripts/` – generators.
- Superseded, kept for now: `cad/leg/leg_module_concept.sc`, `cad/robot/robot_blockout.*`, `cad/scripts/gen_blockout.js`.

## Current state
First detailed pass. The whole robot exists as one articulated model (16 joints): a detailed torso, four detailed legs with real bolt patterns, and a neck, head and tail built around servo positions. Clearances are checked on the front-left leg and on the neck, head and tail joints. Nothing has been printed or cut; see HANDOFF.md for what is missing before a first test build.

## Coordinate convention
X forward, Y left, Z up. Origin at the torso centre, at the height of the hip abduction axes. Leg-local frame: origin where the abduction axis meets the hip pitch axis, Y outward.
