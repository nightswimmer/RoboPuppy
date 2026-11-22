# Handoff – what's left to do

## Next: the new leg (motion rig)
The new leg exists only in `cad/robot/motion_rig.sc` (`rig.js`): 200/200 mm, a hook-shaped thigh that bends near the knee, a shank of two S-shaped aluminium plates, knee 60–159°, four-bar crank 22 / lever 28 at −12° / rod lt + 3 (see PROJECT_INSTRUCTIONS.md, Decisions). The owner may still tweak it by dragging the rig (saved with contact off).

1. **Remaining joint ranges:** abduction (±45° in the rig) and hip pitch (±120°) are still to be set from the rig. Limits are plain numbers in `LIMITS` at the top of `rig.js`. Known: abduction outward about 17° (hip-pitch plug and deck spine), inward 36° (same-side legs collide).
2. **Carry the new leg into the part files and both robots (big change: remind the owner to push to GitHub first).** What it involves:
   - In `dims.js`, `lt` and `ls` become 200 (the new leg's own numbers are in `NL` in `rig.js`).
   - New part files: hook-shaped thigh plates and S-shaped shank plates (one flat plate should serve both sides turned over; the rig has handed definitions only for convenience), shank spacers, axle tube, new crank and pushrod lengths. The outlines can be copied from `thighPlate`, `shankPlate` and `centreline` in `rig.js` (fully constrained). RP-115 is already an 8 × 4 tube; only its length (`lk_c`) changes.
   - Retire the printed shank (RP-116) and the old tapered plates.
   - Update `leg_linkage.sc`, `robot_linkage.sc`, the BOMs and the joint limits in `assemblies.js`.
   - Decide what happens to the belt variant: its belt length and thigh are tied to 242.2 mm.
   - Rerun the symmetry, clash and pose checks.
   - The 2D checkers (shapely, then Node with sketch tracing and a headless-Edge render, both in session scratchpads, not saved) can be rewritten if needed: thigh outline, swept rod and shank, free space.
3. **Open points on the new leg:**
   - **Plate ties:** the lowest thigh standoff is 145 mm below the hip, so in the lower 55 mm only the knee axle ties the two thigh plates. The reshaped thigh is also narrowest there (about 34 mm). Check the stiffness, or add a tie in front of the knee where the shank does not pass.
   - **Thin cover over the rod:** the thigh's front edge is only about 1.5 mm in front of the rod at the extreme folds, around 120–150 mm below the hip. That's enough as a cover, but check it once fasteners and real rod-end sizes are in.
   - **Rod and lever forces:** at about 23 N·m knee peak and a 28 mm lever, the rod sees about 1 kN at trotting folds and more near the fold ends (transmission angle down to 18°). Check the M5 rod ends, the lever pin and the 3 mm plate bearing area round the pin (a sleeve or a thicker boss may be needed).
   - **Flush fasteners:** the shank plates run 2 mm inside the thigh plates, so the shank spacer screws and the lever pin need countersunk or flush heads (not modelled).
   - **Rod outside the thigh:** the longer lever makes the rod end and lever pin stick out of the knee round a little more than before (accepted by the owner, as on the Unitree legs). Check that it clears the ground and the other legs when lying down.
   - **Torque margin:** the RS02 knee is now within its rating for trotting, but it has about 60% of the Go2's torque per kg. Options left for later: a 1.5:1 reduction before the crank, or RobStride 06 knees.
4. **Rig maintenance:** the rig's torso comes from the real part files, but its legs are its own bodies. Keep `rig.js` and the part files in step once the new leg is carried over. If live contact is ever wanted, the rig needs a simplified torso, at least 2 mm clearance at every joint, and contact sets that only pair parts that set real limits.

## Then: finish the RobStride 02 and 13S2P switch
The CAD now uses the RobStride 02 (`cad/parts/robstride02.sc`). What is left of the switch:

1. **Battery keep-out:** size it for the 13S2P pack (26 × 21700 cells plus BMS; see `docs/battery.md`), and fix its clash with the belly pan at the same time.
2. **Mass:** add about 1.3 kg for the battery and about 0.3 kg for the motors to the mass estimate (the knee torque estimate already assumes 12.5 kg).
3. **Power:** the head and tail servo step-down converter needs a 60 V or higher input rating. Regen with a full pack (54.6 V) can exceed the RS02's 60 V limit: plan a braking resistor, or charge only to 4.1 V per cell.
4. **Hip-pitch actuator plug and the deck spine (left for later by the owner):** each hip-pitch actuator's upward plug swings through the deck spine between about 18° and 36° of outward abduction (212 mm³ at 25°). The outward abduction limit is about 17° until this is solved (before: just under 36°, where the hip carrier meets the deck). Options: notch the deck spine edges, narrow the spine near the hips, turn the hip-pitch actuators so the plugs point fore and aft (the carrier is symmetric every 60°, so 60° steps are free), or use a right-angle plug.
5. **Abduction plug and mid frame:** the lower plug keep-out of each abduction actuator overlaps the 3 mm mid frame by 0.6 mm (82 mm³ each, through the new tab). The real socket starts 2.8 mm behind the rear face. Measure a real XT30(2+2)-F plug with its cable, or make the mid frame 2 mm (`t_frame` is shared; a separate thickness affects `x_mid`, the rib roots and the belly pan).
6. **Plug keep-out size:** `rs_plug_*` in `dims.js` is an estimate (16 wide, 6 axial, out to 15 mm past the socket face). The deck slots, belly-pan notches and mid-frame notch follow it. Update it once a plug is in hand.
7. **M4 flange screws (not modelled):** the RS02 flange thread is only 7 mm deep. Suggested: M4 × 12 in the hip carrier (6.5 mm counterbore floor, about 5.5 mm engagement) and M4 × 8 or × 10 through the 3 mm thigh plate. Confirm when the hardware list is made.
8. **Checks still to rerun with the RS02:** hip-pitch sweeps on both variants, and the linkage knee poses (the abduction poses and the standing pose are done).
9. **README images** predate the RS02, spacer and ribs (see below).

## Linkage knee (open points)
The printed shank and lever (RP-116) will be replaced by the new leg's aluminium plates, which solves the earlier lever-strength, lever-pin and print-orientation issues.
- **Hip-pitch flange screws:** the rod passes about 1 mm over the hip-pitch actuator's flange screw heads at full extension; use low-profile heads. Screws are not modelled, so the clash check cannot see this.
- **Crank orientation:** the crank's flange holes are not turned to match the actuator's hole pattern in the model (the motor model is static). Cosmetic.
- **Rod ends:** both modelled as right-hand thread. Use one left-hand (SAL5 T/K) and one right-hand so the rod length (knee zero) can be adjusted without unbolting.
- **Pushrod tube on arrival:** check the temper with a bend test on an offcut (T6 barely flexes and springs back; O temper bends permanently), and check that the bore is 4.0–4.2 mm so the M5 thread is full depth. Practise the tap on an offcut.
- **Rod-end thread stud** not modelled.
- **Checks not run on the linkage robot:** hip-pitch sweeps, and a continuous knee sweep (`joint.find_limits` stalls because the rod ends touch the crank and lever face to face; use discrete knee angles).
- **Choose the variant:** belt or linkage, once the open points above are weighed.

## Open question for the owner
- **Purchasing list:** the CAD BOMs (`cad/robot/bom*.csv`, `cad/leg/leg*_bom.csv`) are regenerated by every build and list only modelled parts. Nothing lists the battery, BMS, converters, compute, CAN wiring, connectors or fasteners. Suggested: a hand-maintained `docs/purchasing_bom.md` that points to the CAD BOMs for the mechanical parts. The owner has not decided yet.
- Remove the remaining superseded files? (`cad/leg/leg_module_concept.sc`, `cad/robot/robot_blockout.sc` and its two renders, `cad/scripts/gen_blockout.js`, `cad/actuators/RS01_reference.sc`.) `cad/parts/robstride01.sc` is kept by the owner's choice, but nothing uses it and its definition is gone from `parts.js`; note that its front and rear screw patterns are 20° out of phase with the real actuator.
- Which of the clashes below should be fixed, and how?

## Clashes found in the model (all still present in the latest check)
- **Shank and foot pad:** the shank blade passes through the TPU pad ring on every leg (about 2,500 mm³, both variants). Shorten the blade to the foot core or notch the pad.
- **Battery keep-out and belly pan:** the lower corners of the 200 × 110 × 72 keep-out cut into the pan's rounded corners (about 26,000 mm³).
- **Abduction plug and mid frame:** 0.6 mm, see item 5 above.
- **Yoke arms and servos:** the neck and tail yoke arms (Ø10 at 22 mm from the centreline) overlap their servo bodies by 0.5 mm. Move the arms out or thin them.
- **Tail rod and yoke:** the rod starts inside the yoke bridge; this goes away once the TPU attachment is designed.

## Hip spacer and spine ribs
- **Knee actuator screws:** seven of the nine front screws pass through both plates and the spacer (about M3 × 45 button heads, with only about 4 mm of thread in the actuator); the two lowest hold only the outer plate. Check engagement, or use studs or longer threaded inserts. Screws and the spacer's two through-bolts are not modelled.
- **Spacer:** solid, about 116 cm³ (roughly 55 g printed each). Add pockets or lighter infill once loads are checked.
- **Spine ribs are only screwed to the deck.** For real stiffness the rib root should also be fastened to the bulkhead or the mid frame it passes through (a bent tab or a small bracket). Not designed yet.
- **Rib bend radius** is not modelled (sharp inside corner). Use the sheet supplier's bend radius in the cut file and check the flange and slot clearances.
- **Rear rib and wag servo:** the rib stops 1 mm short of the servo and does not grip it. Once the servo mount is designed, the rib could carry it.
- **README images** (`cad/robot/robot_side.png`, `robot_iso.png`, `cad/leg/leg.png`) are out of date. Regenerate them. The named views in `build.js check` frame badly, so set explicit cameras, render through the `solidcraft` MCP (`screenshot` with a camera target, yaw, pitch and distance), or capture from the app by hand.

## Modelling and tooling
- **SolidCraft bug worth reporting** (if the owner wants to): a click on a part inside a sub-assembly cannot drag the sub-assembly along its joints. `joint.reach` on the part answers "no joint places it: it is not connected to anything grounded", while the same move on the sub-assembly works.
- **Kernel quirk:** in the hip carrier, cutting the deeper rear opening before the flange counterbores left a shell the kernel could not validate. The opening is now the last cut; keep it last.
- **Skill:** the owner will move `.claude/skills/cad-modelling/` to the personal skills folder and may add a project-specific skill. The owner has more modelling issues to add to it.
- **Export step:** not rewritten for the new part files. Plates can be exported with `sheet.export_dxf` or from the part bodies; printed parts as 3MF from their part files.
- **Countersinks:** adding them to the thigh plates makes the plates one-sided. The outline is not symmetric front to back, so a countersunk plate would no longer serve both sides: countersink both faces, or make the hole layout symmetric.
- **RS02 extras not modelled:** three Ø3 holes on the front Ø73 circle (at 100/220/340° from the plug); modelling them would break the part's symmetry.

## Leg
- **Pulley teeth:** model the HTD 5M tooth profile on the hip pulley (24T) and the knee pulley on the shank (36T). Until then those two parts are not printable as working parts. This blocks a test print of the knee drive.
- **Belt:** not modelled as a body; belt clearances come from hand calculation.
- **Flush fasteners on the inner thigh face:** only 1.5–3.5 mm separates it from the torso. Standoff screws, the tensioner screw and the knee axle end screw must be countersunk; the countersinks are not modelled.
- **Carrier:** first shape, no stress check, no fillets. Flange screws go in from inside the cup before the hip-pitch actuator is fitted. The RS02's longer cover now notches the carrier's abduction block by 5.5 mm; check its strength there.
- **Bearings, screws, cable routing:** not modelled.
- **Shank blade** (30 × 13 mm printed section): hand estimate about 18 MPa bending at 150 N; consider a carbon tube insert.

## Torso
- **Joints between parts:** nothing fastens the belly pan, mid frames, bulkheads and deck to each other yet. Add brackets or tabs.
- **Cut files:** none for bulkheads, mid frames or deck. Their outline is a union of two shapes, so the DXF needs a trimmed outline.
- **Abduction cables:** the plugs now pass through slots in the deck (top) and notches in the belly pan (bottom). Plan the cable routes from there.
- **Bulkhead screws:** must be countersunk; the carrier face is 1 mm from the bulkhead.
- **Deck:** 300 g solid; add lightening cut-outs and access to the bay.
- **Bay access:** decide how the battery goes in and out.

## Head, neck, tail
- **Verify servo dimensions** against the Feetech datasheet (modelled from memory as 45 × 24.7 × 35 mm, shaft 10 mm from one end, 3 mm horn) and pick the exact models. Then add mounting ears, screw holes and horn patterns; none are modelled.
- **Head:** two plain hollow boxes. Needs a split line so it can be printed and opened, camera mounts, and shaping. The shell is about 230 g at 2.5 mm walls; thin it.
- **Cameras:** keep-outs assume Raspberry Pi Camera Module 3; confirm once the computer is chosen. The muzzle partly blocks the lower inner field of view.
- **Tail:** modelled as a rigid Ø22 × 300 mm rod (137 g solid). Make it hollow or tapered, and design how the TPU attaches to the yoke.
- Head pan was swept clear to 62° before the check ran out of time; rerun to 70°.

## Checks still to run
- Inward abduction: at −36° the front and rear legs on the same side collide (thigh plates, standoffs, shanks; on the linkage variant also the pushrods). Find the exact inward limit, and decide whether it is a joint limit or a gait rule (legs need not all swing in together).
- Still to rerun: hip pitch and knee sweeps, and head pan and tail sweeps. Use a large time budget; hip pitch previously ran out of budget at 114° back and 44° forward without a collision. `build.js pose` now runs through the CLI without `--app`.
- Set real joint limits from the sweeps (knee fold 145° from the old model).
- A rear leg reaching forward about 45° from standing touches the front leg's shank. This is a gait-planning limit.

## Later
- Electronics: main computer, CAN interface, IMU, power distribution.
- Confirm the actuator order and check current prices.
- Recheck mass once pulley teeth, brackets and real servos exist.

## Reference: RobStride 02 mounting facts (from the official STEP file)
- Angles below are from the plug direction, in the actuator frame.
- Output flange Ø30: 6× M4 (7 mm deep minimum) at 30° + 60°k and 3× Ø4 pins at 0/120/240° on Ø24; flange face 0.5 mm proud of the Ø43 × 3.5 pilot.
- Housing Ø78.5 × 28; rear cover Ø65 × 13.5; overall 45.5 mm.
- Front: 9× M3 on Ø73 at 0° + 40°k (in line with the pins). Rear: 6× M3 on Ø73 at 40/80/120/240/280/320°. Three rear screw heads Ø5.6 × 2.35 proud at 0/160/200°.
- Two XT30PB(2+2)-M sockets in the cover rim at 0° and 180°, facing outward: 15.5 wide, 5.2 axial, 2.8–8.0 mm behind the rear annulus, face at r 35.2. Mating plug AMASS XT30(2+2)-F.
- Official STEP and manual: github.com/RobStride/Product_Information (`Product Literature/CAN2.0/RS02/RS02-20261030.stp`). A copy is in `cad/actuators/build/` (git-ignored; licence not checked, so not committed).

## Unverified estimates
- Knee torque need (new leg, 12.5 kg: about 5.3 N·m RMS and 10–16 N·m peak at the actuator while trotting) is a quasi-static hand calculation (vertical foot force only, half-sine stance force, no leg inertia), not a simulation.
- Abduction torque is about 5 N·m at a 100 N foot load (foot is 52 mm outboard of the axis), against a 6 N·m rating.
- Power figures are scaled from commercial robots.
- Printed-part masses assume half to nine-tenths of solid volume.
