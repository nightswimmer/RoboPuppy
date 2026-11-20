# Handoff – what's left to do

## Open question for the owner
- Remove the remaining superseded files? (`cad/leg/leg_module_concept.sc`, `cad/robot/robot_blockout.sc` and its two renders, `cad/scripts/gen_blockout.js`, and `cad/actuators/RS01_reference.sc`, now replaced by `cad/parts/robstride01.sc`.) Asked, not yet answered.
- Which of the clashes below should be fixed, and how?

## Clashes found in the model (all present before the restructuring)
- **Shank and foot pad:** the shank blade passes through the TPU pad ring on every leg (about 2,500 mm³). Shorten the blade to the foot core or notch the pad.
- **Battery keep-out and belly pan:** the lower corners of the 200 × 110 × 72 keep-out cut into the pan's rounded corners (inner radius 33 about each abduction axis).
- **Yoke arms and servos:** the neck and tail yoke arms (Ø10 at 22 mm from the centreline) overlap their servo bodies by 0.5 mm. Move the arms out or thin them.
- **Tail rod and yoke:** the rod starts inside the yoke bridge; this goes away once the TPU attachment is designed.

## Modelling and tooling
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
- All sweeps below were run on the old single-file model. Rerun them on the new `robot.sc`; the joint names are the same, but hip and knee now turn about +Y on every leg, so right-leg angles keep their sign.
- Clearance sweeps on the other three legs (only front-left was swept fully; rear-left partly).
- Hip pitch sweeps ran out of time budget at 114° back and 44° forward without finding a collision; rerun with a larger budget to find the true limits.
- Set real joint limits from the sweeps. Found so far on front-left in the standing pose: inward 38° (opposite leg), outward 36° (carrier meets the deck spine), knee fold 152° (blade meets a spacer; limit set to 145°).
- A rear leg reaching forward about 45° from standing touches the front leg's shank. This is a gait-planning limit.

## Later
- Electronics: main computer, CAN interface, IMU, power distribution, battery pack.
- Confirm the actuator order and check current prices.
- Recheck mass once pulley teeth, brackets and real servos exist (current estimate 10.5–11.2 kg).

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
