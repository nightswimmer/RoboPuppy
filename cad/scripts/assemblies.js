// Assemblies: the single leg (cad/leg/leg.sc) and the whole robot (cad/robot/robot.sc), and the same two with the
// linkage knee instead of the belt (leg_linkage.sc, robot_linkage.sc). The variants share every part but the thigh,
// shank and knee drive.
// Every part is a link to its own file in cad/parts/, so each unique part is one item in the BOM.
// A leg is designed once, here, as three rigid modules (hip, thigh, lower leg). The right-hand
// modules are the same part files in mirrored positions: each placement is the left-hand one
// combined with the part's own mirror plane, which makes it a rigid move, never a mirrored part.
//
// SolidCraft flattens a linked assembly file to plain bodies (its part list and joints are lost),
// so the modules are built inside each assembly file by the functions below instead of being
// linked from a leg file.
const parts = require("./parts");
const linkage = require("./lib/linkage");
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
// the two upper standoff positions (so_z1) are taken by the hip spacer's through-bolts
const STANDOFFS = [[-P.standoff_x, -P.so_z2], [-P.standoff_x, -P.so_z3], [P.standoff_x, -P.so_z4]];

const HIP = [[parts.hip_carrier, I()], [parts.robstride02, MOTOR_HIP]];
const THIGH = [
  [parts.thigh_inner_plate, PLATE(Y_CAV0)],
  [parts.thigh_outer_plate, PLATE(Y_K)],
  [parts.hip_spacer, PLATE(Y_OUT)],
  [parts.robstride02, MOTOR_KNEE],
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

// ---- linkage knee variant: the knee actuator turns a crank; a pushrod runs down the rear of the thigh to a
// lever on the shank above the knee axis. Narrower cavity, tapered plates. Hip and torso as the belt leg. ----
const Y_OUT_LK = Y_CAV0 + P.cav_lk;                               // 65: outer plate inner face
const Y_K_LK = Y_OUT_LK + P.t_plate;                              // 68: knee actuator front face
const Y_CRANK = Y_OUT_LK - (P.rs_flange_h - P.t_plate);           // 64: knee actuator flange face = crank's outer face
const Y_ROD = Y_CRANK - P.crank_t - P.re_ball_w / 2;              // 54: rod plane
const MOTOR_KNEE_LK = basis([0, 0, 1], [-1, 0, 0], [0, -1, 0], [0, Y_K_LK, 0]);   // output inward
const THIGH_LK = [
  [parts.thigh_inner_plate_lk, PLATE(Y_CAV0)],
  [parts.thigh_outer_plate_lk, PLATE(Y_K_LK)],
  [parts.hip_spacer_lk, PLATE(Y_OUT_LK)],
  [parts.robstride02, MOTOR_KNEE_LK],
  ...[[P.lk_so_x1, -P.lk_so_z1], [P.lk_so_x2, -P.lk_so_z2]].map(([x, z]) => [parts.standoff_m3x20, AX_Y([x, Y_CAV0, z])]),
  [parts.knee_axle_lk, AX_Y([0, P.y_in, -P.lt])],
];
const LOWER_LK = [
  [parts.shank_lk, AX_Y([0, Y_CAV0, -P.lt])],
  [parts.foot_pad, AX_Y([0, Y_CAV0 - P.foot_in, -P.lt - P.ls])],
];
const LIMITS_LK = { abd: LIMITS.abd, hip: LIMITS.hip, knee: [-140, -45] };   // knee: where the linkage transmits well

// Crank and pushrod placed for knee fold q (in the leg frame, hip pitch 0), and their pin centres A and B.
const linkageAt = (q) => {
  const { phi, A, B } = linkage.knee(q);
  const c = Math.cos((phi * Math.PI) / 180), s = Math.sin((phi * Math.PI) / 180);
  const len = Math.hypot(B[0] - A[0], B[1] - A[1]), ux = (B[0] - A[0]) / len, uz = (B[1] - A[1]) / len;
  const at = (v, k = 0) => [v[0] + k * ux, Y_ROD, v[1] + k * uz];
  return {
    A: at(A), B: at(B),
    crank: [[parts.knee_crank, basis([c, 0, s], [-s, 0, c], [0, -1, 0], [0, Y_CRANK, 0])]],
    rod: [
      [parts.knee_pushrod, basis([0, 1, 0], [-uz, 0, ux], [ux, 0, uz], at(A, P.rod_end_gap))],
      [parts.rod_end_m5, basis([ux, 0, uz], [-uz, 0, ux], [0, -1, 0], at(A))],
      [parts.rod_end_m5, basis([-ux, 0, -uz], [uz, 0, -ux], [0, -1, 0], at(B))],
    ],
  };
};
const STAND = { hip: 35, knee: -70 };
const LK_POSE = linkageAt(-STAND.knee);

// The two designs. The linkage modules are built in the standing pose, where its loop closes.
const VARIANTS = {
  belt: { thigh: THIGH, lower: LOWER, limits: LIMITS,
    leg: "cad/leg/leg.sc", legBom: "cad/leg/leg_bom.csv", robot: "cad/robot/robot.sc", bom: "cad/robot/bom.csv" },
  linkage: { thigh: THIGH_LK, lower: LOWER_LK, limits: LIMITS_LK, linkage: LK_POSE,
    leg: "cad/leg/leg_linkage.sc", legBom: "cad/leg/leg_linkage_bom.csv", robot: "cad/robot/robot_linkage.sc", bom: "cad/robot/bom_linkage.csv" },
};

// Joints of one leg whose hip is at world [hx, side*abd_y, 0]. Positive abduction is outward on both
// sides; hip and knee turn about +Y on both sides, so equal angles give mirror-image poses.
const legJoints = (asm, id, torso, occ, hx, sx, sy, limits) => {
  const y = (ly) => sy * (P.abd_y + ly);
  asm.joint("HipAbduction_" + id, torso, occ.hip, [hx - sx * P.flange_x, y(0), 0], [sy, 0, 0], limits.abd);
  asm.joint("HipPitch_" + id, occ.hip, occ.thigh, [hx, y(P.y_in), 0], [0, 1, 0], limits.hip);
  asm.joint("Knee_" + id, occ.thigh, occ.lower, [hx, y(Y_CAV0 + 7), -P.lt], [0, 1, 0], limits.knee);
};

// The knee linkage's loop, made once the knee stands where the crank and rod were placed: crank on the knee
// actuator axis, rod on the crank pin, and a ball joint at the shank lever (a rod end each end: the rod's spin
// about its own axis is free, as it is in the real part).
const linkageJoints = (asm, id, occ, hx, sy, pose) => {
  const w = (p) => [hx + p[0], sy * (P.abd_y + p[1]), p[2]];
  asm.cmd("joint.as_built", { type: "revolute", a: occ.thigh, b: occ.crank, at: { occurrence: occ.thigh, point: w([0, Y_CRANK, 0]), z: [0, 1, 0] }, name: "KneeCrank_" + id, quiet: true });
  asm.cmd("joint.as_built", { type: "revolute", a: occ.crank, b: occ.rod, at: { occurrence: occ.crank, point: w(pose.A), z: [0, 1, 0] }, name: "RodCrank_" + id, quiet: true });
  asm.cmd("joint.as_built", { type: "ball", a: occ.rod, b: occ.lower, at: { occurrence: occ.rod, point: w(pose.B) }, name: "RodLever_" + id, quiet: true });
};
const drive = (asm, joint, value) => asm.cmd("joint.drive", { joint, value, quiet: true });

// ---- single leg: the front-left leg on a bulkhead, in the robot frame ----
function legAsm(v) {
  const asm = new Asm(v.leg);
  const hip = tr(P.hip_x, P.abd_y, 0);
  const torso = asm.comp("Torso");
  asm.place(parts.bulkhead, "Torso", basis([0, 1, 0], [0, 0, 1], [1, 0, 0], [P.x_bulk, 0, 0]));
  asm.place(parts.robstride02, "Torso", mul(hip, MOTOR_ABD));
  const occ = { hip: buildModule(asm, "Hip_A", HIP), thigh: buildModule(asm, "Thigh_L", v.thigh), lower: buildModule(asm, "LowerLeg", v.lower) };
  if (v.linkage) Object.assign(occ, { crank: buildModule(asm, "KneeCrank_L", v.linkage.crank), rod: buildModule(asm, "KneeRod_L", v.linkage.rod) });
  for (const o of Object.values(occ)) asm.move(o, hip);
  asm.lock();
  legJoints(asm, "FL", torso, occ, P.hip_x, 1, 1, v.limits);
  if (v.linkage) {
    drive(asm, "Knee_FL", STAND.knee);
    linkageJoints(asm, "FL", occ, P.hip_x, 1, v.linkage);
  }
  asm.cmd("assembly.bom", { path: v.legBom });
  return asm;
}

// ---- whole robot. Frame: X forward, Y left, Z up, origin at the torso centre on the abduction axes' height ----
function robotAsm(v) {
  const asm = new Asm(v.robot);
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
  // spine ribs under the deck, from each mid frame through the bulkhead; the rear one turned half a turn
  const ribRoot = P.x_mid + P.t_frame;
  asm.place(parts.spine_rib_front, "Torso", tr(ribRoot, 0, P.torso_top));
  asm.place(parts.spine_rib_rear, "Torso", mul(tr(-ribRoot, 0, P.torso_top), rz(180)));
  asm.place(parts.battery_keepout, "Torso", I());
  asm.place(parts.neck_base, "Torso", tr(P.neck_x, 0, zDeck));
  // neck tilt servo lying on the base, shaft along Y; tail wag servo hanging under the deck, shaft up
  asm.place(parts.servo_sts_ht, "Torso", basis([1, 0, 0], [0, 0, -1], [0, 1, 0], [P.neck_x, P.sv_h / 2, neckZ]));
  asm.place(parts.servo_sts, "Torso", mul(tr(-P.tail_wag_x, 0, P.torso_top), rz(180)));
  // abduction actuators: front-left as designed, the others are its mirror images
  const abdFL = mul(tr(P.hip_x, P.abd_y, 0), MOTOR_ABD);
  asm.place(parts.robstride02, "Torso", abdFL);
  asm.place(parts.robstride02, "Torso", mirrored(MY, abdFL, parts.robstride02));
  asm.place(parts.robstride02, "Torso", mirrored(MX, abdFL, parts.robstride02));
  asm.place(parts.robstride02, "Torso", mul(rz(180), abdFL));

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
  const thighL = buildModule(asm, "Thigh_L", v.thigh), thighR = buildModule(asm, "Thigh_R", v.thigh, MY);
  const lower = buildModule(asm, "LowerLeg", v.lower);
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
  if (v.linkage) {
    // crank and pushrod: one module per hand, the right-hand one the same parts in mirrored positions
    const crankL = buildModule(asm, "KneeCrank_L", v.linkage.crank), crankR = buildModule(asm, "KneeCrank_R", v.linkage.crank, MY);
    const rodL = buildModule(asm, "KneeRod_L", v.linkage.rod), rodR = buildModule(asm, "KneeRod_R", v.linkage.rod, MY);
    asm.move(crankL, at(1, 1));
    asm.move(crankR, at(1, -1));
    asm.move(rodL, at(1, 1));
    asm.move(rodR, at(1, -1));
    Object.assign(legs.FL, { crank: crankL, rod: rodL });
    Object.assign(legs.FR, { crank: crankR, rod: rodR });
    Object.assign(legs.RL, { crank: asm.copy("KneeCrank_L", at(-1, 1)), rod: asm.copy("KneeRod_L", at(-1, 1)) });
    Object.assign(legs.RR, { crank: asm.copy("KneeCrank_R", at(-1, -1)), rod: asm.copy("KneeRod_R", at(-1, -1)) });
  }
  asm.lock();
  for (const [id, l] of Object.entries(legs)) legJoints(asm, id, torso, l, l.sx * P.hip_x, l.sx, l.sy, v.limits);
  if (v.linkage) {
    // the knees go to the standing pose first, where the crank and rod were placed; then the loops are closed
    for (const [id, l] of Object.entries(legs)) {
      drive(asm, "Knee_" + id, STAND.knee);
      linkageJoints(asm, id, l, l.sx * P.hip_x, l.sy, v.linkage);
    }
  }

  asm.cmd("assembly.bom", { path: v.bom });
  // standing pose
  for (const id of Object.keys(legs)) {
    drive(asm, "HipPitch_" + id, STAND.hip);
    drive(asm, "Knee_" + id, STAND.knee);
  }
  return asm;
}

const leg = () => legAsm(VARIANTS.belt), robot = () => robotAsm(VARIANTS.belt);
const leg_linkage = () => legAsm(VARIANTS.linkage), robot_linkage = () => robotAsm(VARIANTS.linkage);
module.exports = { leg, robot, leg_linkage, robot_linkage, linkageAt };
