// Generates the SolidCraft command script for the whole robot: detailed torso + four detailed legs,
// plus neck, head and tail built around serial bus servos.
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
boxc("Deck_Spine", "Deck", "join", 612, 60, T_DECK, [0, 0, zDeck]);
boxc("Battery_Keepout", "BatteryBay", "new", 200, 110, 72, [0, 0, 2]);

// ---- neck, head and tail ----
// Serial bus servos, Feetech STS family: body 45 x 24.7 x 35 mm (35 along the shaft), shaft 10 mm from one end.
// Dimensions are from memory of the datasheet: verify before detailing the mounts.
const SV = { L: 45, W: 24.7, H: 35, off: 10, horn: 3 };
const zTop = TORSO_TOP + T_DECK;                 // top of the deck
const boxE = (name, body, op, x0, x1, y0, y1, z0, z1) =>
  boxc(name, body, op, r3(x1 - x0), r3(y1 - y0), r3(z1 - z0), [r3((x0 + x1) / 2), r3((y0 + y1) / 2), r3((z0 + z1) / 2)]);
const SQ = Math.SQRT1_2;

// Neck tilt: servo lying on the deck, shaft along Y, ahead of the sweep of the hip carriers (x > 256 is clear).
const NK = { x: 275, z: zTop + 3 + SV.W / 2 };   // tilt axis
boxE("NeckBase_Plate", "NeckBase", "new", NK.x - 37, NK.x + 13, -20.5, 20.5, zTop, zTop + 3);
boxE("NeckTiltServo_Body", "NeckTiltServo", "new", NK.x - (SV.L - SV.off), NK.x + SV.off, -SV.H / 2, SV.H / 2, zTop + 3, zTop + 3 + SV.W);
// Neck (printed): yoke on both servo horns, bridge, tube at 45 degrees, cradle for the pan servo.
const yokeY = SV.H / 2 + SV.horn;                // 20.5: inner face of the yoke cheeks
const BR = 22;                                   // bridge distance from the tilt axis
const NB = [NK.x + BR * SQ, 0, NK.z + BR * SQ];  // bridge centre
for (const sy of [1, -1]) {
  const s = sy > 0 ? "L" : "R";
  cylc("Neck_Cheek" + s, "Neck", s === "L" ? "new" : "join", 24, 3, [NK.x, sy > 0 ? yokeY : -yokeY - 3, NK.z], "Y");
  cylc("Neck_Arm" + s, "Neck", "join", 10, BR, [NK.x, sy * (yokeY + 1.5), NK.z], [1, 0, 1]);
}
cylc("Neck_Bridge", "Neck", "join", 10, 2 * (yokeY + 3), [r3(NB[0]), -yokeY - 3, r3(NB[2])], "Y");
const TUBE = 45;
cylc("Neck_Tube", "Neck", "join", 28, TUBE, [r3(NB[0]), 0, r3(NB[2])], [1, 0, 1]);
const NTOP = [NB[0] + TUBE * SQ, NB[2] + TUBE * SQ];          // tube end [x, z]
const PAN = { x: Math.round(NTOP[0] + 11), z0: Math.round(NTOP[1]) };   // pan axis x, pan servo body bottom
PAN.z1 = PAN.z0 + SV.H;                                        // pan servo top (horn face)
boxE("Neck_Cradle", "Neck", "join", PAN.x - 38, PAN.x + 13, -SV.W / 2 - 3, SV.W / 2 + 3, PAN.z0 - 4, PAN.z1 - 6);
boxE("Neck_CradlePocket", "Neck", "cut", PAN.x - 35.2, PAN.x + 10.2, -SV.W / 2 - 0.2, SV.W / 2 + 0.2, PAN.z0, PAN.z1);
boxE("HeadPanServo_Body", "HeadPanServo", "new", PAN.x - (SV.L - SV.off), PAN.x + SV.off, -SV.W / 2, SV.W / 2, PAN.z0, PAN.z1);
// Head (printed shell, 2.5 mm walls): skull + muzzle, a camera behind each eye, spare room inside.
const HD = { z0: PAN.z1 + SV.horn, wall: 2.5, skullL: 110, skullW: 100, skullH: 85, muzL: 95, muzW: 56, muzH: 48,
  eyeY: 32, eyeUp: 67, cam: [12, 25, 24] };      // camera keep-out: Raspberry Pi Camera Module 3 size
const hx0 = PAN.x - 33, hx1 = hx0 + HD.skullL, mx1 = hx1 + HD.muzL, w = HD.wall;
cylc("PanHorn_Disc", "PanHorn", "new", 22, SV.horn, [PAN.x, 0, PAN.z1], "Z");
boxE("Head_Skull", "Head", "new", hx0, hx1, -HD.skullW / 2, HD.skullW / 2, HD.z0, HD.z0 + HD.skullH);
boxE("Head_Muzzle", "Head", "join", hx1, mx1, -HD.muzW / 2, HD.muzW / 2, HD.z0 + 3, HD.z0 + 3 + HD.muzH);
boxE("Head_SkullCavity", "Head", "cut", hx0 + w, hx1 - w, -HD.skullW / 2 + w, HD.skullW / 2 - w, HD.z0 + w, HD.z0 + HD.skullH - w);
boxE("Head_MuzzleCavity", "Head", "cut", hx1 - 2 * w, mx1 - w, -HD.muzW / 2 + w, HD.muzW / 2 - w, HD.z0 + 3 + w, HD.z0 + 3 + HD.muzH - w);
cylc("Head_HornHole", "Head", "cut", 8, w + 2, [PAN.x, 0, HD.z0 - 1], "Z");
for (const sy of [1, -1]) {
  const s = sy > 0 ? "L" : "R", ez = HD.z0 + HD.eyeUp, [cl, cw, ch] = HD.cam;
  cylc("Head_Eye" + s, "Head", "cut", 10, w + 2, [hx1 - w - 1, sy * HD.eyeY, ez], "X");
  boxE("Camera" + s + "_Keepout", "Camera" + s, "new", hx1 - w - cl - 0.5, hx1 - w - 0.5,
    sy * HD.eyeY - cw / 2, sy * HD.eyeY + cw / 2, ez - ch / 2, ez + ch / 2);
}

// Tail: wag servo hangs under the rear of the deck spine (x < -256 is clear of the hip carriers), shaft up
// through the deck; it carries the lift servo; the tail itself is a flexible TPU rod on a yoke.
const TW = { x: -293 };                          // wag axis
boxE("TailWagServo_Body", "TailWagServo", "new", TW.x - SV.off, TW.x + (SV.L - SV.off), -SV.W / 2, SV.W / 2, TORSO_TOP - SV.H, TORSO_TOP);
cylc("Deck_WagShaftHole", "Deck", "cut", 12, T_DECK + 2, [TW.x, 0, TORSO_TOP - 1], "Z");
cylc("TailBracket_Horn", "TailBracket", "new", 22, SV.horn, [TW.x, 0, zTop], "Z");
const TL = { x: TW.x - 35, z: zTop + SV.horn + 3 + SV.W / 2 };   // lift axis
boxE("TailBracket_Plate", "TailBracket", "join", TL.x - SV.off, TW.x + 5, -SV.H / 2, SV.H / 2, zTop + SV.horn, zTop + SV.horn + 3);
boxE("TailLiftServo_Body", "TailLiftServo", "new", TL.x - SV.off, TL.x + (SV.L - SV.off), -SV.H / 2, SV.H / 2, zTop + SV.horn + 3, zTop + SV.horn + 3 + SV.W);
const TDIR = [-1, 0, 0.5], TN = Math.hypot(1, 0.5);              // tail direction: back and up
const TB = [TL.x - BR / TN, 0, TL.z + (0.5 * BR) / TN];          // yoke bridge centre
for (const sy of [1, -1]) {
  const s = sy > 0 ? "L" : "R";
  cylc("TailYoke_Cheek" + s, "TailYoke", s === "L" ? "new" : "join", 24, 3, [TL.x, sy > 0 ? yokeY : -yokeY - 3, r3(TL.z)], "Y");
  cylc("TailYoke_Arm" + s, "TailYoke", "join", 10, BR, [TL.x, sy * (yokeY + 1.5), r3(TL.z)], TDIR);
}
cylc("TailYoke_Bridge", "TailYoke", "join", 10, 2 * (yokeY + 3), [r3(TB[0]), -yokeY - 3, r3(TB[2])], "Y");
cylc("Tail_Rod", "Tail", "new", 22, 300, [r3(TB[0]), 0, r3(TB[2])], TDIR);

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
comp("Torso", ["BulkheadF", "BulkheadR", "MidFrameF", "MidFrameR", "BellyPan", "Deck", "BatteryBay",
  "NeckBase", "NeckTiltServo", "TailWagServo", ...legs.flatMap((l) => l.bodies.torso)]);
comp("NeckAsm", ["Neck", "HeadPanServo"]);
comp("HeadAsm", ["Head", "PanHorn", "CameraL", "CameraR"]);
comp("TailPanLink", ["TailBracket", "TailLiftServo"]);
comp("TailAsm", ["TailYoke", "Tail"]);
joint("NeckPitch", "Torso", "NeckAsm", [NK.x, 0, r3(NK.z)], [0, 1, 0], [-40, 40]);
joint("HeadYaw", "NeckAsm", "HeadAsm", [PAN.x, 0, PAN.z1], [0, 0, 1], [-70, 70]);
joint("TailYaw", "Torso", "TailPanLink", [TW.x, 0, zTop], [0, 0, 1], [-60, 60]);
joint("TailPitch", "TailPanLink", "TailAsm", [TL.x, 0, r3(TL.z)], [0, 1, 0], [-60, 60]);
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
