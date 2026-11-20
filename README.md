# RoboPuppy

A Labrador-sized quadruped robot dog, built from 3D-printed and laser-cut parts and designed in SolidCraft.

![Side view](cad/robot/robot_side.png)

## Status
First detailed design pass. The whole robot is modelled as an articulated assembly: torso, four legs, neck, head and tail. Every part is its own file, linked into the assemblies, so the bill of materials comes straight from the model. Fasteners, servo mounts and some drive details are still missing, and nothing has been built yet.

## Design targets
- Torso about 60 cm long, with the rest scaled to a dog of that size
- 16 actuated axes: 3 per leg, 2 for the head (neck tilt and head pan), 2 for the tail
- Dynamic trotting
- About 11 kg all-up
- Central torso bay for battery and electronics

## Actuators
| Joints | Actuator |
|---|---|
| 12 leg joints | RobStride 01 quasi-direct-drive (17 N·m peak, 380 g, CAN, 36 V) |
| Neck tilt, head pan, tail wag, tail lift | Feetech STS-family serial bus servos |

## Design
![Robot](cad/robot/robot_iso.png)

- **Legs:** an abduction actuator on the torso, a hip-pitch actuator in a printed carrier, and a knee actuator at the hip that drives the knee through a 1.5:1 HTD 5M belt between two laser-cut thigh plates. The shank, knee pulley and foot core are one printed part.
- **Shared parts:** left and right legs are mirror images built from the same parts. Each fabricated part is symmetric, or works turned over, so one print or cut file serves both sides. One hip carrier design fits all four hips.
- **Torso:** each pair of abduction actuators is clamped between two aluminium plates. A printed belly pan forms the central bay and an aluminium deck closes the top.
- **Neck and head:** a tilt servo on the deck nods the whole neck; a pan servo at the top of the neck turns a hollow printed head with a camera behind each eye.
- **Tail:** a wag servo and a lift servo at the tail root move a flexible TPU tail.

![Leg](cad/leg/leg.png)

| Measure | Value |
|---|---|
| Torso structure length | 612 mm |
| Hip spacing, front to rear | 420 mm |
| Width | 323 mm |
| Thigh / shank | 242 mm / 242 mm |
| Back height, standing | about 470 mm |
| Estimated mass | 10.5–11.2 kg |

The bill of materials is in [cad/robot/bom.csv](cad/robot/bom.csv): 24 items, 18 of them fabricated.

## Repository
- `cad/parts/` – one design file per unique part, purchased parts included
- `cad/leg/` – single-leg assembly
- `cad/robot/` – whole-robot assembly, renders and bill of materials
- `cad/scripts/` – generators: `dims.js` (all dimensions), `parts.js` (the parts), `assemblies.js` (leg and robot), `build.js` (runs them)
- `cad/actuators/` – RobStride 01 reference model from the official drawing
- `.claude/skills/cad-modelling/` – the modelling conventions the generators follow

The models are generated from scripts. Every feature comes from a fully constrained sketch, and all dimensions live in one table. To rebuild after changing a dimension (needs SolidCraft installed), run from the repository root:

```
node cad/scripts/build.js all            # every part, then the leg and the robot
node cad/scripts/build.js parts shank    # one part
node cad/scripts/build.js symmetry       # check that parts used on both sides equal their mirror image
```

Production files (cut files, print files, STEP) are not stored in the repository. They will be exported once the design is complete.

## Licence
See [LICENSE](LICENSE).
