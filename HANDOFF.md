# Handoff – what's left to do

## Next: switch the model to the RobStride 02 and a 13S2P battery
Decided by the owner on 2026-11-21. The reasoning and numbers are in `docs/robstride_comparison.md` and `docs/battery.md`. The model still has the RobStride 01 and the 10S battery keep-out.

1. **RS02 part:** add `robstride02.sc` from the official drawing and STEP file (github.com/RobStride/Product_Information, `Product Literature/CAN2.0/RS02/RS02-20261030.stp`). Compared with the RS01:
   - Same: Ø78.5 × 28 housing, 9× M3 on Ø73 at the front, Ø43 × 3.5 pilot with the flange 0.5 mm proud, and 6× M4 plus 3× Ø4 pins on Ø24.
   - Different: the rear cover is Ø65 × 13.5 (RS01: Ø63 × 8.5), so the overall length is 45.5 mm (RS01: 40.5). The three proud rear screw heads sit on the same nine 40° positions, but two are adjacent and the third is opposite, not every 120°. The M4 thread depth in the flange is 7 mm minimum (RS01: 9). Three extra Ø3 holes on the front Ø73 circle can be ignored.
   - Take the plug position and envelope from the STEP file. The RS01 plug stub is still a guess, too.
   - Replace `robstride01` in every assembly (12 per robot, both variants), and update `dims.js`.
2. **Hip carrier:** widen the rear opening (`opening_d` 65 → about 67). Pocket the RS02 head layout, or all nine 40° positions so the carrier still fits either way up. Check the plug slot. Recheck the rear M3 holes against the RS02 rear pattern.
3. **Screws:** shorten the M4 screws into the output flanges to suit the 7 mm thread.
4. **Clash checks**, both variants: the rear covers of the hip-pitch, knee and abduction actuators now stand 5 mm further out. Recheck the abduction limits and the width over the knee actuators.
5. **Battery keep-out:** size it for the 13S2P pack (26 × 21700 cells plus BMS; see `docs/battery.md`), and fix its clash with the belly pan at the same time.
6. **Mass and torque:** add about 1.3 kg for the battery and about 0.3 kg for the motors, then recheck the knee torque estimate against the RS02's 6 N·m rating.
7. **Power:** the head and tail servo step-down converter needs a 60 V or higher input rating. Regen with a full pack (54.6 V) can exceed the RS02's 60 V limit: plan a braking resistor, or charge only to 4.1 V per cell.

## Linkage knee (added in the last session; open points)
- **Lever pin fastener:** the M5 pin through the shank lever sits 0.5 mm from the thigh plates, so it needs flush heads or a threaded insert in the printed lever.
- **Lever strength:** the printed lever cheeks see about 22 MPa at peak torque (peak rod force about 750–1000 N). Use aluminium lever plates or a steel sleeve at the pin.
- **Hip-pitch flange screws:** the rod passes about 1 mm over the hip-pitch actuator's flange screw heads at full extension; use low-profile heads. Screws are not modelled, so the clash check cannot see this.
- **Crank orientation:** the crank's flange holes are not turned to match the actuator's hole pattern in the model (the motor model is static). Cosmetic.
- **Rod ends:** both modelled as right-hand thread. Use one left-hand and one right-hand so the rod length (knee zero) can be adjusted without unbolting.
- **Rod-end thread stud** not modelled.
- **Checks not run on the linkage robot:** hip-pitch and abduction sweeps, and a continuous knee sweep (`joint.find_limits` stalls because the rod ends touch the crank and lever face to face; eight discrete knee angles were checked instead).
- **Choose the variant:** belt or linkage, once the open points above are weighed.

## Open question for the owner
- Remove the remaining superseded files? (`cad/leg/leg_module_concept.sc`, `cad/robot/robot_blockout.sc` and its two renders, `cad/scripts/gen_blockout.js`, and `cad/actuators/RS01_reference.sc`, now replaced by `cad/parts/robstride01.sc`.) Asked, not yet answered.
- Which of the clashes below should be fixed, and how?

## Clashes found in the model (all still present in the latest check)
- **Shank and foot pad:** the shank blade passes through the TPU pad ring on every leg (about 2,500 mm³, both variants). Shorten the blade to the foot core or notch the pad.
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
- **SolidCraft bug worth reporting** (if the owner wants to): a click on a part inside a sub-assembly cannot drag the sub-assembly along its joints. `joint.reach` on the part answers "no joint places it: it is not connected to anything grounded", while the same move on the sub-assembly works.
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
