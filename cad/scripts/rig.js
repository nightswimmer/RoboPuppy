// Motion test rig (cad/robot/motion_rig.sc): the linkage-knee robot with simplified legs, made to be dragged
// with the mouse in SolidCraft to find joint limits.
//
// Why a separate file: SolidCraft cannot drag a part inside a sub-assembly (see PROJECT_INSTRUCTIONS.md), so
// here every moving link is one top-level component built in this file from simple bodies (no linked part files,
// no sub-assemblies). The torso is the real parts, linked, in one grounded component (it never moves).
// This is a study model, not a production one: the leg bodies are envelopes with the real sizes and joint
// positions, the left- and right-hand thighs are two definitions, and nothing here goes into a BOM.
//
// Live parameters (change them in the app's parameter table; the legs and the linkage follow):
//   lt (thigh), ls (shank), lk_a (crank), lk_b (shank lever), lk_c (pushrod, = lt + 2 by default).
// Joint limits are plain values on each joint (the app does not re-read a limit expression).
const P = require("./dims");
const parts = require("./parts");
const linkage = require("./lib/linkage");
const { Part } = require("./lib/dsl");
const { I, mul, tr, ry, rz, basis, reflect, flat12, isIdentity } = require("./lib/mat");

const FILE = "cad/robot/motion_rig.sc";
const LIMITS = { abd: [-45, 45], hip: [-120, 120], knee: [-140, -45] };   // as robot_linkage.sc
const STAND = { hip: 35, knee: -70 };
const LEGS = { FL: [1, 1], FR: [1, -1], RL: [-1, 1], RR: [-1, -1] };

// Leg frame (left hand): origin where the abduction axis meets the hip pitch axis, X forward, Y outward, Z up,
// leg straight down. Y positions across the leg, from linkage parts and dims.js:
const Y = {
  hipCover: [P.y_h - P.rs_cover_l, P.y_h],                       // -3.5..10  hip-pitch actuator rear cover
  hipBody: [P.y_h, P.y_in - P.rs_flange_h],                      // 10..38    its housing
  cup: [P.y_h - P.cup_rear, P.y_h - P.cup_rear + P.cup_len],     // 2..30     carrier cup
  innerPlate: [P.y_in, P.y_in + P.t_plate],                      // 42..45
  cav: [P.y_in + P.t_plate, P.y_in + P.t_plate + P.cav_lk],      // 45..65    between the plates
  outerPlate: [65, 68],
  kneeBody: [68, 68 + P.rs_body_l],                              // 68..96    knee actuator housing (front face at 68)
  kneeCover: [96, 96 + P.rs_cover_l],                            // 96..109.5
  crank: [64 - P.crank_t, 64],                                   // 58..64
  rod: 54,                                                       // rod plane
  shank: [45 + P.hub_gap, 65 - P.hub_gap],                       // 45.5..64.5 shank hub and lever
  blade: [45 + P.hub_gap, 45 + P.hub_gap + P.blade_t],           // 45.5..58.5
  foot: [45 - P.foot_in, 45 - P.foot_in + P.foot_core_w],        // 40..64
};
const plug = (rear, toward) => [rear + toward * (P.rs_plug_z - P.rs_plug_h / 2), rear + toward * (P.rs_plug_z + P.rs_plug_h / 2)];
Y.hipPlug = plug(P.y_h, -1).sort((a, b) => a - b);               // 1.6..7.6, behind the hip-pitch actuator
Y.kneePlug = plug(96, 1);                                        // 98.4..104.4, behind the knee actuator

// ---- command helpers. A y extent [a, b] is in the left-hand leg frame; s = -1 mirrors it for the right hand ----
const ext = ([a, b], s = 1) => (s > 0 ? [a, b] : [-b, -a]);
const r4 = (v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);
const cyl = (body, d, [x, z], yr, s = 1) => {
  const [a, b] = ext(yr, s);
  return { command: "solid.cylinder", params: { diameter: d, height: r4(b - a), base: [x, r4(a), z].map(r4), axis: "Y", operation: "new", body_name: body, name: body } };
};
const box = (body, [x0, x1], yr, [z0, z1], s = 1) => {
  const [a, b] = ext(yr, s);
  return { command: "solid.box", params: { length: r4(x1 - x0), width: r4(b - a), height: r4(z1 - z0), corner: [x0, a, z0].map(r4), operation: "new", body_name: body, name: body } };
};

// A component built in place (its frame = the world while it is built), then left for placement.
function component(name, commands) {
  return [
    { command: "component.create", params: { name, parent: "root", activate: true } },
    ...commands,
    { command: "component.activate", params: { component: "root" } },
  ];
}

// ---- hip: carrier and hip-pitch actuator, one rigid link. Symmetric about its Z = 0 plane, so turned half a turn
// about X it is the right-hand hip, and the same definition serves all four legs. ----
const HIP = component("Hip", [
  cyl("Hip_Cup", P.cup_od, [0, 0], Y.cup),
  box("Hip_Block", [-P.flange_x + 0.3, -(P.flange_x - P.block_t)], [-P.block_back, P.block_front], [-P.block_h / 2, P.block_h / 2]),
  cyl("Hip_Motor", P.rs_body_d, [0, 0], Y.hipBody),
  cyl("Hip_MotorCover", P.rs_cover_d, [0, 0], Y.hipCover),
  cyl("Hip_MotorPilot", P.rs_pilot_d, [0, 0], [Y.hipBody[1], Y.hipBody[1] + P.rs_pilot_h]),
  cyl("Hip_MotorFlange", P.rs_flange_d, [0, 0], [Y.hipBody[1], P.y_in - 0.3]),
  box("Hip_PlugUp", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.hipPlug, [P.rs_plug_r0, P.rs_plug_r1]),
  box("Hip_PlugDown", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.hipPlug, [-P.rs_plug_r1, -P.rs_plug_r0]),
]);
// The carrier block face is 0.3 mm short of the abduction actuator flange and the hip flange 0.3 mm short of the
// thigh plate, so parts joined face to face do not count as touching when contact is on.

// ---- thigh: tapered plates, front hip spacer, two standoffs and the knee actuator. Left and right are two definitions
// (the spacer and standoffs sit in front, so the link is not symmetric). ----
function thigh(name, s) {
  const pre = name + "_";
  const plate = (body, yr) => {
    const p = new Part({ key: body, body });
    const [a, b] = ext(yr, s);
    // sketch x = leg X, sketch y = leg Z; the plane's normal is -Y, so the plate extrudes from y = b down to a
    p.sketch(body + "_Sketch", { origin: [0, b, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] }, 0, (k) => k.taper(P.plate_w / 2, "lt", P.lk_knee_r));
    p.extrude(body, b - a, { op: "new" });
    return p.cmds;
  };
  const [c0] = ext(Y.cav, s);
  return component(name, [
    ...plate(pre + "InnerPlate", Y.innerPlate),
    ...plate(pre + "OuterPlate", Y.outerPlate),
    // hip spacer: the front of a disc, with a bore round the crank hub
    cyl(pre + "Spacer", P.plate_w, [0, 0], Y.cav, s),
    { command: "solid.box", params: { length: P.plate_w / 2 + 10 + P.lk_sp_x0, width: P.cav_lk + 2, height: P.plate_w + 20,
      corner: [-(P.plate_w / 2 + 10), c0 - 1, -(P.plate_w / 2 + 10)], operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerRear" } },
    { command: "solid.cylinder", params: { diameter: P.lk_sp_bore_d, height: P.cav_lk + 2, base: [0, c0 - 1, 0], axis: "Y", operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerBore" } },
    cyl(pre + "Standoff1", P.standoff_d, [P.lk_so_x1, -P.lk_so_z1], Y.cav, s),
    cyl(pre + "Standoff2", P.standoff_d, [P.lk_so_x2, `${r4(P.lt - P.lk_so_z2)} mm - lt`], Y.cav, s),   // keeps its distance from the knee
    // knee actuator, output inward onto the crank
    cyl(pre + "Motor", P.rs_body_d, [0, 0], Y.kneeBody, s),
    cyl(pre + "MotorCover", P.rs_cover_d, [0, 0], Y.kneeCover, s),
    cyl(pre + "MotorPilot", P.rs_pilot_d, [0, 0], [Y.kneeBody[0] - P.rs_pilot_h, Y.kneeBody[0]], s),
    box(pre + "PlugUp", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.kneePlug, [P.rs_plug_r0, P.rs_plug_r1], s),
    box(pre + "PlugDown", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.kneePlug, [-P.rs_plug_r1, -P.rs_plug_r0], s),
  ]);
}

// ---- shank, in a frame on the knee axis (leg Y kept): hub, blade, foot pad, lever with the clevis slot and pin hole.
// Symmetric front to back, so turned half a turn about Z it is the right-hand shank. ----
const LEVER = ["Shank_Lever", "Shank_LeverEnd"];
const SHANK = component("Shank", [
  cyl("Shank_Hub", P.lk_hub_d, [0, 0], Y.shank),
  { command: "solid.box", params: { length: P.blade_w, width: P.blade_t, height: "ls", corner: [-P.blade_w / 2, Y.blade[0], "-ls"], operation: "new", body_name: "Shank_Blade", name: "Shank_Blade" } },
  cyl("Shank_Foot", P.foot_pad_od, [0, "-ls"], Y.foot),
  { command: "solid.box", params: { length: P.lever_w, width: Y.shank[1] - Y.shank[0], height: "lk_b", corner: [-P.lever_w / 2, Y.shank[0], 0], operation: "new", body_name: "Shank_Lever", name: "Shank_Lever" } },
  cyl("Shank_LeverEnd", P.lever_w, [0, "lk_b"], Y.shank),
  // pin hole first: the clevis slot then splits the lever end into its two cheeks
  { command: "solid.cylinder", params: { diameter: 5.5, height: P.cav_lk + 2, base: [0, Y.cav[0] - 1, "lk_b"], axis: "Y", operation: "cut", targets: LEVER, name: "Shank_PinHole" } },
  // clevis slot for the rod end (as wide as its 8 mm ball), from just above the hub
  { command: "solid.box", params: { length: P.lever_w + 4, width: P.re_ball_w, height: `lk_b - ${P.lk_hub_d / 2 + 1} mm + ${P.lever_w / 2 + 2} mm`,
    corner: [-(P.lever_w / 2 + 2), Y.rod - P.re_ball_w / 2, P.lk_hub_d / 2 + 1], operation: "cut", targets: LEVER, name: "Shank_Clevis" } },
]);

// ---- crank, in a frame on the knee actuator axis, centred on its own mid-plane (so one definition serves both hands)
const CRANK = component("Crank", [
  cyl("Crank_Hub", P.crank_hub_d, [0, 0], [-P.crank_t / 2, P.crank_t / 2]),
  { command: "solid.box", params: { length: "lk_a", width: P.crank_t, height: P.crank_arm_w, corner: [0, -P.crank_t / 2, -P.crank_arm_w / 2], operation: "new", body_name: "Crank_Arm", name: "Crank_Arm" } },
  cyl("Crank_Pin", P.crank_arm_w, ["lk_a", 0], [-P.crank_t / 2, P.crank_t / 2]),
]);

// ---- pushrod with its two rod ends, in a frame at the crank-end ball centre, rod along +X, centred on the rod plane.
// Ball and rod are 0.25 mm thinner each side than the real parts, so they clear the crank and the clevis by 0.25 mm
// (rod 7.5, ball 7.5 wide). The pin at the lever end runs between the lever cheeks' outer faces. ----
const ROD = component("Rod", [
  cyl("Rod_EyeA", P.re_d, [0, 0], [-P.re_t / 2, P.re_t / 2]),
  cyl("Rod_BallA", P.re_ball_d, [0, 0], [-(P.re_ball_w - 0.5) / 2, (P.re_ball_w - 0.5) / 2]),
  { command: "solid.cylinder", params: { diameter: P.re_neck_d, height: P.re_neck, base: [0, 0, 0], axis: "X", operation: "new", body_name: "Rod_NeckA", name: "Rod_NeckA" } },
  { command: "solid.cylinder", params: { diameter: P.rod_d - 0.5, height: `lk_c - ${2 * P.rod_end_gap} mm`, base: [P.rod_end_gap, 0, 0], axis: "X", operation: "new", body_name: "Rod_Bar", name: "Rod_Bar" } },
  { command: "solid.cylinder", params: { diameter: P.re_neck_d, height: P.re_neck, base: [`lk_c - ${P.re_neck} mm`, 0, 0], axis: "X", operation: "new", body_name: "Rod_NeckB", name: "Rod_NeckB" } },
  cyl("Rod_EyeB", P.re_d, ["lk_c", 0], [-P.re_t / 2, P.re_t / 2]),
  cyl("Rod_BallB", P.re_ball_d, ["lk_c", 0], [-(P.re_ball_w - 0.5) / 2, (P.re_ball_w - 0.5) / 2]),
  cyl("Rod_PinB", 5, ["lk_c", 0], [-(Y.rod - Y.shank[0]), Y.rod - Y.shank[0]]),
]);

// ---- placements ----
const MY = reflect("y");
const at = (sx, sy) => tr(sx * P.hip_x, sy * P.abd_y, 0);
const hipAt = (sx, sy) => {
  const front = sy > 0 ? at(1, 1) : mul(MY, at(1, 1), reflect("z"));   // right hand: the left hip turned about X
  return sx > 0 ? front : mul(rz(180), sy > 0 ? mul(MY, at(1, 1), reflect("z")) : at(1, 1));   // rear: the other hand turned about Z
};
const shankAt = (sx, sy) => (sy > 0 ? mul(at(sx, sy), tr(0, 0, -P.lt)) : mul(at(sx, sy), tr(0, 0, -P.lt), rz(180)));
const POSE = linkage.knee(-STAND.knee);                                  // crank angle and pin centres at the standing knee
const deg = (r) => (r * 180) / Math.PI;
const ROD_ANGLE = deg(Math.atan2(POSE.B[1] - POSE.A[1], POSE.B[0] - POSE.A[0]));
const crankAt = (sx, sy) => mul(at(sx, sy), tr(0, sy * (Y.crank[0] + Y.crank[1]) / 2, 0), ry(-POSE.phi));
const rodAt = (sx, sy) => mul(at(sx, sy), tr(POSE.A[0], sy * Y.rod, POSE.A[1]), ry(-ROD_ANGLE));

// world point of a leg-frame point on leg (sx, sy), with the hip at 0
const W = (sx, sy, [x, y, z]) => [r4(sx * P.hip_x + x), r4(sy * (P.abd_y + y)), r4(z)];

function rig() {
  const cmds = [];
  const cmd = (command, params) => cmds.push({ command, params });
  const move = (occurrence, M) => { if (!isIdentity(M)) cmd("occurrence.move", { occurrence, to_matrix: flat12(M) }); };

  for (const [name, expression] of [["lt", `${P.lt} mm`], ["ls", `${P.ls} mm`], ["lk_a", `${P.lk_a} mm`], ["lk_b", `${P.lk_b} mm`], ["lk_c", "lt + 2 mm"]])
    cmd("parameters.add", { name, expression });

  // torso: the real parts, linked, as in robot.sc (first top-level component, so it is grounded)
  cmd("component.create", { name: "Torso", parent: "root", activate: false });
  const place = (part, M, again) => {
    cmd("component.insert_design", { path: part.file, name: part.comp, parent: "Torso", reuse: !!again });
    const n = (place.n[part.comp] = (place.n[part.comp] || 0) + 1);
    move(`${part.comp}:${n}`, M);
  };
  place.n = {};
  const FRAME = (x) => basis([0, 1, 0], [0, 0, 1], [1, 0, 0], [x, 0, 0]);
  place(parts.bulkhead, FRAME(P.x_bulk));
  place(parts.bulkhead, FRAME(-P.x_bulk - P.t_frame), true);
  place(parts.mid_frame, FRAME(P.x_mid));
  place(parts.mid_frame, FRAME(-P.x_mid - P.t_frame), true);
  place(parts.belly_pan, I());
  place(parts.deck, tr(0, 0, P.torso_top));
  const ribRoot = P.x_mid + P.t_frame;
  place(parts.spine_rib_front, tr(ribRoot, 0, P.torso_top));
  place(parts.spine_rib_rear, mul(tr(-ribRoot, 0, P.torso_top), rz(180)));
  const MOTOR_ABD = basis([0, 0, 1], [0, -1, 0], [1, 0, 0], [-(P.flange_x + P.rs_flange_h), 0, 0]);
  const abdFL = mul(at(1, 1), MOTOR_ABD);
  place(parts.robstride02, abdFL);
  place(parts.robstride02, mul(MY, abdFL, reflect("y")), true);
  place(parts.robstride02, mul(reflect("x"), abdFL, reflect("y")), true);
  place(parts.robstride02, mul(rz(180), abdFL), true);

  // leg links, each one top-level component; a second copy for the rear legs
  cmds.push(...HIP, ...thigh("Thigh_L", 1), ...thigh("Thigh_R", -1), ...SHANK, ...CRANK, ...ROD);
  const occ = {}, count = {};
  const put = (comp, M) => {
    count[comp] = (count[comp] || 0) + 1;
    if (count[comp] > 1) cmd("occurrence.copy", { component: comp });
    const o = `${comp}:${count[comp]}`;
    move(o, M);
    return o;
  };
  for (const [id, [sx, sy]] of Object.entries(LEGS)) {
    occ[id] = {
      hip: put("Hip", hipAt(sx, sy)),
      thigh: put(sy > 0 ? "Thigh_L" : "Thigh_R", at(sx, sy)),
      shank: put("Shank", shankAt(sx, sy)),
      crank: put("Crank", crankAt(sx, sy)),
      rod: put("Rod", rodAt(sx, sy)),
    };
  }

  // joints. Hip pitch and knee turn about +Y on every leg; positive abduction is outward on both sides.
  const asBuilt = (name, a, b, at, limits) => cmd("joint.as_built", Object.assign({ type: "revolute", a, b, at, name, quiet: true }, limits ? { limits: [limits] } : {}));
  for (const [id, [sx, sy]] of Object.entries(LEGS)) {
    const o = occ[id], w = (p) => W(sx, sy, p);
    const hx = sx * P.hip_x;
    asBuilt("HipAbduction_" + id, "Torso:1", o.hip, { occurrence: "Torso:1", point: [hx - sx * P.flange_x, sy * P.abd_y, 0], z: [sy, 0, 0] }, LIMITS.abd);
    asBuilt("HipPitch_" + id, o.hip, o.thigh, { occurrence: o.hip, point: w([0, P.y_in, 0]), z: [0, 1, 0] }, LIMITS.hip);
    // the knee frame sits on the round end of the inner plate, so it follows lt; picked on the plate's +Y face
    const kneeFaceY = sy > 0 ? Y.innerPlate[1] : Y.innerPlate[0];
    asBuilt("Knee_" + id, o.thigh, o.shank, { occurrence: o.thigh, circle: w([0, kneeFaceY, -P.lt - P.lk_knee_r]) });
    cmd("joint.drive", { joint: "Knee_" + id, value: STAND.knee, quiet: true });
    // the linkage loop, closed where the crank and rod were placed
    asBuilt("KneeCrank_" + id, o.thigh, o.crank, { occurrence: o.thigh, point: w([0, Y.crank[1], 0]), z: [0, 1, 0] });
    const c = Math.cos((POSE.phi * Math.PI) / 180), s = Math.sin((POSE.phi * Math.PI) / 180);
    const pinR = P.crank_arm_w / 2;
    asBuilt("RodCrank_" + id, o.crank, o.rod, { occurrence: o.crank, circle: w([POSE.A[0] + pinR * c, Y.crank[0], POSE.A[1] + pinR * s]) });
    // rod end to lever: a ball joint between the rod's pin end and the lever's pin hole, both on the lever's inner face
    const lv = [POSE.B[0] - 0, POSE.B[1] + P.lt];                     // lever direction (knee to pin), in the leg plane
    const ll = Math.hypot(lv[0], lv[1]), u = [lv[0] / ll, lv[1] / ll];
    cmd("joint.create", { type: "ball", name: "RodLever_" + id, flip: true, quiet: true,
      a: { occurrence: o.rod, circle: w([POSE.B[0] + 2.5 * u[0], Y.shank[0], POSE.B[1] + 2.5 * u[1]]) },
      b: { occurrence: o.shank, circle: w([POSE.B[0] + 2.75 * u[0], Y.shank[0], POSE.B[1] + 2.75 * u[1]]) } });
    cmd("joint.limits", { joint: "Knee_" + id, min: LIMITS.knee[0], max: LIMITS.knee[1], quiet: true });
  }
  for (const id of Object.keys(LEGS)) cmd("joint.drive", { joint: "HipPitch_" + id, value: STAND.hip, quiet: true });

  // contact: one set of every top-level link and the torso, so a drag stops where two of them would collide
  const all = ["Torso:1", ...Object.values(occ).flatMap((o) => Object.values(o))];
  cmd("contact.create", { occurrences: all, name: "Collisions" });
  cmd("contact.enable_sets", { enabled: true });
  return { file: FILE, cmds, occ, pose: POSE };
}

module.exports = { rig };
