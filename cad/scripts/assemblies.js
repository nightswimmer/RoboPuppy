// Assemblies: the single leg (cad/leg/leg.sc) and the whole robot (cad/robot/robot.sc).
// Every part is a link to its own file in cad/parts/, so each unique part is one item in the BOM.
// A leg is designed once, here, as three rigid modules (hip, thigh, lower leg). The right-hand
// modules are the same part files in mirrored positions: each placement is the left-hand one
// combined with the part's own mirror plane, which makes it a rigid move, never a mirrored part.
//
// SolidCraft flattens a linked assembly file to plain bodies (its part list and joints are lost),
// so the modules are built inside each assembly file by the functions below instead of being
// linked from a leg file.
const parts = require("./parts");
const { P, val } = require("./lib/dsl");
const { I, mul, tr, rz, ry, basis, reflect, assertRigid, flat12, isIdentity } = require("./lib/mat");

const MY = reflect("y"), MX = reflect("x");
const Y_OUT = P.y_in + P.t_plate + P.cav;              // 80: outer plate inner face
const Y_CAV0 = P.y_in + P.t_plate;                     // 45: cavity inner face
const Y_BELT0 = Y_CAV0 + P.blade_zone;                 // 59.5: belt zone
const Y_K = Y_OUT + P.t_plate;                         // 83: knee actuator front face
const AX_Y = (o) => basis([1, 0, 0], [0, 0, -1], [0, 1, 0], o);   // a part whose axis is Z, laid along the leg's Y

class Asm {
  constructor(file) { this.file = file; this.cmds = []; this.n = {}; this.members = {}; }
  cmd(command, params) { this.cmds.push({ command, params }); }
  move(occurrence, M) { if (!isIdentity(M)) this.cmd("occurrence.move", { occurrence, to_matrix: flat12(M) }); }
  // A local sub-assembly; returns its first occurrence.
  comp(name) {
    this.cmd("component.create", { name, parent: "root", activate: false });
    this.n[name] = 1;
    return name + ":1";
  }
  // Another occurrence of a local sub-assembly.
  copy(name, M) {
    this.cmd("occurrence.copy", { component: name });
    const occ = `${name}:${++this.n[name]}`;
    this.move(occ, M);
    return occ;
  }
  // A link to a part file, placed in `parent` at M (in the parent's frame).
  place(part, parent, M) {
    const first = !this.n[part.comp];
    this.cmd("component.insert_design", { path: part.file, name: part.comp, parent, reuse: !first });
    if (first && part.bom_type) this.cmd("component.metadata.set", { component: part.comp, bom_type: part.bom_type });
    this.n[part.comp] = (this.n[part.comp] || 0) + 1;
    const occ = `${part.comp}:${this.n[part.comp]}`;
    this.move(occ, assertRigid(M, part.key));
    (this.members[parent] = this.members[parent] || []).push(occ);
    return occ;
  }
  // Hold the parts of each sub-assembly rigidly together (one group per definition covers every placement of it).
  lock() {
    for (const occurrences of Object.values(this.members)) if (occurrences.length > 1) this.cmd("joint.rigid_group", { occurrences, quiet: true });
  }
  joint(name, a, b, point, z, limits) {
    this.cmd("joint.as_built", { type: "revolute", a, b, at: { occurrence: a, point, z }, name, limits: [limits], quiet: true });
  }
}

// The mirror image of placement T through `mirror`, made with the same, unmirrored part.
const mirrored = (mirror, T, part) => {
  if (!part.sym) throw new Error(`${part.key} has no mirror plane: it cannot serve both sides`);
  return assertRigid(mul(mirror, T, reflect(part.sym.axis, val(part.sym.about || 0))), part.key);
};
// A rigid module from [part, placement] items; with `mirror`, its mirror image.
const buildModule = (asm, name, items, mirror) => {
  const occ = asm.comp(name);
  for (const [part, T] of items) asm.place(part, name, mirror ? mirrored(mirror, T, part) : T);
  return occ;
};

// ---- the leg, in the left-hand leg frame: origin where the abduction axis (X) meets the hip pitch axis (Y),
// X forward, Y outward, Z up, leg straight down ----
// Actuator frames: axis Z (output +Z), plug +X, origin on the housing front face. Plugs point up.
const MOTOR_ABD = basis([0, 0, 1], [0, -1, 0], [1, 0, 0], [-(P.flange_x + P.rs_flange_h), 0, 0]);   // output forward
const MOTOR_HIP = basis([0, 0, 1], [1, 0, 0], [0, 1, 0], [0, P.y_in - P.rs_flange_h, 0]);          // output outward
const MOTOR_KNEE = basis([0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, Y_K, 0]);                          // output inward
const PLATE = (y) => basis([1, 0, 0], [0, 0, 1], [0, -1, 0], [0, y, 0]);                           // plate's +Z face at y
const STANDOFFS = [[-P.standoff_x, -P.so_z1], [-P.standoff_x, -P.so_z2], [-P.standoff_x, -P.so_z3], [P.standoff_x, -P.so_z1], [P.standoff_x, -P.so_z4]];

const HIP = [[parts.hip_carrier, I()], [parts.robstride01, MOTOR_HIP]];
const THIGH = [
  [parts.thigh_inner_plate, PLATE(Y_CAV0)],
  [parts.thigh_outer_plate, PLATE(Y_K)],
  [parts.robstride01, MOTOR_KNEE],
  [parts.hip_pulley, AX_Y([0, Y_BELT0, 0])],
  ...STANDOFFS.map(([x, z]) => [parts.standoff_m3x35, AX_Y([x, Y_CAV0, z])]),
  [parts.knee_axle, AX_Y([0, P.y_in, -P.lt])],
  ...[0, 1, 2].map((k) => [parts.bearing_625, AX_Y([-P.idl_x, Y_BELT0 + (P.pulley_w - 15) / 2 + 5 * k, -P.idl_z])]),
  [parts.idler_bolt_m5, AX_Y([-P.idl_x, P.y_in, -P.idl_z])],
];
const LOWER = [
  [parts.shank, AX_Y([0, Y_CAV0, -P.lt])],
  [parts.foot_pad, AX_Y([0, Y_CAV0 - P.foot_in, -P.lt - P.ls])],
];
const LIMITS = { abd: [-45, 45], hip: [-120, 120], knee: [-145, 0] };

// Joints of one leg whose hip is at world [hx, side*abd_y, 0]. Positive abduction is outward on both
// sides; hip and knee turn about +Y on both sides, so equal angles give mirror-image poses.
const legJoints = (asm, id, torso, occ, hx, sx, sy) => {
  const y = (ly) => sy * (P.abd_y + ly);
  asm.joint("HipAbduction_" + id, torso, occ.hip, [hx - sx * P.flange_x, y(0), 0], [sy, 0, 0], LIMITS.abd);
  asm.joint("HipPitch_" + id, occ.hip, occ.thigh, [hx, y(P.y_in), 0], [0, 1, 0], LIMITS.hip);
  asm.joint("Knee_" + id, occ.thigh, occ.lower, [hx, y(Y_CAV0 + 7), -P.lt], [0, 1, 0], LIMITS.knee);
};

// ---- single leg: the front-left leg on a bulkhead, in the robot frame ----
function leg() {
  const asm = new Asm("cad/leg/leg.sc");
  const hip = tr(P.hip_x, P.abd_y, 0);
  const torso = asm.comp("Torso");
  asm.place(parts.bulkhead, "Torso", basis([0, 1, 0], [0, 0, 1], [1, 0, 0], [P.x_bulk, 0, 0]));
  asm.place(parts.robstride01, "Torso", mul(hip, MOTOR_ABD));
  const occ = { hip: buildModule(asm, "Hip_A", HIP), thigh: buildModule(asm, "Thigh_L", THIGH), lower: buildModule(asm, "LowerLeg", LOWER) };
  for (const o of Object.values(occ)) asm.move(o, hip);
  asm.lock();
  legJoints(asm, "FL", torso, occ, P.hip_x, 1, 1);
  asm.cmd("assembly.bom", { path: "cad/leg/leg_bom.csv" });
  return asm;
}

// ---- whole robot. Frame: X forward, Y left, Z up, origin at the torso centre on the abduction axes' height ----
function robot() {
  const asm = new Asm("cad/robot/robot.sc");
  const FRAME = (x) => basis([0, 1, 0], [0, 0, 1], [1, 0, 0], [x, 0, 0]);    // frame plate with its back face at x
  const zDeck = P.torso_top + P.t_deck;                                      // top of the deck
  const neckZ = zDeck + P.base_t + P.sv_w / 2;                               // neck tilt axis height
  const panX = P.neck_x + P.pan_dx, panZ0 = neckZ + P.pan_dz, panZ1 = panZ0 + P.sv_h;
  const liftX = -P.tail_wag_x - P.tail_lift_dx, liftZ = zDeck + P.horn_t + P.base_t + P.sv_w / 2;
  const tailPitch = (Math.atan2(0.5, 1) * 180) / Math.PI;                    // tail rises 1 in 2
  const headX = panX + P.skull_l - P.skull_back - P.head_wall - 0.5 - P.cam_l / 2;   // camera just behind the front wall

  // torso
  const torso = asm.comp("Torso");
  asm.place(parts.bulkhead, "Torso", FRAME(P.x_bulk));
  asm.place(parts.bulkhead, "Torso", FRAME(-P.x_bulk - P.t_frame));
  asm.place(parts.mid_frame, "Torso", FRAME(P.x_mid));
  asm.place(parts.mid_frame, "Torso", FRAME(-P.x_mid - P.t_frame));
  asm.place(parts.belly_pan, "Torso", I());
  asm.place(parts.deck, "Torso", tr(0, 0, P.torso_top));
  asm.place(parts.battery_keepout, "Torso", I());
  asm.place(parts.neck_base, "Torso", tr(P.neck_x, 0, zDeck));
  // neck tilt servo lying on the base, shaft along Y; tail wag servo hanging under the deck, shaft up
  asm.place(parts.servo_sts_ht, "Torso", basis([1, 0, 0], [0, 0, -1], [0, 1, 0], [P.neck_x, P.sv_h / 2, neckZ]));
  asm.place(parts.servo_sts, "Torso", mul(tr(-P.tail_wag_x, 0, P.torso_top), rz(180)));
  // abduction actuators: front-left as designed, the others are its mirror images
  const abdFL = mul(tr(P.hip_x, P.abd_y, 0), MOTOR_ABD);
  asm.place(parts.robstride01, "Torso", abdFL);
  asm.place(parts.robstride01, "Torso", mirrored(MY, abdFL, parts.robstride01));
  asm.place(parts.robstride01, "Torso", mirrored(MX, abdFL, parts.robstride01));
  asm.place(parts.robstride01, "Torso", mul(rz(180), abdFL));

  // neck and head
  const neck = asm.comp("NeckAsm");
  asm.place(parts.neck, "NeckAsm", tr(P.neck_x, 0, neckZ));
  asm.place(parts.servo_sts, "NeckAsm", tr(panX, 0, panZ1));
  const head = asm.comp("HeadAsm");
  asm.place(parts.servo_horn, "HeadAsm", tr(panX, 0, panZ1));
  asm.place(parts.head, "HeadAsm", tr(panX, 0, panZ1 + P.horn_t));
  for (const side of [1, -1]) asm.place(parts.camera_keepout, "HeadAsm", tr(headX, side * P.eye_y, panZ1 + P.horn_t + P.eye_z));

  // tail
  const tailPan = asm.comp("TailPanLink");
  asm.place(parts.servo_horn, "TailPanLink", tr(-P.tail_wag_x, 0, zDeck));
  asm.place(parts.tail_bracket, "TailPanLink", tr(-P.tail_wag_x, 0, zDeck + P.horn_t));
  asm.place(parts.servo_sts, "TailPanLink", basis([-1, 0, 0], [0, 0, 1], [0, 1, 0], [liftX, P.sv_h / 2, liftZ]));
  const tail = asm.comp("TailAsm");
  asm.place(parts.tail_yoke, "TailAsm", mul(tr(liftX, 0, liftZ), ry(180 + tailPitch)));
  asm.place(parts.tail, "TailAsm", mul(tr(liftX, 0, liftZ), ry(180 + tailPitch), tr(P.br, 0, 0), ry(90)));

  asm.joint("NeckPitch", torso, neck, [P.neck_x, 0, neckZ], [0, 1, 0], [-40, 40]);
  asm.joint("HeadYaw", neck, head, [panX, 0, panZ1], [0, 0, 1], [-70, 70]);
  asm.joint("TailYaw", torso, tailPan, [-P.tail_wag_x, 0, zDeck], [0, 0, 1], [-60, 60]);
  asm.joint("TailPitch", tailPan, tail, [liftX, 0, liftZ], [0, 1, 0], [-60, 60]);

  // legs: each module is defined once per hand and placed twice
  const hipA = buildModule(asm, "Hip_A", HIP), hipB = buildModule(asm, "Hip_B", HIP, MY);
  const thighL = buildModule(asm, "Thigh_L", THIGH), thighR = buildModule(asm, "Thigh_R", THIGH, MY);
  const lower = buildModule(asm, "LowerLeg", LOWER);
  const at = (sx, sy) => tr(sx * P.hip_x, sy * P.abd_y, 0);
  const turned = mul(rz(180));
  const legs = {
    FL: { sx: 1, sy: 1, hip: hipA, thigh: thighL, lower },
    FR: { sx: 1, sy: -1, hip: hipB, thigh: thighR },
    RL: { sx: -1, sy: 1 },
    RR: { sx: -1, sy: -1 },
  };
  asm.move(hipA, at(1, 1));
  asm.move(hipB, at(1, -1));
  asm.move(thighL, at(1, 1));
  asm.move(thighR, at(1, -1));
  asm.move(lower, at(1, 1));
  legs.FR.lower = asm.copy("LowerLeg", mul(at(1, -1), turned));          // symmetric front to back: half a turn serves the right side
  legs.RL.hip = asm.copy("Hip_B", mul(turned, at(1, -1)));               // rear hips are the opposite front hips turned half a turn
  legs.RL.thigh = asm.copy("Thigh_L", at(-1, 1));
  legs.RL.lower = asm.copy("LowerLeg", at(-1, 1));
  legs.RR.hip = asm.copy("Hip_A", mul(turned, at(1, 1)));
  legs.RR.thigh = asm.copy("Thigh_R", at(-1, -1));
  legs.RR.lower = asm.copy("LowerLeg", mul(at(-1, -1), turned));
  asm.lock();
  for (const [id, l] of Object.entries(legs)) legJoints(asm, id, torso, l, l.sx * P.hip_x, l.sx, l.sy);

  asm.cmd("assembly.bom", { path: "cad/robot/bom.csv" });
  // standing pose
  for (const id of Object.keys(legs)) {
    asm.cmd("joint.drive", { joint: "HipPitch_" + id, value: 35, quiet: true });
    asm.cmd("joint.drive", { joint: "Knee_" + id, value: -70, quiet: true });
  }
  return asm;
}

module.exports = { leg, robot };
