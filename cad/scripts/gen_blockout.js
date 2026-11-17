// Generates the SolidCraft command scripts for the whole-robot block-out.
// Usage: node cad/scripts/gen_blockout.js   (writes JSON files into cad/robot/build/)
// Frame: X forward, Y left, Z up. Origin at torso centre, on the hip abduction axes' height.
const fs = require("fs");
const path = require("path");

// ---- layout numbers (mm) ----
const HIP_X = 210;        // hip pitch axis, fore/aft from centre
const ABD_Y = 60;         // abduction axis, lateral from centreline
const L_THIGH = 240, L_SHANK = 240;
const STAND_HIP = 35, STAND_KNEE = -70; // standing pose, degrees

const legs = [
  { id: "FL", sx: 1, sy: 1 },
  { id: "FR", sx: 1, sy: -1 },
  { id: "RL", sx: -1, sy: 1 },
  { id: "RR", sx: -1, sy: -1 },
];

const feats = [];
const cyl = (name, body, op, d, h, base, axis) =>
  feats.push({ command: "solid.cylinder", params: Object.assign(
    { diameter: d, height: h, base, axis, operation: op, name },
    op === "new" ? { body_name: body } : { targets: [body] }) });
const box = (name, body, op, l, w, h, center) =>
  feats.push({ command: "solid.box", params: Object.assign(
    { length: l, width: w, height: h, center, operation: op, name },
    op === "new" ? { body_name: body } : { targets: [body] }) });

feats.push({ command: "parameters.add", params: { name: "L_thigh", expression: L_THIGH + " mm" } });
feats.push({ command: "parameters.add", params: { name: "L_shank", expression: L_SHANK + " mm" } });

// ---- torso ----
box("Deck_Core", "TorsoDeck", "new", 326, 208, 4, [0, 0, 58]);
box("Deck_Spine", "TorsoDeck", "join", 600, 80, 4, [0, 0, 58]);
box("Floor_Plate", "TorsoFloor", "new", 326, 208, 4, [0, 0, -52]);
box("SideL_Plate", "TorsoSideL", "new", 320, 4, 106, [0, 102, 3]);
box("SideR_Plate", "TorsoSideR", "new", 320, 4, 106, [0, -102, 3]);
for (const sx of [1, -1]) {
  const n = sx > 0 ? "BulkheadF" : "BulkheadR";
  box(n + "_Plate", n, "new", 3, 200, 106, [sx * 161.5, 0, 3]);
  for (const sy of [1, -1])
    cyl(n + "_Pilot" + (sy > 0 ? "L" : "R"), n, "cut", 43.2, 5, [sx * 159, sy * ABD_Y, 0], [sx, 0, 0]);
}
box("Battery_Keepout", "BatteryBay", "new", 200, 120, 80, [0, 0, -8]);
// neck: tilt servo at the neck base (whole neck nods), pan servo at the neck top, head on the pan axis
const NECK_LEN = 92.5, NECK_BASE = [265, 0, 58];
const NT = [NECK_BASE[0] + NECK_LEN * Math.SQRT1_2, 0, NECK_BASE[2] + NECK_LEN * Math.SQRT1_2]; // neck top
const r1 = (v) => Math.round(v * 10) / 10;
box("NeckTilt_Block", "NeckTilt", "new", 45, 25, 36, [NECK_BASE[0], 0, NECK_BASE[2] - 20]);
cyl("Neck_Tube", "Neck", "new", 50, NECK_LEN, NECK_BASE, [1, 0, 1]);
box("HeadPan_Block", "HeadPan", "new", 45, 25, 36, [r1(NT[0] + 3), 0, r1(NT[2] + 18)]);
box("Head_Skull", "Head", "new", 110, 100, 90, [r1(NT[0] + 33), 0, r1(NT[2] + 46)]);
box("Head_Muzzle", "Head", "join", 100, 60, 50, [r1(NT[0] + 138), 0, r1(NT[2] + 26)]);
// tail
box("TailPan_Block", "TailPan", "new", 30, 25, 36, [-315, 0, 45]);
cyl("Tail_Rod", "Tail", "new", 24, 320, [-330, 0, 45], [-1, 0, 0.5]);

// ---- legs ----
for (const { id, sx, sy } of legs) {
  const hx = sx * HIP_X;
  const X = (lx) => hx + sx * lx;       // leg-local x -> world
  const Y = (ly) => sy * (ABD_Y + ly);  // leg-local y -> world
  const ax = [sx, 0, 0], ay = [0, sy, 0];
  const motor = (body, front, axisLocal) => {
    // front = leg-local coordinate of the housing front face along the motor axis; dir = +1/-1 output direction
    const { at, dir } = front;
    const P = (v) => axisLocal === "x" ? [X(v), Y(0) - sy * 0, 0] : [hx, Y(v), 0];
    const A = axisLocal === "x" ? ax : ay;
    const lo = (a, b) => Math.min(a, b); // base is always the lower local coordinate
    cyl(body + "_Body", body, "new", 78.5, 28, P(lo(at, at - dir * 28)), A);
    cyl(body + "_Cover", body, "join", 63, 8.5, P(lo(at - dir * 28, at - dir * 36.5)), A);
    cyl(body + "_Pilot", body, "join", 43, 3.5, P(lo(at, at + dir * 3.5)), A);
    cyl(body + "_Flange", body, "join", 30, 4, P(lo(at, at + dir * 4)), A);
  };
  // abduction motor: axis along X through the abduction axis (leg-local y = 0)
  motor("MotorA_" + id, { at: -50, dir: 1 }, "x");
  // carrier: ring around hip-pitch motor + back plate on the abduction flange
  const C = "Carrier_" + id;
  cyl(C + "_Ring", C, "new", 88, 24, [hx, Y(-14), 0], ay);
  box(C + "_BackPlate", C, "join", 6, 24, 70, [X(-43), Y(-2), 0]);
  cyl(C + "_Bore", C, "cut", 79, 26, [hx, Y(-15), 0], ay);
  motor("MotorH_" + id, { at: 14, dir: 1 }, "y");
  // thigh plates
  for (const [nm, y0] of [["ThighInner_", 18], ["ThighOuter_", 42]]) {
    const B = nm + id;
    cyl(B + "_HipDisc", B, "new", 90, 4, [hx, Y(y0), 0], ay);
    box(B + "_Web", B, "join", 50, 4, "L_thigh", [hx, Y(y0 + 2), "-L_thigh/2"]);
    cyl(B + "_KneeDisc", B, "join", 56, 4, [hx, Y(y0), "-L_thigh"], ay);
  }
  cyl("ThighOuter_" + id + "_PilotHole", "ThighOuter_" + id, "cut", 43.4, 6, [hx, Y(41), 0], ay);
  motor("MotorK_" + id, { at: 46, dir: -1 }, "y");
  cyl("HipPulley_" + id + "_20T", "HipPulley_" + id, "new", 31.8, 18, [hx, Y(24), 0], ay);
  const S = "Shank_" + id;
  cyl(S + "_KneePulley30T", S, "new", 47.7, 16, [hx, Y(24), "-L_thigh"], ay);
  box(S + "_Bar", S, "join", 28, 16, "L_shank", [hx, Y(32), "-L_thigh - L_shank/2"]);
  cyl(S + "_Foot", S, "join", 44, 24, [hx, Y(20), "-L_thigh - L_shank"], ay);
}

// ---- components and joints ----
const asm = [];
const comp = (name, bodies) => {
  asm.push({ command: "component.create", params: { name, parent: "root", activate: false } });
  asm.push({ command: "component.move_bodies", params: { bodies, component: name } });
};
const joint = (name, a, b, point, z, limits) =>
  asm.push({ command: "joint.as_built", params: { type: "revolute", a, b,
    at: { occurrence: a + ":1", point, z }, name, limits: [limits] } });

comp("Torso", ["TorsoDeck", "TorsoFloor", "TorsoSideL", "TorsoSideR", "BulkheadF", "BulkheadR",
  "BatteryBay", "NeckTilt", ...legs.map((l) => "MotorA_" + l.id)]);
comp("NeckAsm", ["Neck", "HeadPan"]);
comp("HeadAsm", ["Head"]);
comp("TailPanLink", ["TailPan"]);
comp("TailAsm", ["Tail"]);
for (const { id } of legs) {
  comp("HipCarrier_" + id, ["Carrier_" + id, "MotorH_" + id]);
  comp("Thigh_" + id, ["ThighInner_" + id, "ThighOuter_" + id, "MotorK_" + id, "HipPulley_" + id]);
  comp("LowerLeg_" + id, ["Shank_" + id]);
}
joint("NeckPitch", "Torso", "NeckAsm", NECK_BASE, [0, 1, 0], [-40, 40]);
joint("HeadYaw", "NeckAsm", "HeadAsm", [r1(NT[0] + 3), 0, r1(NT[2] + 36)], [0, 0, 1], [-70, 70]);
joint("TailYaw", "Torso", "TailPanLink", [-300, 0, 45], [0, 0, 1], [-60, 60]);
joint("TailPitch", "TailPanLink", "TailAsm", [-330, 0, 45], [0, 1, 0], [-60, 60]);
const pose = [];
for (const { id, sx, sy } of legs) {
  const hx = sx * HIP_X;
  joint("HipAbduction_" + id, "Torso", "HipCarrier_" + id, [hx - sx * 46, sy * ABD_Y, 0], [1, 0, 0], [-45, 45]);
  joint("HipPitch_" + id, "HipCarrier_" + id, "Thigh_" + id, [hx, sy * (ABD_Y + 18), 0], [0, 1, 0], [-120, 120]);
  joint("Knee_" + id, "Thigh_" + id, "LowerLeg_" + id, [hx, sy * (ABD_Y + 32), -L_THIGH], [0, 1, 0], [-150, 150]);
  pose.push({ command: "joint.drive", params: { joint: "HipPitch_" + id, value: STAND_HIP } });
  pose.push({ command: "joint.drive", params: { joint: "Knee_" + id, value: STAND_KNEE } });
}

const out = path.join(__dirname, "..", "robot", "build");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "1_features.json"), JSON.stringify({ commands: feats }, null, 1));
fs.writeFileSync(path.join(out, "2_assembly.json"), JSON.stringify({ commands: asm }, null, 1));
fs.writeFileSync(path.join(out, "3_pose_stand.json"), JSON.stringify({ commands: pose }, null, 1));
fs.writeFileSync(path.join(out, "robot_blockout_all.json"), JSON.stringify({ commands: [...feats, ...asm, ...pose] }, null, 1));
console.log(`features: ${feats.length}, assembly: ${asm.length}, pose: ${pose.length}`);
