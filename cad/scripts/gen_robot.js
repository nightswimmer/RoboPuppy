// Generates the SolidCraft command script for the whole robot: detailed torso + four detailed legs,
// with head, neck and tail still as placeholder blocks.
// Usage: node cad/scripts/gen_robot.js   then
//   solidcraft-cli run cad/robot/build/robot.json --save cad/robot/robot.sc
// Frame: X forward, Y left, Z up. Origin at the torso centre, on the height of the hip abduction axes.
const fs = require("fs");
const path = require("path");
const { D, buildLeg, rad, r3 } = require("./lib_leg");

// ---- layout (mm) ----
const HIP_X = 210;          // hip pitch axes, fore/aft from centre
const ABD_Y = 42;           // abduction axes, lateral from centreline
const LOBE_R = 40.5;        // torso lower corners: radius about each abduction axis. Must stay below the
                            // thigh plane distance (D.Y_IN = 42) so the legs can swing inward.
const PAN_LOBE_R = 36;      // belly pan lower corners: smaller, to leave room for fastener heads on the thighs
const TORSO_HALF_W = 60;    // torso half width above the abduction axes. Narrow, so the top of a thigh can
                            // swing inward over the axis when the leg abducts.
const TORSO_TOP = 44;       // top of the frames (underside of the deck)
const T_FRAME = 3;          // bulkheads and mid frames (laser-cut aluminium)
const T_DECK = 2;           // top deck (laser-cut aluminium)
const T_PAN = 3;            // belly pan wall (printed)
const X_BULK = HIP_X - 50;  // 160: bulkhead inner face = abduction actuator front face
const X_MID = HIP_X - 78 - T_FRAME; // 129: mid frame inner face; its outer face sits on the actuator rear annulus
const STAND = { hip: 35, knee: -70 };

const cmds = [];
const boxc = (name, body, op, l, w, h, center) =>
  cmds.push({ command: "solid.box", params: Object.assign({ length: l, width: w, height: h, center, operation: op, name },
    op === "new" ? { body_name: body } : { targets: [body] }) });
const cylc = (name, body, op, d, h, base, axis) =>
  cmds.push({ command: "solid.cylinder", params: Object.assign({ diameter: d, height: h, base, axis, operation: op, name },
    op === "new" ? { body_name: body } : { targets: [body] }) });
// torso cross-section: two lobes around the abduction axes (a horizontal stadium) plus a box above the axes.
// YZ plane: sketch x = +Y, sketch y = +Z, normal +X.
const lobes = (name, x0, len, width, op, body) => {
  cmds.push({ command: "sketch.create", params: { plane: "YZ", offset: x0, name: name + "_Sketch" } });
  cmds.push({ command: "sketch.slot.center_to_center", params: { p0: [-ABD_Y, 0], p1: [ABD_Y, 0], width } });
  cmds.push({ command: "sketch.finish", params: {} });
  cmds.push({ command: "solid.extrude", params: Object.assign({ distance: len, operation: op, name: name + "_Lobes" },
    op === "new" ? { body_name: body } : { targets: [body] }) });
};
const section = (body, x0, len, lobeR = LOBE_R) => {
  lobes(body, x0, len, 2 * lobeR, "new", body);
  boxc(body + "_Upper", body, "join", len, 2 * TORSO_HALF_W, TORSO_TOP, [x0 + len / 2, 0, TORSO_TOP / 2]);
};
// point on a circle about an abduction axis (side = +1 left, -1 right), angle from +Z
const onAbd = (side, r, deg) => [r3(side * ABD_Y + r * Math.sin(rad(deg))), r3(r * Math.cos(rad(deg)))];

// ---- bulkheads: abduction actuators bolt on by their front face (9x M3 countersunk, pilot dia 43) ----
for (const [n, x0] of [["BulkheadF", X_BULK], ["BulkheadR", -X_BULK - T_FRAME]]) {
  section(n, x0, T_FRAME);
  for (const side of [1, -1]) {
    const s = side > 0 ? "L" : "R";
    cylc(`${n}_Pilot${s}`, n, "cut", 43.2, T_FRAME + 2, [x0 - 1, side * ABD_Y, 0], "X");
    for (let k = 0; k < 9; k++) {
      const [y, z] = onAbd(side, 36.5, 20 + 40 * k);
      cylc(`${n}_M3_${s}${k}`, n, "cut", 3.4, T_FRAME + 2, [x0 - 1, y, z], "X");
    }
  }
}
// ---- mid frames: bolt to the actuators' rear faces (6x M3), so each pair of actuators is clamped between two plates ----
for (const [n, x0] of [["MidFrameF", X_MID], ["MidFrameR", -X_MID - T_FRAME]]) {
  section(n, x0, T_FRAME);
  for (const side of [1, -1]) {
    const s = side > 0 ? "L" : "R";
    cylc(`${n}_Cover${s}`, n, "cut", 65, T_FRAME + 2, [x0 - 1, side * ABD_Y, 0], "X");
    boxc(`${n}_PlugSlot${s}`, n, "cut", T_FRAME + 2, 18, 18, [x0 + T_FRAME / 2, side * ABD_Y, 37]); // plug exits upward
    [20, -20, 100, -100, 140, -140].forEach((deg, i) => {
      const [y, z] = onAbd(side, 36.5, deg);
      cylc(`${n}_M3_${s}${i}`, n, "cut", 3.4, T_FRAME + 2, [x0 - 1, y, z], "X");
    });
    [60, 180, 300].forEach((deg, i) => {                    // clearance for the proud rear screw heads
      const [y, z] = onAbd(side, 36.5, deg);
      cylc(`${n}_Head_${s}${i}`, n, "cut", 6.5, T_FRAME + 2, [x0 - 1, y, z], "X");
    });
  }
}
// ---- belly pan (printed U-tray between the mid frames; top closed by the deck) ----
const PAN_L = 2 * X_MID;
section("BellyPan", -X_MID, PAN_L, PAN_LOBE_R);
lobes("BellyPan_Inner", -X_MID - 1, PAN_L + 2, 2 * (PAN_LOBE_R - T_PAN), "cut", "BellyPan");
boxc("BellyPan_InnerUpper", "BellyPan", "cut", PAN_L + 2, 2 * (TORSO_HALF_W - T_PAN), TORSO_TOP + 2, [0, 0, (TORSO_TOP + 2) / 2]);
// ---- deck: full-width between the bulkheads, narrow spine out to the neck and tail ----
const zDeck = TORSO_TOP + T_DECK / 2;
boxc("Deck_Core", "Deck", "new", 2 * (X_BULK + T_FRAME), 2 * TORSO_HALF_W, T_DECK, [0, 0, zDeck]);
boxc("Deck_Spine", "Deck", "join", 600, 60, T_DECK, [0, 0, zDeck]);
boxc("Battery_Keepout", "BatteryBay", "new", 200, 110, 72, [0, 0, 2]);

// ---- neck, head and tail placeholders ----
const zTop = TORSO_TOP + T_DECK;
const NECK_LEN = 92.5, NECK_BASE = [265, 0, zTop];
const NT = [NECK_BASE[0] + NECK_LEN * Math.SQRT1_2, 0, NECK_BASE[2] + NECK_LEN * Math.SQRT1_2];
const r1 = (v) => Math.round(v * 10) / 10;
boxc("NeckTilt_Block", "NeckTilt", "new", 45, 25, 36, [NECK_BASE[0], 0, TORSO_TOP - 18]);
cylc("Neck_Tube", "Neck", "new", 50, NECK_LEN, NECK_BASE, [1, 0, 1]);
boxc("HeadPan_Block", "HeadPan", "new", 45, 25, 36, [r1(NT[0] + 3), 0, r1(NT[2] + 18)]);
boxc("Head_Skull", "Head", "new", 110, 100, 90, [r1(NT[0] + 33), 0, r1(NT[2] + 46)]);
boxc("Head_Muzzle", "Head", "join", 100, 60, 50, [r1(NT[0] + 138), 0, r1(NT[2] + 26)]);
const zTail = TORSO_TOP - 18;
boxc("TailPan_Block", "TailPan", "new", 30, 25, 36, [-315, 0, zTail]);
cylc("Tail_Rod", "Tail", "new", 24, 320, [-330, 0, zTail], [-1, 0, 0.5]);

// ---- legs ----
const legs = [
  { id: "FL", sx: 1, sy: 1 }, { id: "FR", sx: 1, sy: -1 },
  { id: "RL", sx: -1, sy: 1 }, { id: "RR", sx: -1, sy: -1 },
].map((l) => Object.assign(l, buildLeg(cmds, { id: l.id, hx: l.sx * HIP_X, abdY: ABD_Y, sx: l.sx, sy: l.sy, kx: 1 })));

// ---- components and joints ----
const comp = (name, bodies) => {
  cmds.push({ command: "component.create", params: { name, parent: "root", activate: false } });
  cmds.push({ command: "component.move_bodies", params: { bodies, component: name } });
};
const joint = (name, a, b, point, z, limits) =>
  cmds.push({ command: "joint.as_built", params: { type: "revolute", a, b,
    at: { occurrence: a + ":1", point, z }, name, limits: [limits] } });
comp("Torso", ["BulkheadF", "BulkheadR", "MidFrameF", "MidFrameR", "BellyPan", "Deck", "BatteryBay", "NeckTilt",
  ...legs.flatMap((l) => l.bodies.torso)]);
comp("NeckAsm", ["Neck", "HeadPan"]);
comp("HeadAsm", ["Head"]);
comp("TailPanLink", ["TailPan"]);
comp("TailAsm", ["Tail"]);
joint("NeckPitch", "Torso", "NeckAsm", NECK_BASE, [0, 1, 0], [-40, 40]);
joint("HeadYaw", "NeckAsm", "HeadAsm", [r1(NT[0] + 3), 0, r1(NT[2] + 36)], [0, 0, 1], [-70, 70]);
joint("TailYaw", "Torso", "TailPanLink", [-300, 0, zTail], [0, 0, 1], [-60, 60]);
joint("TailPitch", "TailPanLink", "TailAsm", [-330, 0, zTail], [0, 1, 0], [-60, 60]);
const pose = [];
for (const l of legs) {
  comp("HipCarrier_" + l.id, l.bodies.carrier);
  comp("Thigh_" + l.id, l.bodies.thigh);
  comp("LowerLeg_" + l.id, l.bodies.lower);
  joint("HipAbduction_" + l.id, "Torso", "HipCarrier_" + l.id, l.joints.abd.point, l.joints.abd.z, l.joints.abd.limits);
  joint("HipPitch_" + l.id, "HipCarrier_" + l.id, "Thigh_" + l.id, l.joints.hip.point, l.joints.hip.z, l.joints.hip.limits);
  joint("Knee_" + l.id, "Thigh_" + l.id, "LowerLeg_" + l.id, l.joints.knee.point, l.joints.knee.z, l.joints.knee.limits);
  pose.push({ command: "joint.drive", params: { joint: "HipPitch_" + l.id, value: STAND.hip } });
  pose.push({ command: "joint.drive", params: { joint: "Knee_" + l.id, value: STAND.knee } });
}

const out = path.join(__dirname, "..", "robot", "build");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "robot.json"), JSON.stringify({ commands: [...cmds, ...pose] }, null, 1));
console.log("commands:", cmds.length + pose.length, "| width over knee actuators:", 2 * (ABD_Y + D.Y_MAX));
