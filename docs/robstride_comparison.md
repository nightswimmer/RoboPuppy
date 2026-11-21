# RobStride actuator comparison

Collected November 2026 to choose the leg actuators. Prices change often: check the seller before ordering.

**Decision (November 2026): RobStride 02, classic CAN version.** It costs about the same as the RS01 from the sellers found, fits with minor changes (see [RS02 as a drop-in](#rs02-as-a-drop-in-for-the-rs01-in-robopuppy)), and leaves room to move to a 48 V battery for about 30 % more joint speed.

## Specifications and prices

| Model | Peak torque | Rated torque | No-load speed | Gear ratio | Weight | Peak torque per kg | Outer Ø ¹ | Length | Voltage (rated / range) | Peak phase current | Torque constant | List price, China (CNY) ² | RobStride direct (USD) ³ | EU resellers (EUR) ⁴ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| RS05 | 5.5 N·m | 1.6 N·m | 480 rpm | 7.75:1 | 191 g | 29 N·m/kg | 46 mm | — | 48 V / 15–60 V | 11 A | 0.94 N·m/A | ¥499 | $110 | — |
| RS00 | 14 N·m | 5 N·m | 315 rpm | 10:1 | 310 g | 45 N·m/kg | 57 mm | — | 48 V / 24–60 V | 15.5 A | 1.48 N·m/A | ¥598 | $125 | €120–140 |
| **RS01** (current choice) | 17 N·m | 6 N·m | 315 rpm | 7.75:1 | 380 g | 45 N·m/kg | 78.5 mm | 40.5 mm | 36 V / 24–50 V | 23 A | 1.22 N·m/A | ¥599 | $130 | €150–170 |
| RS02 | 17 N·m | 6 N·m | 410 rpm | 7.75:1 | 380–405 g ⁵ | 42–45 N·m/kg | 78.5 mm | 45.5 mm | 48 V / 24–60 V | 23 A | 1.22 N·m/A | ¥699 | $145 | €170–190 |
| RS02 IP67 | 17 N·m | 6 N·m | 410 rpm | 7.75:1 | — | — | — | — | 48 V / 24–60 V | 23 A | 1.22 N·m/A | ¥999 | $240 | — |
| RS06 | 36 N·m | 11 N·m | 480 rpm | 9:1 | 621 g | 58 N·m/kg | 88 mm | — | 48 V / 15–60 V | 57 A | 1.09 N·m/A | ¥849 | $210 | €200–230 |
| RS03 | 60 N·m | 20 N·m | 200 rpm | 9:1 | 880 g | 68 N·m/kg | — | — | 48 V / 24–60 V | 43 A | 2.36 N·m/A | ¥999 | $225 | €250–280 |
| RS04 | 120 N·m | 40 N·m | 200 rpm | 9:1 | 1420 g | 85 N·m/kg | 120 mm | — | 48 V / 24–60 V | 90 A | 2.1 N·m/A | ¥1199 | $255 | €300–350 |

Performance figures are from the official user manuals (January 2026 edition). Lengths for RS01 and RS02 are from the official STEP files.

1. Outer diameters other than RS01/RS02 are from the OpenELAB buyer's guide, not the manuals.
2. RobStride's own product sheet (GitHub `Product_Information`), tied to the 13 July 2026 spec. China prices, without shipping or VAT.
3. "At maker" prices on robstride.com as listed by Tolerance Labs (updated October 2026).
4. Growbotics ranges for single units through AliExpress, eBay, OpenELAB and AIFitLab (undated). Likely closest to the real cost for an EU buyer.
5. The RS02 manual says 380 g, apparently copied from the RS01; listings say 405 g, and the STEP model is about 23 % more volume than the RS01.

Prices are assumed to be motor only. The USB-to-CAN debug adapter has been about $10–20 extra; one is enough for the whole robot.

### Common to every model

- 14-bit absolute encoder.
- CAN at 1 Mbps, with three switchable protocols: RobStride private, CANopen and MIT.
- "Rated torque" is measured with the motor bolted to a large heat sink (260 × 280 mm for RS01/RS02). Usable continuous torque in a printed or thin-plate mount is lower.

### Cost of 12 leg actuators

Budget: EUR 1,600–1,900.

| Model | RobStride direct (before shipping and import costs) | EU resellers |
|---|---|---|
| RS01 | ~$1,560 | €1,800–2,040 |
| RS02 | ~$1,740 | €2,040–2,280 |
| RS06 | ~$2,520 | €2,400–2,760 |

## Purchase options seen in listings

- **Only motor:** the actuator alone.
- **Motor with debug:** the actuator plus the USB-to-CAN debugging adapter, used with RobStride Studio on a PC to set IDs, calibrate, update firmware and test.
- **CAN FD version / FD version:** the same motor with CAN FD electronics and firmware. Listings sell it with a USB-to-CAN FD adapter. All motors on one bus should be the same kind, because classic CAN nodes treat CAN FD frames as errors.

RobStride's `Product_Information` repository has CAN FD folders for RS00, RS02, RS03, RS04, RS05, RS06 and RS10P, with the same STEP files as the CAN 2.0 versions, so the mechanics are identical. **The RS01 has no CAN FD version.** Most open-source drivers (Seeed library, Rust `robstride` crate, the community ROS 2 driver) use classic CAN.

The repository also lists two models not compared here: RS10P and EL05 (EduLite, about $80).

## CAN vs CAN FD for RoboPuppy

**What the CAN FD version documents.** The RS02 CAN FD manual (May 2026) gives the same protocol as the classic version: 1 Mbps, 29-bit extended IDs, 8-byte data fields. Baud rate options are 1 M, 500 k, 250 k and 125 k. It documents neither of the two things CAN FD exists for: a faster data phase and frames up to 64 bytes. It needs a CAN FD adapter (RobStride recommends its own USB-CANFD module), and classic CAN hardware cannot read its frames.

**Classic CAN bandwidth is enough.** One extended 8-byte frame takes about 0.13–0.15 ms at 1 Mbps, so a command and its reply take about 0.3 ms per motor.

| Bus layout | Time per full update | Achievable loop rate |
|---|---|---|
| 1 bus, 12 motors | ~3.6 ms | ~200 Hz |
| 2 buses, 6 motors each | ~1.8 ms | ~400 Hz |
| 4 buses, one per leg | ~0.9 ms | ~800 Hz–1 kHz |

A quadruped gait controller typically runs at 50–100 Hz. The position and velocity control (MIT or operation-control mode) runs inside each motor's driver, so the bus does not carry it.

**CAN FD would help** if RobStride firmware later adds a fast data phase or 64-byte frames. That would mean fewer buses and adapters for the same loop rate, and more telemetry (temperatures, faults) without slowing the control loop.

**It costs:**
- It rules out the RS01, which has no CAN FD version.
- It needs CAN FD adapters, both on the robot and for the debug tool.
- Most open-source drivers support classic CAN only.
- Wiring and termination are less forgiving at high data rates, if those ever arrive.

**Conclusion:** classic CAN, with the 12 motors split over two or four buses.

## RS02 as a drop-in for the RS01 in RoboPuppy

Checked against the RS01 and RS02 manual drawings and the official STEP files (both dated 2026-10-30).

**Unchanged:**
- Housing Ø78.5 × 28 mm.
- Front face: 9× M3 on Ø73, 8 mm deep. The RS02 adds three Ø3 holes on the same circle, which can be ignored.
- Ø43 pilot, 3.5 mm high, with the flange 0.5 mm proud of it.
- Output flange: 6× M4 and 3× Ø4 pins on Ø24.
- Torque, currents and torque constant.

**Different:**

| | RS01 | RS02 | Affects |
|---|---|---|---|
| Overall length | 40.5 mm | 45.5 mm | Rear cover sticks out 5 mm further |
| Rear cover | Ø63 × 8.5 mm | Ø65 × 13.5 mm | Hip carrier rear opening (`opening_d` = 65, zero clearance) |
| Rear screw heads | 3, every 120° | 3, two of them 40° apart | Hip carrier head pockets (only on a 3-fold pattern) |
| M4 thread depth in the output flange | 9 mm | 7 mm minimum | Screw lengths into the flange |
| Rated voltage / max | 36 V / 50 V | 48 V / 60 V | Battery choice |
| Plug position | Radial, from the rear cover | Not yet checked | Plug slot in the hip carrier, cable routing |

**Speed depends on the battery.** Both models have the same torque constant, and 315 rpm × 48/36 ≈ 420 rpm, so they appear to share the same winding. The RS02's 410 rpm comes from its 48 V rating. On the planned 10S (36 V) battery an RS02 runs about as fast as an RS01. The gain needs a 12S–13S battery (44–48 V nominal), which the RS01 can't use (50 V max).

**Changes needed to use the RS02:**
1. Hip carrier: widen the rear opening to about 67 mm. Replace the 3-fold head pockets with pockets or clearance at all nine 40° positions, or match the RS02 head layout.
2. Check where the RS02 plug exits and adapt the plug slot.
3. Update the actuator model (`robstride01.sc` → an RS02 part) and re-run the clash checks. The rear covers of the hip-pitch, knee and abduction actuators each stand 5 mm further out.
4. Shorten the M4 screws into the output flanges to suit the 7 mm thread.
5. If the speed gain is the reason to switch, move to a 12S or 13S battery and recheck the servo step-down converter.

## Sources

- RobStride user manuals RS00–RS06 (cdn.shopify.com/s/files/1/0673/6848/5000/files/ROBSTRIDE_0X_User_Manual.pdf)
- RobStride `Product_Information` repository: github.com/RobStride/Product_Information (prices, STEP files, CAN FD folders)
- Tolerance Labs, Best quasi-direct-drive actuators (2026): tolerancelabs.ai/guides/best-quasi-direct-drive-actuators/
- Growbotics, RobStride supplier page: robotics.growbotics.ai/suppliers/robstride
- OpenELAB, RobStride QDD motor comparison guide: openelab.io/blogs/learn/complete-guide-to-robstride-qdd-motors-model-comparison-and-selection
- AIFitLab RS02 listing (purchase options): aifitlab.com/products/robstride-02-motor
