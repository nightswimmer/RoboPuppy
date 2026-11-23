// Motion test rig (cad/robot/motion_rig.sc): the linkage-knee robot with simplified legs, made to be dragged
// with the mouse in SolidCraft to find joint limits.
//
// Why a separate file: SolidCraft cannot drag a part inside a sub-assembly (see PROJECT_INSTRUCTIONS.md), so
// here every moving link is one top-level component built in this file from simple bodies (no linked part files,
// no sub-assemblies). The torso is the real parts, linked, in one grounded component (it never moves).
// This is a study model, not a production one: the leg bodies are envelopes with the real sizes and joint
// positions, the left- and right-hand thighs are two definitions, and nothing here goes into a BOM.
//
// The legs are the linkage leg of the part files (leg_linkage.sc, robot_linkage.sc), drawn here as plain bodies: the
// plate outlines come from the same code (lib/legshape.js) and every size from dims.js. The shank is two curved 3 mm
// aluminium plates with spacers, nested inside the thigh fork, with the rod end clamped between them at the lever pin.
// It folds forward into the thigh's gap until the foot pad meets the thigh's hip end (about 160 deg).
//
// Live parameters (change them in the app's parameter table; the legs and the linkage follow): every dims.js name the
// sketches use, among them lt (thigh), ls (shank), lk_a (crank), lk_b (shank lever), lk_c (pushrod, = lt + 3 here),
// lk_ang (lever pin angle off the shank axis, positive toward the rear) and the plate outline sizes.
// Joint limits are plain values on each joint (the app does not re-read a limit expression).
const P = require("./dims");
const parts = require("./parts");
const linkage = require("./lib/linkage");
const shape = require("./lib/legshape");
const { I, mul, tr, ry, rz, basis, reflect, flat12, isIdentity } = require("./lib/mat");

const FILE = "cad/robot/motion_rig.sc";
const LIMITS = { abd: [-45, 45], hip: [-120, 120], knee: [-159, -60] };   // knee: fold 60-159 deg (the foot meets the hip at 159.8)
const LT = P.lt, LS = P.ls;
const STAND = { hip: 45.8, knee: -85.9 };   // the Go2's standing pose (hip 0.8 rad, knee -1.5 rad)
const LEGS = { FL: [1, 1], FR: [1, -1], RL: [-1, 1], RR: [-1, -1] };

// Leg frame (left hand): origin where the abduction axis meets the hip pitch axis, X forward, Y outward, Z up,
// leg straight down. Y positions across the leg, from linkage parts and dims.js:
const C0 = P.y_in + P.t_plate;                                    // 45: the cavity's inner face
const Y = {
  hipCover: [P.y_h - P.rs_cover_l, P.y_h],                       // -3.5..10  hip-pitch actuator rear cover
  hipBody: [P.y_h, P.y_in - P.rs_flange_h],                      // 10..38    its housing
  cup: [P.y_h - P.cup_rear, P.y_h - P.cup_rear + P.cup_len],     // 2..30     carrier cup
  innerPlate: [P.y_in, P.y_in + P.t_plate],                      // 42..45
  cav: [P.y_in + P.t_plate, P.y_in + P.t_plate + P.cav_lk],      // 45..65    between the plates
  outerPlate: [65, 68],
  kneeBody: [68, 68 + P.rs_body_l],                              // 68..96    knee actuator housing (front face at 68)
  kneeCover: [96, 96 + P.rs_cover_l],                            // 96..109.5
  crank: [64 - P.crank_t, 64],                                   // 59..64
  rod: 55,                                                       // rod plane = mid-plane of the cavity
  shankIn: [C0 + P.sh_in, C0 + P.sh_in + P.t_plate],            // 47.5..50.5 shank plates (sh_in inside the thigh plates)
  shankOut: [C0 + P.sh_in + P.t_plate + P.sh_gap, C0 + P.sh_in + 2 * P.t_plate + P.sh_gap],   // 59.5..62.5
  gap: [C0 + P.sh_in + P.t_plate, C0 + P.sh_in + P.t_plate + P.sh_gap],                       // 50.5..59.5, rod-end ball and shims
  foot: [55 - P.foot_core_w / 2, 55 + P.foot_core_w / 2],        // foot, centred on the shank
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

// ---- thigh plate: the hook outline of the part files (lib/legshape.js) ----
function thighPlate(body, yr, s) {
  const [a, b] = ext(yr, s), c = (command, params) => ({ command, params });
  return [
    // sketch x = leg X, sketch y = leg Z; the plane's normal is -Y, so the plate extrudes from y = b down to a
    c("sketch.create", { plane: { origin: [0, b, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] }, name: body + "_Sketch" }),
    ...shape.thighOutlineCmds(),
    c("sketch.solve", {}),
    c("sketch.finish", {}),
    c("solid.extrude", { distance: r4(b - a), operation: "new", body_name: body, name: body }),
  ];
}

// ---- thigh: the two plates, front hip spacer, standoffs clear of the rod's band and the crank, and the knee actuator. Left and right are two definitions (the spacer sits in front, so the link is not symmetric). ----
function thigh(name, s) {
  const pre = name + "_";
  const plate = (body, yr) => thighPlate(body, yr, s);
  const { Cc } = shape.thighOutline();
  const [c0] = ext(Y.cav, s);
  return component(name, [
    ...plate(pre + "InnerPlate", Y.innerPlate),
    ...plate(pre + "OuterPlate", Y.outerPlate),
    // hip spacer: the front of a disc, with a bore round the crank hub
    cyl(pre + "Spacer", P.plate_w, [0, 0], Y.cav, s),
    { command: "solid.box", params: { length: P.plate_w / 2 + 10 + P.lk_sp_x0, width: P.cav_lk + 2, height: P.plate_w + 20,
      corner: [-(P.plate_w / 2 + 10), c0 - 1, -(P.plate_w / 2 + 10)], operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerRear" } },
    { command: "solid.cylinder", params: { diameter: P.lk_sp_bore_d, height: P.cav_lk + 2, base: [0, c0 - 1, 0], axis: "Y", operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerBore" } },
    // ... trimmed to the plates' concave front edge (its upper arc)
    { command: "solid.cylinder", params: { diameter: 2 * P.th_front_r1, height: P.cav_lk + 2, base: [r4(Cc[0]), c0 - 1, r4(Cc[1])], axis: "Y", operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerFront" } },
    ...[1, 2, 3, 4, 5].map((i) => cyl(pre + "Standoff" + i, P.standoff_d, [i < 5 ? -P["lk_so_x" + i] : P["lk_so_x" + i], -P["lk_so_z" + i]], Y.cav, s)),
    // knee actuator, output inward onto the crank
    cyl(pre + "Motor", P.rs_body_d, [0, 0], Y.kneeBody, s),
    cyl(pre + "MotorCover", P.rs_cover_d, [0, 0], Y.kneeCover, s),
    cyl(pre + "MotorPilot", P.rs_pilot_d, [0, 0], [Y.kneeBody[0] - P.rs_pilot_h, Y.kneeBody[0]], s),
    box(pre + "PlugUp", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.kneePlug, [P.rs_plug_r0, P.rs_plug_r1], s),
    box(pre + "PlugDown", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.kneePlug, [-P.rs_plug_r1, -P.rs_plug_r0], s),
    // the knee Chicago screw's heads on the plates' outer faces
    cyl(pre + "KneeScrewIn", P.kcs_d1, [0, "-lt"], [Y.innerPlate[0] - P.kcs_h, Y.innerPlate[0]], s),
    cyl(pre + "KneeScrewOut", P.kcs_d1, [0, "-lt"], [Y.outerPlate[1], Y.outerPlate[1] + P.kcs_h], s),
  ]);
}

// ---- shank, in a frame on the knee axis (leg Y kept): two curved plates (band and top, as the shank plate part file),
// the knee hub body and spacers between them, the lever pin hole through both, the foot. The curve is not symmetric
// front to back, so left and right are two definitions (the real plates are flat and serve both sides turned over). ----
const PIN = ["lk_b * cos(90 deg + lk_ang)", "lk_b * sin(90 deg + lk_ang)"];   // lever pin, in the shank frame
const sketchBody = (body, yr, s, inner) => {
  const [a, b] = ext(yr, s), c = (command, params) => ({ command, params });
  return [
    c("sketch.create", { plane: { origin: [0, b, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] }, name: body + "_Sketch" }),
    ...inner,
    c("sketch.solve", {}),
    c("sketch.finish", {}),
    c("solid.extrude", { distance: r4(b - a), operation: "new", body_name: body, name: body }),
  ];
};
const shankPlate = (body, yr, s) => sketchBody(body, yr, s, shape.shankBandCmds());
const shankTop = (body, yr, s) => sketchBody(body, yr, s, shape.shankTopCmds());

function shank(name, s) {
  const pre = name + "_", { along } = shape.centreline();
  const y0 = s > 0 ? Y.shankIn[0] - 1 : -(Y.shankOut[1] + 1);
  return component(name, [
    ...shankPlate(pre + "PlateIn", Y.shankIn, s),
    ...shankPlate(pre + "PlateOut", Y.shankOut, s),
    ...shankTop(pre + "TopIn", Y.shankIn, s),
    ...shankTop(pre + "TopOut", Y.shankOut, s),
    { command: "solid.cylinder", params: { diameter: 5.5, height: Y.shankOut[1] - Y.shankIn[0] + 2, base: [PIN[0], y0, PIN[1]],
      axis: "Y", operation: "cut", targets: [pre + "TopIn", pre + "TopOut"], name: pre + "PinHole" } },
    // the lever pin's heads (Chicago screw): barrel head on the inner plate, screw head on the outer plate
    cyl(pre + "PinHeadIn", P.cs_d1, PIN, [Y.shankIn[0] - P.cs_h1, Y.shankIn[0]], s),
    cyl(pre + "PinHeadOut", P.cs_d2, PIN, [Y.shankOut[1], Y.shankOut[1] + P.cs_h2], s),
    ...sketchBody(pre + "Hub", Y.gap, s, shape.kneeHubCmds()),   // knee hub body, cut back where the rod passes
    ...[P.sh_so1, P.sh_so2].map((d, i) => cyl(pre + "Spacer" + (i + 1), P.standoff_d, along(d).p.map(r4), Y.gap, s)),
    cyl(pre + "Foot", P.foot_pad_od, [0, "-ls"], Y.foot, s),
  ]);
}

// ---- crank, in a frame on the knee actuator axis, centred on its own mid-plane (so one definition serves both hands)
const CRANK = component("Crank", [
  cyl("Crank_Hub", P.crank_hub_d, [0, 0], [-P.crank_t / 2, P.crank_t / 2]),
  { command: "solid.box", params: { length: "lk_a", width: P.crank_t, height: P.crank_arm_w, corner: [0, -P.crank_t / 2, -P.crank_arm_w / 2], operation: "new", body_name: "Crank_Arm", name: "Crank_Arm" } },
  cyl("Crank_Pin", P.crank_arm_w, ["lk_a", 0], [-P.crank_t / 2, P.crank_t / 2]),
]);

// ---- pushrod with its two rod ends, in a frame at the crank-end ball centre, rod along +X, centred on the rod plane.
// The rod is an 8 x 4 mm aluminium tube (rod_bore_d), tapped M5 at each end.
// Ball and rod are 0.25 mm thinner each side than the real parts, so they clear the crank and the clevis by 0.25 mm
// (rod 7.5, ball 7.5 wide). The pin at the lever end runs between the shank plates' outer faces. ----
const ROD = component("Rod", [
  cyl("Rod_EyeA", P.re_d, [0, 0], [-P.re_t / 2, P.re_t / 2]),
  cyl("Rod_BallA", P.re_ball_d, [0, 0], [-(P.re_ball_w - 0.5) / 2, (P.re_ball_w - 0.5) / 2]),
  { command: "solid.cylinder", params: { diameter: P.re_neck_d, height: P.re_neck, base: [0, 0, 0], axis: "X", operation: "new", body_name: "Rod_NeckA", name: "Rod_NeckA" } },
  { command: "solid.cylinder", params: { diameter: P.rod_d - 0.5, height: `lk_c - ${2 * P.rod_end_gap} mm`, base: [P.rod_end_gap, 0, 0], axis: "X", operation: "new", body_name: "Rod_Bar", name: "Rod_Bar" } },
  { command: "solid.cylinder", params: { diameter: P.rod_bore_d, height: `lk_c - ${2 * P.rod_end_gap - 2} mm`, base: [P.rod_end_gap - 1, 0, 0], axis: "X", operation: "cut", targets: ["Rod_Bar"], name: "Rod_Bore" } },
  { command: "solid.cylinder", params: { diameter: P.re_neck_d, height: P.re_neck, base: [`lk_c - ${P.re_neck} mm`, 0, 0], axis: "X", operation: "new", body_name: "Rod_NeckB", name: "Rod_NeckB" } },
  cyl("Rod_EyeB", P.re_d, ["lk_c", 0], [-P.re_t / 2, P.re_t / 2]),
  cyl("Rod_BallB", P.re_ball_d, ["lk_c", 0], [-(P.re_ball_w - 0.5) / 2, (P.re_ball_w - 0.5) / 2]),
  cyl("Rod_PinB", 5, ["lk_c", 0], [-(Y.rod - Y.shankIn[0]), Y.rod - Y.shankIn[0]]),
]);

// ---- placements ----
const MY = reflect("y");
const at = (sx, sy) => tr(sx * P.hip_x, sy * P.abd_y, 0);
const hipAt = (sx, sy) => {
  const front = sy > 0 ? at(1, 1) : mul(MY, at(1, 1), reflect("z"));   // right hand: the left hip turned about X
  return sx > 0 ? front : mul(rz(180), sy > 0 ? mul(MY, at(1, 1), reflect("z")) : at(1, 1));   // rear: the other hand turned about Z
};
const shankAt = (sx, sy) => mul(at(sx, sy), tr(0, 0, -LT));
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
  cmds.push(...HIP, ...thigh("Thigh_L", 1), ...thigh("Thigh_R", -1), ...shank("Shank_L", 1), ...shank("Shank_R", -1), ...CRANK, ...ROD);
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
      shank: put(sy > 0 ? "Shank_L" : "Shank_R", shankAt(sx, sy)),
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
    asBuilt("Knee_" + id, o.thigh, o.shank, { occurrence: o.thigh, circle: w([0, kneeFaceY, -LT - P.lk_knee_r]) });
    cmd("joint.drive", { joint: "Knee_" + id, value: STAND.knee, quiet: true });
    // the linkage loop, closed where the crank and rod were placed
    asBuilt("KneeCrank_" + id, o.thigh, o.crank, { occurrence: o.thigh, point: w([0, Y.crank[1], 0]), z: [0, 1, 0] });
    const c = Math.cos((POSE.phi * Math.PI) / 180), s = Math.sin((POSE.phi * Math.PI) / 180);
    const pinR = P.crank_arm_w / 2;
    asBuilt("RodCrank_" + id, o.crank, o.rod, { occurrence: o.crank, circle: w([POSE.A[0] + pinR * c, Y.crank[0], POSE.A[1] + pinR * s]) });
    // rod end to lever: a ball joint between the rod's pin end and the pin hole, both on the inner shank plate's inner face
    const lv = [POSE.B[0] - 0, POSE.B[1] + LT];                     // lever direction (knee to pin), in the leg plane
    const ll = Math.hypot(lv[0], lv[1]), u = [lv[0] / ll, lv[1] / ll];
    cmd("joint.create", { type: "ball", name: "RodLever_" + id, flip: true, quiet: true,
      a: { occurrence: o.rod, circle: w([POSE.B[0] + 2.5 * u[0], Y.shankIn[0], POSE.B[1] + 2.5 * u[1]]) },
      b: { occurrence: o.shank, circle: w([POSE.B[0] + 2.75 * u[0], Y.shankIn[0], POSE.B[1] + 2.75 * u[1]]) } });
    cmd("joint.limits", { joint: "Knee_" + id, min: LIMITS.knee[0], max: LIMITS.knee[1], quiet: true });
  }
  for (const id of Object.keys(LEGS)) cmd("joint.drive", { joint: "HipPitch_" + id, value: STAND.hip, quiet: true });

  // contact: one set of every top-level link and the torso, so a drag stops where two of them would collide. Saved
  // switched off: live contact makes dragging far too slow here (sub-mm joint clearances); switch it on in the app
  // only to probe a limit.
  const all = ["Torso:1", ...Object.values(occ).flatMap((o) => Object.values(o))];
  cmd("contact.create", { occurrences: all, name: "Collisions" });
  cmd("contact.enable_sets", { enabled: false });
  // parameters: every dims.js name the commands use (lk_c follows lt here, so dragging lt keeps the knee zero)
  const text = JSON.stringify(cmds);
  const used = Object.keys(P).filter((k) => new RegExp(`\\b${k}\\b`).test(text));
  const params = used.map((k) => ({ command: "parameters.add", params: { name: k,
    expression: k === "lk_c" ? `lt + ${P.lk_c - P.lt} mm` : P[k] + (/_ang$/.test(k) ? " deg" : " mm") } }));
  return { file: FILE, cmds: [...params, ...cmds], occ, pose: POSE };
}

module.exports = { rig };
