# Handoff – what's left to do

## Next step: detail the leg into real parts
Proposed choices, not yet confirmed by the owner (ask before starting):
- Thigh plates: laser-cut 3 mm aluminium or carbon (they carry the actuator bolt patterns and belt tension).
- Hip carrier, plate spacers, shank, pulleys: 3D printed.
- Knee drive: HTD 5M belt, 15 mm wide, 20:30 teeth. Thigh length may move a few mm from 240 to suit a standard belt length (about 605 mm needed at 240; 600 and 610 are common).
- Knee joint: two flanged ball bearings on a steel shoulder bolt.
- Foot: printed core with a TPU cap.

Open problems in the leg concept:
- The shank lines up with the belt cavity and would hit the belt when folded tightly. Offset the shank or limit the fold angle.
- The hip carrier is a thin ring plus a back plate with no gussets. It needs a real shape that bolts to the hip-pitch actuator's rear face (6× M3 on Ø73) and leaves a slot for the radial XT30 plug.
- No belt tensioner yet.
- Joint limits are placeholders (abduction ±45°, hip ±120°, knee ±150°).

RobStride 01 mounting facts to design against:
- Output flange Ø30: 6× M4 (9 mm deep) and 3× Ø4 pin holes on Ø24.
- Fixed Ø43 pilot ring, 3.5 mm high, around the flange; flange face is 0.5 mm proud of it.
- Housing: 9× M3 on the front face and 6× M3 on the rear, all on Ø73, 8 mm deep. No side holes.
- Rear cover Ø63 × 8.5 mm; three screw heads stand 3 mm proud on the rear annulus.
- Plug exits radially from the rear cover; the keep-out size in the reference model is a guess.
- The official STEP and manual are at github.com/RobStride/Product_Information (not stored in this repo; licence not checked).

## After the leg
- Torso: real bulkheads, side plates and decks; mounts for four abduction actuators; battery and electronics bay; the narrow spine sections that carry the neck and tail past the hips.
- Head, neck and tail: choose the exact servos, model them, design the linkages.
- Run a collision check across the joint ranges on the whole robot.
- Choose electronics: main computer, CAN interface, IMU, power distribution, battery pack (10S, 180–360 Wh).
- Confirm the actuator order and check current prices.
- Recheck the mass budget once real parts exist (target about 11 kg).

## Unverified estimates to revisit
- Knee torque need (about 6 N·m continuous, 15 N·m peak) is a hand calculation, not a simulation.
- Power figures are scaled from commercial robots.
- Head and tail servo prices were not looked up.
