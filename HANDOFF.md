# Handoff – what's left to do

## Next: the linkage leg (main design)
The new leg is now in the part files, `leg_linkage.sc`, `robot_linkage.sc` and the rig, all from `dims.js` and `lib/legshape.js` (see PROJECT_INSTRUCTIONS.md, Decisions). A change tried in the rig goes into `dims.js`; then rebuild the affected parts, `leg_linkage`, `robot_linkage` and `rig`.

1. **Remaining joint ranges:** abduction (±45°) and hip pitch (±120°) are still placeholders, in `LIMITS` in `assemblies.js` and `rig.js`. Find them in the rig or with `build.js pose robot_linkage HipPitch ...`. Known: abduction outward about 17° (hip-pitch plug and deck spine), inward 36° (same-side legs collide; checked on the old leg).
2. **Knee bushings (now more urgent):** pick the real part (8 × 10 flanged polymer bushing, 15 mm flange; modelled 1 mm flange, 5 mm sleeve as `bush_*` in `dims.js`). Each gap from a shank plate to its thigh plate is now 2.5 mm, so a 1 mm flange leaves 1.5 mm of sideways play each way. The lever pin's Chicago screw heads clear the thigh plates by only 0.7 mm (barrel head, inner side) and 0.8 mm (screw head, outer side), so the play must stay well below that. Shim each flange with about 1.3–1.4 mm, or take a thicker flange, and model the shims. Check the bushing's load rating against the knee load (axle force about 1 kN from the rod plus the foot load).
3. **Fasteners not modelled:** the M4 foot bolt through the core and plates (about M4 × 25–30 with a nyloc nut), the M3 screws into the shank standoffs (flush or countersunk: the shank plates run 2.5 mm inside the thigh plates), the knee axle end screws, and the crank-end pin of the rod (see item 9). The lever pin is done (Chicago screw M4 × 15 and two DIN 988 shims).
   - **M3 × 9 standoffs** (shank spacers) are less common than M3 × 10. Check they can be bought; otherwise use a Ø6 spacer tube cut to 9 mm with a longer screw.
4. **Foot:** core and pad are first shapes. Decide how the TPU pad is held on the core (it is only trapped by the plates in its slots), and check the 4 mm side walls of the core beside the slots. The core's material is not chosen (PETG or similar).
5. **Mass:** re-estimate with the new leg (plates, tube, bushings, foot), the RS02 and the 13S2P pack.
6. **Open points on the new leg:**
   - **Plate ties:** the lowest thigh standoff is 145 mm below the hip, so in the lower 55 mm only the knee axle ties the two thigh plates. The thigh is also narrowest there (about 34 mm). Check the stiffness, or add a tie in front of the knee where the shank does not pass.
   - **Thin cover over the rod:** the thigh's front edge is only about 1.5 mm in front of the rod at the extreme folds, around 120–150 mm below the hip. That's enough as a cover, but check it once fasteners and real rod-end sizes are in.
   - **Rod and lever forces:** at the actuator's 17 N·m peak the rod sees 0.78–1.0 kN over 70–140° of fold and up to 2.3–2.5 kN at the fold ends. The shank plate round the lever pin is checked (R11 boss, hole cut Ø4.8 and reamed 5 H7, 5754-H22 or better; see PROJECT_INSTRUCTIONS.md). Still to check: the SA5 T/K rod ends' rated static and dynamic loads against 2.5 kN and 1 kN.
   - **Shank plate material:** ask the laser-cutting service which 5754 temper they stock, and ask for H22/H32 (H111 works, with less margin). The lever pin holes are cut at Ø4.8 (as modelled); ream them to 5 H7.
   - **Rod outside the thigh:** the lever pin and rod end stick out of the knee round a little (accepted by the owner, as on the Unitree legs). Check that they clear the ground and the other legs when lying down.
   - **Torque margin:** the RS02 knee is within its rating for trotting, but it has about 60% of the Go2's torque per kg. Options left for later: a 1.5:1 reduction before the crank, or RobStride 06 knees.
7. **Rig maintenance:** the rig's legs are its own bodies (envelopes without holes, bushings or foot slots), built from the same dims and outlines. If a new leg part is added, add an envelope for it in `rig.js`. If live contact is ever wanted, the rig needs a simplified torso, at least 2 mm clearance at every joint, and contact sets that only pair parts that set real limits.
8. **Belt variant (frozen by the owner at 242 mm):** it still builds, with its own `lt_belt`/`ls_belt`. Decide some day whether to drop it; if so, remove `leg.sc`, `robot.sc`, `bom.csv`, `leg_bom.csv` and the belt-only parts (RP-102 to RP-108, the pulley, idler bearings and bolt, M3 × 35 standoffs).
9. **Crank-end pin of the rod (not chosen yet):** the crank (RP-114) has a blind M5 thread at the rod pin, only 5 mm deep in aluminium, holding the rod-end ball on one side only (single shear). Suggested: an ISO 7379 shoulder screw with a Ø5 shoulder (M4 thread; change the crank hole to M4), in a steel thread insert (Helicoil) or with a thicker boss, plus a thin spacer on the ball's inner ring so the rod-end housing can tilt without rubbing the crank. Check whether there is room behind the crank for a through bolt (the actuator face is close).

## Then: finish the RobStride 02 and 13S2P switch
The CAD now uses the RobStride 02 (`cad/parts/robstride02.sc`). What is left of the switch:

1. **Battery keep-out:** size it for the 13S2P pack (26 × 21700 cells plus BMS; see `docs/battery.md`), and fix its clash with the belly pan at the same time.
2. **Mass:** add about 1.3 kg for the battery and about 0.3 kg for the motors to the mass estimate (the knee torque estimate already assumes 12.5 kg).
3. **Power:** the head and tail servo step-down converter needs a 60 V or higher input rating. Regen with a full pack (54.6 V) can exceed the RS02's 60 V limit: plan a braking resistor, or charge only to 4.1 V per cell.
4. **Hip-pitch actuator plug and the deck spine (left for later by the owner):** each hip-pitch actuator's upward plug swings through the deck spine between about 18° and 36° of outward abduction (212 mm³ at 25°). The outward abduction limit is about 17° until this is solved (before: just under 36°, where the hip carrier meets the deck). Options: notch the deck spine edges, narrow the spine near the hips, turn the hip-pitch actuators so the plugs point fore and aft (the carrier is symmetric every 60°, so 60° steps are free), or use a right-angle plug.
5. **Abduction plug and mid frame:** the lower plug keep-out of each abduction actuator overlaps the 3 mm mid frame by 0.6 mm (82 mm³ each, through the new tab). The real socket starts 2.8 mm behind the rear face. Measure a real XT30(2+2)-F plug with its cable, or make the mid frame 2 mm (`t_frame` is shared; a separate thickness affects `x_mid`, the rib roots and the belly pan).
6. **Plug keep-out size:** `rs_plug_*` in `dims.js` is an estimate (16 wide, 6 axial, out to 15 mm past the socket face). The deck slots, belly-pan notches and mid-frame notch follow it. Update it once a plug is in hand.
7. **M4 flange screws (not modelled):** the RS02 flange thread is only 7 mm deep. Suggested: M4 × 12 in the hip carrier (6.5 mm counterbore floor, about 5.5 mm engagement) and M4 × 8 or × 10 through the 3 mm thigh plate. Confirm when the hardware list is made.
8. **Checks still to rerun with the RS02:** hip-pitch sweeps on both variants (the abduction poses, the standing pose and the linkage knee poses are done).
9. **README images** predate the RS02, the spacer and ribs, and the new leg (see below).

## Linkage knee (open points)
- **Hip-pitch flange screws:** the rod passes about 1 mm over the hip-pitch actuator's flange screw heads at full extension; use low-profile heads. Screws are not modelled, so the clash check cannot see this.
- **Crank orientation:** the crank's flange holes are not turned to match the actuator's hole pattern in the model (the motor model is static). Cosmetic.
- **Rod ends:** both modelled as right-hand thread. Use one left-hand (SAL5 T/K) and one right-hand so the rod length (knee zero) can be adjusted without unbolting.
- **Pushrod tube on arrival:** check the temper with a bend test on an offcut (T6 barely flexes and springs back; O temper bends permanently), and check that the bore is 4.0–4.2 mm so the M5 thread is full depth. Practise the tap on an offcut.
- **Rod-end thread stud** not modelled.
- **Checks not run on the linkage robot:** hip-pitch sweeps and abduction poses with the new leg. A continuous knee sweep is not possible (`joint.find_limits` stalls because the rod ends touch the crank and lever face to face); the discrete knee poses are done.

## Open question for the owner
- **Purchasing list:** the CAD BOMs (`cad/robot/bom*.csv`, `cad/leg/leg*_bom.csv`) are regenerated by every build and list only modelled parts. Nothing lists the battery, BMS, converters, compute, CAN wiring, connectors or fasteners. Suggested: a hand-maintained `docs/purchasing_bom.md` that points to the CAD BOMs for the mechanical parts. The owner has not decided yet.
- Remove the remaining superseded files? (`cad/leg/leg_module_concept.sc`, `cad/robot/robot_blockout.sc` and its two renders, `cad/scripts/gen_blockout.js`, `cad/actuators/RS01_reference.sc`.) `cad/parts/robstride01.sc` is kept by the owner's choice, but nothing uses it and its definition is gone from `parts.js`; note that its front and rear screw patterns are 20° out of phase with the real actuator.
- Which of the clashes below should be fixed, and how?

## Clashes found in the model (all still present in the latest check)
- **Lever pin and shank plates (intended):** each Chicago screw overlaps each shank plate by 4.6 mm³, because the pin hole is modelled at its cut size (Ø4.8) and reamed to 5 H7 later.
- **Shank and foot pad (belt variant only):** the shank blade passes through the TPU pad ring on every leg (about 2,500 mm³). Shorten the blade to the foot core or notch the pad. The linkage leg's foot is slotted and clash-free.
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
- **README images** (`cad/robot/robot_side.png`, `robot_iso.png`, `cad/leg/leg.png`) are out of date: they show the RS01 belt robot. Regenerate them from the linkage robot. The named views in `build.js check` frame badly, so set explicit cameras, render through the `solidcraft` MCP (`screenshot` with a camera target, yaw, pitch and distance), or capture from the app by hand.

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
- Inward abduction: at −36° the front and rear legs on the same side collide (thigh plates, standoffs, shanks; on the linkage variant also the pushrods; checked on the old leg, recheck with the new one). Find the exact inward limit, and decide whether it is a joint limit or a gait rule (legs need not all swing in together).
- Still to rerun: hip pitch and knee sweeps, and head pan and tail sweeps. Use a large time budget; hip pitch previously ran out of budget at 114° back and 44° forward without a collision. `build.js pose` now runs through the CLI without `--app`.
- Set real joint limits from the sweeps (belt knee fold 145° from the old model; linkage knee 60–159° is set).
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
- Knee torque need (linkage leg, 12.5 kg: about 5.3 N·m RMS and 10–16 N·m peak at the actuator while trotting) is a quasi-static hand calculation (vertical foot force only, half-sine stance force, no leg inertia), not a simulation.
- Abduction torque is about 5 N·m at a 100 N foot load (foot is 52 mm outboard of the axis), against a 6 N·m rating.
- Power figures are scaled from commercial robots.
- Printed-part masses assume half to nine-tenths of solid volume.
