// Motion test rig (cad/robot/motion_rig.sc): the linkage-knee robot with simplified legs, made to be dragged
// with the mouse in SolidCraft to find joint limits.
//
// Why a separate file: SolidCraft cannot drag a part inside a sub-assembly (see PROJECT_INSTRUCTIONS.md), so
// here every moving link is one top-level component built in this file from simple bodies (no linked part files,
// no sub-assemblies). The torso is the real parts, linked, in one grounded component (it never moves).
// This is a study model, not a production one: the leg bodies are envelopes with the real sizes and joint
// positions, the left- and right-hand thighs are two definitions, and nothing here goes into a BOM.
//
// The legs here are a new design under study, ahead of the part files (which still have the old linkage):
// the shank is two curved 3 mm aluminium plates with spacers, nested inside the thigh fork, with the rod end
// clamped between them at the lever pin. It folds forward into the thigh's gap until the foot pad meets the
// thigh's hip end (about 160 deg), so the thigh standoffs are on its rear edge, behind the pushrod.
//
// Live parameters (change them in the app's parameter table; the legs and the linkage follow):
//   lt (thigh), ls (shank), lk_a (crank), lk_b (shank lever), lk_c (pushrod, = lt + 3 by default),
//   lk_d (lever pin angle off the shank axis, positive toward the rear).
// Joint limits are plain values on each joint (the app does not re-read a limit expression).
const P = require("./dims");
const parts = require("./parts");
const linkage = require("./lib/linkage");
const { I, mul, tr, ry, rz, basis, reflect, flat12, isIdentity } = require("./lib/mat");

const FILE = "cad/robot/motion_rig.sc";
const LIMITS = { abd: [-45, 45], hip: [-120, 120], knee: [-159, -60] };   // knee: fold 60-159 deg (the foot meets the hip at 159.8)
// Leg lengths under study (the part files still use lt 242.2 / ls 242 from dims.js): 200/200, a little shorter than
// the Go2's 213/213, to lower the knee torque.
const LT = 200, LS = 200;
// The new leg (rig only). Four-bar chosen for a 60-159 deg fold with the crank kept behind the hip spacer. The fold
// starts at 60 (not 50) to raise the knee ratio: 1.38 in the Go2 stance, 1.27-1.38 over the trotting folds (86-105),
// at least 1.25, rising to about 2.7 at 60 and 1.7 at 155; transmission angles at least 18 deg.
// The rod sweeps a band 3 to 28 mm behind the hip-knee line, inside the thigh's convex rear; the lever pin and the rod
// end stick out of the knee round, as on the Unitree legs.
const NL = {
  a: 22, b: 28, c_off: 3, d: -12,             // crank, lever, rod = lt + c_off, lever pin angle (deg, + toward the rear)
  crank_t: 5,                                // crank 5 mm (was 6), so the rod sits on the cavity's mid-plane
  shank_w: 26, lean: 8, bend_r: 172.5,       // shank plates: 26 wide, straight from the knee leaning 8 deg forward,
                                             // then an arc of this radius (centreline) that brings the foot back under the knee
  top_r: 16, boss_r: 8,                      // shank plate top: round about the knee axle, joined to a boss round the lever pin
  // thigh plates: a crescent. Hip round (plate_w/2), knee round, a convex rear edge and a concave front edge (both arcs
  // centred in front, tangent to the two rounds), so the folded shank stays outside the thigh except near the knee.
  knee_r: 20, rear_r: 300, front_r: 200,
  // thigh standoffs (x, z below the hip): four behind the rod, one in front of it near the hip
  so: [[-40, 45], [-41, 85], [-39, 120], [-36, 145], [3.5, 55]],
  sso: [55, 104],                            // shank spacers, along the straight part from the knee
  tube_d: 14,                                // spacer tube on the knee axle, between the shank plates (the rod passes 3.6 mm from it)
};
const GEOM = { a: NL.a, b: NL.b, c: LT + NL.c_off, dl: NL.d, lt: LT };
const STAND = { hip: 45.8, knee: -85.9 };   // the Go2's standing pose (hip 0.8 rad, knee -1.5 rad)
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
  crank: [64 - NL.crank_t, 64],                                  // 59..64
  rod: 55,                                                       // rod plane = mid-plane of the cavity
  shankIn: [47, 50], shankOut: [60, 63],                         // shank plates; 10 mm gap for the rod end and washers
  gap: [50, 60],                                                 // between the shank plates
  foot: [43, 67],                                                // foot pad, centred on the shank
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

// ---- thigh plate outline, in the leg plane (x forward, z up): a crescent of four tangent arcs. Hip round (plate_w/2)
// and knee round; rear edge = a circle of radius NL.rear_r round both (centre in front, touching them inside); front
// edge = a circle of radius NL.front_r outside both (centre in front). Initial points; the constraints place them. ----
function thighOutline() {
  const R0 = P.plate_w / 2, r = NL.knee_r, L = LT, K = [0, -L];
  const centre = (d0, d1) => { const z = (d1 * d1 - d0 * d0 - L * L) / (2 * L); return [Math.sqrt(d0 * d0 - z * z), z]; };
  const Cr = centre(NL.rear_r - R0, NL.rear_r - r), Cf = centre(NL.front_r + R0, NL.front_r + r);
  const toward = (p, c, rr, sgn) => { const d = Math.hypot(c[0] - p[0], c[1] - p[1]); return [p[0] + (sgn * rr * (c[0] - p[0])) / d, p[1] + (sgn * rr * (c[1] - p[1])) / d]; };
  return { Cr, Cf,
    F0: toward([0, 0], Cf, R0, 1), F1: toward(K, Cf, r, 1),      // front edge meets the hip round, the knee round
    B0: toward([0, 0], Cr, R0, -1), B1: toward(K, Cr, r, -1) };  // rear edge meets them (away from its centre)
}
function thighPlate(body, yr, s) {
  const [a, b] = ext(yr, s), o = thighOutline(), rd = (p) => p.map(r4), c = (command, params) => ({ command, params });
  return [
    // sketch x = leg X, sketch y = leg Z; the plane's normal is -Y, so the plate extrudes from y = b down to a
    c("sketch.create", { plane: { origin: [0, b, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] }, name: body + "_Sketch" }),
    c("sketch.arc.center_point", { center: [0, 0], start: rd(o.F0), end: rd(o.B0) }),            // a1 hip round, over the top
    c("sketch.arc.center_point", { center: [0, r4(-LT)], start: rd(o.B1), end: rd(o.F1) }),    // a2 knee round, under it
    c("sketch.arc.center_point", { center: rd(o.Cr), start: rd(o.B0), end: rd(o.B1) }),          // a3 rear edge (convex)
    c("sketch.arc.center_point", { center: rd(o.Cf), start: rd(o.F0), end: rd(o.F1) }),          // a4 front edge (concave)
    c("sketch.constraint.coincident", { a: "a3.start", b: "a1.end" }),
    c("sketch.constraint.coincident", { a: "a3.end", b: "a2.start" }),
    c("sketch.constraint.coincident", { a: "a4.start", b: "a1.start" }),
    c("sketch.constraint.coincident", { a: "a4.end", b: "a2.end" }),
    c("sketch.dimension", { entities: ["a1"], value: `${P.plate_w / 2} mm`, type: "radius" }),
    c("sketch.dimension", { entities: ["a2"], value: `${NL.knee_r} mm`, type: "radius" }),
    c("sketch.dimension", { entities: ["a3"], value: `${NL.rear_r} mm`, type: "radius" }),
    c("sketch.dimension", { entities: ["a4"], value: `${NL.front_r} mm`, type: "radius" }),
    c("sketch.constraint.horizontal_vertical", { points: ["origin", "a2.center"], mode: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "a2.center"], value: "lt", type: "vertical" }),
    c("sketch.constraint.tangent", { a: "a3", b: "a1" }),
    c("sketch.constraint.tangent", { a: "a3", b: "a2" }),
    c("sketch.constraint.tangent", { a: "a4", b: "a1" }),
    c("sketch.constraint.tangent", { a: "a4", b: "a2" }),
    c("sketch.solve", {}),
    c("sketch.finish", {}),
    c("solid.extrude", { distance: r4(b - a), operation: "new", body_name: body, name: body }),
  ];
}

// ---- thigh: the two plates, front hip spacer, standoffs clear of the rod's band and the crank, and the knee actuator. Left and right are two definitions (the spacer sits in front, so the link is not symmetric). ----
function thigh(name, s) {
  const pre = name + "_";
  const plate = (body, yr) => thighPlate(body, yr, s);
  const { Cf } = thighOutline();
  const [c0] = ext(Y.cav, s);
  return component(name, [
    ...plate(pre + "InnerPlate", Y.innerPlate),
    ...plate(pre + "OuterPlate", Y.outerPlate),
    // hip spacer: the front of a disc, with a bore round the crank hub
    cyl(pre + "Spacer", P.plate_w, [0, 0], Y.cav, s),
    { command: "solid.box", params: { length: P.plate_w / 2 + 10 + P.lk_sp_x0, width: P.cav_lk + 2, height: P.plate_w + 20,
      corner: [-(P.plate_w / 2 + 10), c0 - 1, -(P.plate_w / 2 + 10)], operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerRear" } },
    { command: "solid.cylinder", params: { diameter: P.lk_sp_bore_d, height: P.cav_lk + 2, base: [0, c0 - 1, 0], axis: "Y", operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerBore" } },
    // ... trimmed to the plates' concave front edge
    { command: "solid.cylinder", params: { diameter: 2 * NL.front_r, height: P.cav_lk + 2, base: [r4(Cf[0]), c0 - 1, r4(Cf[1])], axis: "Y", operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerFront" } },
    ...NL.so.map(([x, z], i) => cyl(pre + "Standoff" + (i + 1), P.standoff_d, [x, -z], Y.cav, s)),
    // knee actuator, output inward onto the crank
    cyl(pre + "Motor", P.rs_body_d, [0, 0], Y.kneeBody, s),
    cyl(pre + "MotorCover", P.rs_cover_d, [0, 0], Y.kneeCover, s),
    cyl(pre + "MotorPilot", P.rs_pilot_d, [0, 0], [Y.kneeBody[0] - P.rs_pilot_h, Y.kneeBody[0]], s),
    box(pre + "PlugUp", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.kneePlug, [P.rs_plug_r0, P.rs_plug_r1], s),
    box(pre + "PlugDown", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.kneePlug, [-P.rs_plug_r1, -P.rs_plug_r0], s),
  ]);
}

// ---- shank, in a frame on the knee axis (leg Y kept): two curved plates, each a band along a centreline (a line
// from the knee leaning NL.lean forward, then a tangent arc that ends under the knee at the foot, so it follows ls)
// and a rounded top (a round about the axle joined to a boss round the lever pin); a tube on the axle and spacers
// between them; the lever pin hole through both tops; the foot pad. The curve is not symmetric front to back, so left
// and right are two definitions (the real plates are flat and serve both sides turned over). ----
const PIN = ["lk_b * cos(90 deg + lk_d)", "lk_b * sin(90 deg + lk_d)"];   // lever pin, in the shank frame

// Centreline for the initial drawing (the sketch constraints then place it): straight part to M, arc centre C.
function centreline() {
  const e = (NL.lean * Math.PI) / 180, R = NL.bend_r, ls = LS;
  // F = M + R (radial at M turned back by u) must be (0, -ls): Newton on the straight length l and the turn u
  const f = (l, u) => [l * Math.sin(e) - R * Math.cos(e) + R * Math.cos(e - u), -l * Math.cos(e) - R * Math.sin(e) + R * Math.sin(e - u) + ls];
  let l = 0.5 * ls, u = 0.5;
  for (let k = 0; k < 50; k++) {
    const f0 = f(l, u), h = 1e-7, fl = f(l + h, u), fu = f(l, u + h);
    const j = [(fl[0] - f0[0]) / h, (fu[0] - f0[0]) / h, (fl[1] - f0[1]) / h, (fu[1] - f0[1]) / h], det = j[0] * j[3] - j[1] * j[2];
    l -= (j[3] * f0[0] - j[1] * f0[1]) / det;
    u -= (-j[2] * f0[0] + j[0] * f0[1]) / det;
  }
  const M = [l * Math.sin(e), -l * Math.cos(e)];
  return { e, M, C: [M[0] - R * Math.cos(e), M[1] - R * Math.sin(e)] };
}

function shankPlate(body, yr, s) {
  const [a, b] = ext(yr, s), { e, M, C } = centreline(), ls = LS, w = NL.shank_w / 2;
  const rd = (p) => p.map(r4), off = (p, n, d) => rd([p[0] + n[0] * d, p[1] + n[1] * d]);
  const nTop = [Math.cos(e), Math.sin(e)];                                // front normal of the straight part
  const nFoot = [-C[0] / NL.bend_r, (-ls - C[1]) / NL.bend_r];            // outward radial at the foot
  const c = (command, params) => ({ command, params });
  return [
    // sketch x = leg X, sketch y = leg Z; the plane's normal is -Y, so the plate extrudes from y = b down to a
    c("sketch.create", { plane: { origin: [0, b, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] }, name: body + "_Sketch" }),
    c("sketch.line", { points: [[0, 0], rd(M)] }),                                        // l1, tied to the origin
    c("sketch.arc.center_point", { center: rd(C), start: [0, r4(-ls)], end: rd(M) }),      // a1, foot to M
    c("sketch.constraint.coincident", { a: "a1.end", b: "l1.end" }),
    c("sketch.constraint.tangent", { a: "l1", b: "a1" }),
    c("sketch.dimension", { entities: ["a1"], value: `${NL.bend_r} mm`, type: "radius" }),
    c("sketch.constraint.horizontal_vertical", { points: ["origin", "a1.start"], mode: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "a1.start"], value: "ls", type: "vertical" }),
    c("sketch.dimension", { entities: ["l1"], value: `${-(90 - NL.lean)} deg`, type: "angle" }),
    c("sketch.construction", { curves: ["l1", "a1"] }),
    // band edges: l2, a2 in front (p1 at the knee, p3 at the foot) and l3, a3 behind (p4, p6)
    c("sketch.offset", { curves: ["l1"], distance: `${w} mm`, symmetric: true }),
    // round ends: a4 about the knee (over the top), a5 about the foot (under it)
    c("sketch.arc.center_point", { center: [0, 0], start: off([0, 0], nTop, w), end: off([0, 0], nTop, -w) }),
    c("sketch.constraint.coincident", { a: "a4.start", b: "p1" }),
    c("sketch.constraint.coincident", { a: "a4.end", b: "p4" }),
    c("sketch.arc.center_point", { center: [0, r4(-ls)], start: off([0, -ls], nFoot, -w), end: off([0, -ls], nFoot, w) }),
    c("sketch.constraint.coincident", { a: "a5.center", b: "a1.start" }),
    c("sketch.constraint.coincident", { a: "a5.start", b: "p6" }),
    c("sketch.constraint.coincident", { a: "a5.end", b: "p3" }),
    c("sketch.solve", {}),
    c("sketch.finish", {}),
    c("solid.extrude", { distance: r4(b - a), operation: "new", body_name: body, name: body }),
  ];
}

// Plate top: round NL.top_r about the knee, boss NL.boss_r about the lever pin (lk_b at 90 deg + lk_d), joined by
// tangent lines (a tapered link along the lever).
function shankTop(body, yr, s) {
  const [a, b] = ext(yr, s), c = (command, params) => ({ command, params });
  const R = NL.top_r, r = NL.boss_r, th = ((90 + NL.d) * Math.PI) / 180, u = [Math.cos(th), Math.sin(th)];
  const al = Math.asin((R - r) / NL.b), at = (cx, rr, ang) => [r4(cx[0] + rr * Math.cos(ang)), r4(cx[1] + rr * Math.sin(ang))];
  const Pp = [NL.b * u[0], NL.b * u[1]], up = th + Math.PI / 2 + al, dn = th - Math.PI / 2 - al;
  return [
    c("sketch.create", { plane: { origin: [0, b, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] }, name: body + "_Sketch" }),
    c("sketch.draw.dimensioned", { command: "sketch.line", params: { points: [[0, 0], Pp.map(r4)] }, dimensions: { length: "lk_b", angle: "90 deg + lk_d" } }),
    c("sketch.construction", { curves: ["l1"] }),
    c("sketch.arc.center_point", { center: [0, 0], start: at([0, 0], R, up), end: at([0, 0], R, dn) }),   // a1, away from the pin
    c("sketch.arc.center_point", { center: Pp.map(r4), start: at(Pp, r, dn), end: at(Pp, r, up) }),      // a2, round the pin
    c("sketch.constraint.coincident", { a: "a2.center", b: "l1.end" }),
    c("sketch.line", { points: ["a2.end", "a1.start"] }),
    c("sketch.line", { points: ["a1.end", "a2.start"] }),
    c("sketch.dimension", { entities: ["a1"], value: `${R} mm`, type: "radius" }),
    c("sketch.dimension", { entities: ["a2"], value: `${r} mm`, type: "radius" }),
    ...["l2", "l3"].flatMap((l) => ["a1", "a2"].map((arc) => c("sketch.constraint.tangent", { a: l, b: arc }))),
    c("sketch.solve", {}),
    c("sketch.finish", {}),
    c("solid.extrude", { distance: r4(b - a), operation: "new", body_name: body, name: body }),
  ];
}

function shank(name, s) {
  const pre = name + "_", e = (NL.lean * Math.PI) / 180;
  const y0 = s > 0 ? Y.shankIn[0] - 1 : -(Y.shankOut[1] + 1);
  return component(name, [
    ...shankPlate(pre + "PlateIn", Y.shankIn, s),
    ...shankPlate(pre + "PlateOut", Y.shankOut, s),
    ...shankTop(pre + "TopIn", Y.shankIn, s),
    ...shankTop(pre + "TopOut", Y.shankOut, s),
    { command: "solid.cylinder", params: { diameter: 5.5, height: Y.shankOut[1] - Y.shankIn[0] + 2, base: [PIN[0], y0, PIN[1]],
      axis: "Y", operation: "cut", targets: [pre + "TopIn", pre + "TopOut"], name: pre + "PinHole" } },
    cyl(pre + "Tube", NL.tube_d, [0, 0], Y.gap, s),
    ...NL.sso.map((d, i) => cyl(pre + "Spacer" + (i + 1), P.standoff_d, [d * Math.sin(e), -d * Math.cos(e)], Y.gap, s)),
    cyl(pre + "Foot", P.foot_pad_od, [0, "-ls"], Y.foot, s),
  ]);
}

// ---- crank, in a frame on the knee actuator axis, centred on its own mid-plane (so one definition serves both hands)
const CRANK = component("Crank", [
  cyl("Crank_Hub", P.crank_hub_d, [0, 0], [-NL.crank_t / 2, NL.crank_t / 2]),
  { command: "solid.box", params: { length: "lk_a", width: NL.crank_t, height: P.crank_arm_w, corner: [0, -NL.crank_t / 2, -P.crank_arm_w / 2], operation: "new", body_name: "Crank_Arm", name: "Crank_Arm" } },
  cyl("Crank_Pin", P.crank_arm_w, ["lk_a", 0], [-NL.crank_t / 2, NL.crank_t / 2]),
]);

// ---- pushrod with its two rod ends, in a frame at the crank-end ball centre, rod along +X, centred on the rod plane.
// Ball and rod are 0.25 mm thinner each side than the real parts, so they clear the crank and the clevis by 0.25 mm
// (rod 7.5, ball 7.5 wide). The pin at the lever end runs between the shank plates' outer faces. ----
const ROD = component("Rod", [
  cyl("Rod_EyeA", P.re_d, [0, 0], [-P.re_t / 2, P.re_t / 2]),
  cyl("Rod_BallA", P.re_ball_d, [0, 0], [-(P.re_ball_w - 0.5) / 2, (P.re_ball_w - 0.5) / 2]),
  { command: "solid.cylinder", params: { diameter: P.re_neck_d, height: P.re_neck, base: [0, 0, 0], axis: "X", operation: "new", body_name: "Rod_NeckA", name: "Rod_NeckA" } },
  { command: "solid.cylinder", params: { diameter: P.rod_d - 0.5, height: `lk_c - ${2 * P.rod_end_gap} mm`, base: [P.rod_end_gap, 0, 0], axis: "X", operation: "new", body_name: "Rod_Bar", name: "Rod_Bar" } },
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
const POSE = linkage.knee(-STAND.knee, GEOM);                                  // crank angle and pin centres at the standing knee
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

  for (const [name, expression] of [["lt", `${LT} mm`], ["ls", `${LS} mm`], ["lk_a", `${NL.a} mm`], ["lk_b", `${NL.b} mm`], ["lk_c", `lt + ${NL.c_off} mm`], ["lk_d", `${NL.d} deg`]])
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
    asBuilt("Knee_" + id, o.thigh, o.shank, { occurrence: o.thigh, circle: w([0, kneeFaceY, -LT - NL.knee_r]) });
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
  return { file: FILE, cmds, occ, pose: POSE };
}

module.exports = { rig };
