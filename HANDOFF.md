# Handoff – what's left to do

## Open question for the owner
- Remove the remaining superseded files? (`cad/leg/leg_module_concept.sc`, `cad/robot/robot_blockout.sc` and its two renders, `cad/scripts/gen_blockout.js`, and `cad/actuators/RS01_reference.sc`, now replaced by `cad/parts/robstride01.sc`.) Asked, not yet answered.
- Which of the clashes below should be fixed, and how?

## Clashes found in the model (all still present in the latest check)
- **Shank and foot pad:** the shank blade passes through the TPU pad ring on every leg (about 2,500 mm³). Shorten the blade to the foot core or notch the pad.
- **Battery keep-out and belly pan:** the lower corners of the 200 × 110 × 72 keep-out cut into the pan's rounded corners (inner radius 33 about each abduction axis).
- **Yoke arms and servos:** the neck and tail yoke arms (Ø10 at 22 mm from the centreline) overlap their servo bodies by 0.5 mm. Move the arms out or thin them.
- **Tail rod and yoke:** the rod starts inside the yoke bridge; this goes away once the TPU attachment is designed.

## Hip spacer and spine ribs (added in the last session)
- **Knee actuator screws:** the six upper screws through both plates and the spacer are about M3 × 45 button heads with only about 4 mm of thread in the actuator (8 mm tapped). Check engagement, or use studs or longer threaded inserts. Screws and the spacer's two through-bolts are not modelled.
- **Spacer:** solid, about 116 cm³ (roughly 55 g printed each). Add pockets or lighter infill once loads are checked.
- **Spine ribs are only screwed to the deck.** For real stiffness the rib root should also be fastened to the bulkhead or the mid frame it passes through (a bent tab or a small bracket). Not designed yet.
- **Rib bend radius** is not modelled (sharp inside corner). Use the sheet supplier's bend radius in the cut file and check the flange and slot clearances.
- **Rear rib and wag servo:** the rib stops 1 mm short of the servo and does not grip it. Once the servo mount is designed, the rib could carry it.
- **README images** (`cad/robot/robot_side.png`, `robot_iso.png`, `cad/leg/leg.png`) predate the spacer and ribs. Regenerate them. The named views in `build.js check` frame badly, so set explicit cameras or capture from the app by hand.

## Modelling and tooling
- **Smart App Control:** `solidcraft-cli.exe` and the `solidcraft` MCP connector are blocked by Windows because SolidCraft's Windows builds are unsigned. Use `build.js --app` with the desktop app open. Watch SolidCraft issue #8317 for signed builds.
- **Skill:** the owner will move `.claude/skills/cad-modelling/` to the personal skills folder and may add a project-specific skill. The owner has more modelling issues to add to it.
- **Export step:** not rewritten for the new part files. Plates can be exported with `sheet.export_dxf` or from the part bodies; printed parts as 3MF from their part files.
- **Countersinks:** adding them to the thigh plates makes the plates one-sided. The outline is not symmetric front to back, so a countersunk plate would no longer serve both sides: countersink both faces, or make the hole layout symmetric.
- **RobStride plug stub** in `robstride01.sc` is a guessed size (14 wide, 10 radial); replace with the real connector envelope.

## Leg
- **Pulley teeth:** model the HTD 5M tooth profile on the hip pulley (24T) and the knee pulley on the shank (36T). Until then those two parts are not printable as working parts. This blocks a test print of the knee drive.
- **Belt:** not modelled as a body; belt clearances come from hand calculation.
- **Flush fasteners on the inner thigh face:** only 1.5–3.5 mm separates it from the torso. Standoff screws, the tensioner screw and the knee axle end screw must be countersunk; the countersinks are not modelled.
- **Carrier:** first shape, no stress check, no fillets. Flange screws go in from inside the cup before the hip-pitch actuator is fitted.
- **Bearings, screws, cable routing:** not modelled.
- **Shank blade** (30 × 13 mm printed section): hand estimate about 18 MPa bending at 150 N; consider a carbon tube insert.

## Torso
- **Joints between parts:** nothing fastens the belly pan, mid frames, bulkheads and deck to each other yet. Add brackets or tabs.
- **Cut files:** none for bulkheads, mid frames or deck. Their outline is a union of two shapes, so the DXF needs a trimmed outline.
- **Abduction actuator plugs:** they point up into about 1 mm of clearance under the deck. Find a cable route (deck cut-outs, or rotate the actuators).
- **Bulkhead screws:** must be countersunk; the carrier face is 1 mm from the bulkhead.
- **Deck:** 300 g solid; add lightening cut-outs and access to the bay.
- **Battery:** keep-out is 200 × 110 × 72 mm; check a real 10S2P cell arrangement against the bay (258 long, 114 wide at the top, about 150 at mid-height, about 77 high).
- **Bay access:** decide how the battery goes in and out.

## Head, neck, tail
- **Verify servo dimensions** against the Feetech datasheet (modelled from memory as 45 × 24.7 × 35 mm, shaft 10 mm from one end, 3 mm horn) and pick the exact models. Then add mounting ears, screw holes and horn patterns; none are modelled.
- **Head:** two plain hollow boxes. Needs a split line so it can be printed and opened, camera mounts, and shaping. The shell is about 230 g at 2.5 mm walls; thin it.
- **Cameras:** keep-outs assume Raspberry Pi Camera Module 3; confirm once the computer is chosen. The muzzle partly blocks the lower inner field of view.
- **Tail:** modelled as a rigid Ø22 × 300 mm rod (137 g solid). Make it hollow or tapered, and design how the TPU attaches to the yoke.
- **Power:** the servos need about 12 V; add a step-down converter from the 36 V bus.
- Head pan was swept clear to 62° before the check ran out of time; rerun to 70°.

## Checks still to run
- Done on the new `robot.sc`: the standing pose, and abduction at −45, −36, +36 and +45° on all four legs together (`build.js pose`). The spacer and ribs clash with nothing in those poses.
- Abduction findings: outward, the hip carrier meets the deck at +36° (22 mm³), so the limit is just under 36°. Inward, at −36° the front and rear legs on the same side collide (thigh plates, standoffs, shank). Find the exact inward limit, and decide whether it is a joint limit or a gait rule (legs need not all swing in together).
- Still to rerun on the new model: hip pitch and knee sweeps, and head pan and tail sweeps. Use a large time budget; hip pitch previously ran out of budget at 114° back and 44° forward without a collision.
- Set real joint limits from the sweeps (knee fold 145° from the old model).
- A rear leg reaching forward about 45° from standing touches the front leg's shank. This is a gait-planning limit.

## Later
- Electronics: main computer, CAN interface, IMU, power distribution, battery pack.
- Confirm the actuator order and check current prices.
- Recheck mass once pulley teeth, brackets and real servos exist (current estimate 10.8–11.5 kg).

## Reference: RobStride 01 mounting facts
- Output flange Ø30: 6× M4 (9 mm deep) and 3× Ø4 pin holes on Ø24.
- Fixed Ø43 pilot ring, 3.5 mm high, around the flange; flange face is 0.5 mm proud of it.
- Housing: 9× M3 on the front face and 6× M3 on the rear, all on Ø73, 8 mm deep. No side holes.
- Rear cover Ø63 × 8.5 mm; three screw heads stand 3 mm proud on the rear annulus.
- Plug exits radially from the rear cover; its clearance is not documented.
- Official STEP and manual: github.com/RobStride/Product_Information (not stored here; licence not checked).

## Unverified estimates
- Knee torque need (about 6 N·m continuous, 15 N·m peak) is a hand calculation, not a simulation.
- Abduction torque is about 5 N·m at a 100 N foot load (foot is 52 mm outboard of the axis), against a 6 N·m rating.
- Power figures are scaled from commercial robots.
- Printed-part masses assume half to nine-tenths of solid volume.
