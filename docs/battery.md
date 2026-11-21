# Battery

**Decision (November 2026): 13S2P Li-ion, 21700 high-drain cells.** It replaces the earlier 10S (36 V) plan. The 13S voltage goes with the RobStride 02 actuators, which are rated for 48 V and give about 30 % more joint speed than at 36 V (see [robstride_comparison.md](robstride_comparison.md)).

These are estimates, not measurements. The power figures are scaled from commercial robots, and the torque need is a hand calculation.

## Assumptions

- **Cell:** 21700, 5 Ah, 3.6 V nominal (18 Wh). The same cell as the earlier 10S plan.
- **Mass:** about 80 g per cell all-in, including the BMS, nickel strip, insulation and wrap. That matches the earlier 10S1P figures: 180 Wh, 0.8 kg.
- **Usable energy:** about 80 % of nominal, leaving margin for voltage sag, ageing and not running the pack flat.
- **Robot mass:** about 11 kg with the earlier 10S1P pack (0.8 kg) on board.
- **Power draw:** 40–60 W standing, 120–200 W trotting, 0.5–1 kW peaks, all at 11 kg. Draw and joint torque are scaled in proportion to the robot's mass.
- **Knee torque need:** about 6 N·m continuous at 11 kg (hand calculation).

## 13S voltages

| | Per cell | 13S pack | RS02 limits |
|---|---|---|---|
| Full charge | 4.2 V | 54.6 V | 60 V max (5.4 V margin) |
| Nominal | 3.6 V | 46.8 V | 48 V rated |
| Empty (cut-off) | 3.0 V | 39 V | 24 V min |

No-load speed scales with voltage: about 400 rpm at nominal and about 330 rpm at cut-off. Even empty, that is a bit above the RS01's 315 rpm at 36 V.

## Pack size options

| | **13S2P (chosen)** | 13S3P | 13S4P |
|---|---|---|---|
| Cells | 26 | 39 | 52 |
| Capacity | 10 Ah | 15 Ah | 20 Ah |
| Energy, nominal | 468 Wh | 702 Wh | 936 Wh |
| Energy, usable (~80 %) | ~375 Wh | ~560 Wh | ~750 Wh |
| Pack mass | ~2.1 kg | ~3.1 kg | ~4.2 kg |
| Extra mass vs. 10S1P (0.8 kg) | +1.3 kg | +2.3 kg | +3.4 kg |
| Robot mass | ~12.3 kg (+12 %) | ~13.3 kg (+21 %) | ~14.4 kg (+31 %) |
| Trotting power (scaled) | 135–225 W | 145–240 W | 155–260 W |
| **Trotting runtime** | **~1.7–2.8 h** | ~2.3–3.9 h | ~2.9–4.8 h |
| Standing power (scaled) | 45–67 W | 48–73 W | 52–78 W |
| Standing runtime | ~5.5–8 h | ~7.5–11.5 h | ~9.5–14 h |
| Pack current at a 1 kW peak (empty pack, 39 V) | 26 A | 26 A | 26 A |
| Per-cell current at that 1 kW peak | 13 A | 8.5 A | 6.5 A |
| Per-cell current at a 2 kW burst (51 A, e.g. a jump) | 26 A | 17 A | 13 A |
| Knee torque need (scaled from 6 N·m) | ~6.7 N·m | ~7.3 N·m | ~7.8 N·m |
| Fits the current 200 × 110 × 72 mm keep-out | Yes, with room for the BMS | Tight: 39 of about 45 cell spots, BMS barely fits | No |

### Why 2P

- **Runtime is already enough:** about 2–3 h of trotting, against 1–2 h in the earlier 10S plan.
- **Mass hurts more than runtime helps:** each extra parallel group adds about 1 kg. The knee torque need is already at the RS02's 6 N·m rating, which assumes a large heat sink. 3P or 4P would push it 20–30 % over.
- **Space:** 2P fits the existing torso bay with room to spare. 3P is tight, and 4P would need a bigger bay.

## Cell choice

With only two cells in parallel, each cell carries half of the pack current: about 13 A at a 1 kW peak and 26 A in a 2 kW burst. That needs **high-drain cells rated 25 A or more continuous**. Examples are the Samsung 50S and the Molicel P45B or P50B; check current datasheets and prices before buying. High-capacity cells such as the Samsung 50E are rated only about 10 A continuous, which is too low at 2P.

Buy all 26 cells from one batch, from a reputable seller (fakes and re-wraps are common), and match their voltages before assembly.

## Pack layout

- **Upright:** 26 cells on a 21.5 mm grid (for example 6 × 5 with four empty spots) take about 130 × 108 mm of the 200 × 110 mm floor. That leaves about 70 × 110 mm for the BMS, fuse and connector. The 70 mm cells only just fit the 72 mm height once nickel strip and insulation are added.
- **Lying down:** 2 along × 5 across × 3 layers gives 30 spots in about 140 × 105 × 63 mm.

The current keep-out (200 × 110 × 72) is big enough either way. It still clips the belly pan's corners, a known clash in HANDOFF.md.

## Electrical system

- **BMS:** 13S, rated about 30 A continuous and 60 A peak or more, with cell balancing. 13S is the standard 48 V e-bike pack, so BMS boards, chargers and even ready-made packs are cheap and easy to find.
- **Charger:** 54.6 V CC/CV, 2–4 A. That is 0.2–0.4 C, roughly 3–5 h from empty.
- **Main fuse and switch:** a fuse sized for the peaks (about 40–60 A), and an anti-spark switch or connector, because the motor drivers have large input capacitors.
- **Regenerative braking:** when the motors brake, they push energy back onto the bus. With a full pack (54.6 V) this can exceed the RS02's 60 V limit, and the BMS may block charge current when full. Either fit a braking resistor (RobStride sells a discharge module) or charge only to 4.1 V per cell (53.3 V).
- **Step-down converters:** the 12 V converter for the head and tail servos and the computer supply need an input rating of 60 V or more. Many cheap modules only take 40 V.
- **CAN buses:** the motors take power from the same bus they are wired to. See the CAN notes in [robstride_comparison.md](robstride_comparison.md).

## Transport

Packs over 160 Wh can't go on passenger flights, either checked or in cabin. The 13S2P pack (468 Wh) has to be shipped as dangerous goods or built at the destination.

## Open points

- Choose the cell model and check its datasheet: continuous and pulse current, mass, price.
- Choose the BMS, fuse and connector, and decide how to handle regen.
- Resize the battery keep-out to the real pack and fix its clash with the belly pan.
- Recheck the robot's mass and the knee torque with the 13S2P pack and the RS02 actuators: about +1.3 kg for the battery and about +0.3 kg for the motors.
