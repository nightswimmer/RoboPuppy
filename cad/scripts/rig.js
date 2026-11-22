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
  // shank plates, 26 wide, along an S-shaped centreline: a short line from the knee leaning `lean` deg toward the rear,
  // an arc (s_r1) turning toward the front, then an arc (s_r2) turning back that ends at the foot, under the knee
  // (about 15 mm forward bulge at mid-length, 1 mm to the rear near the knee)
  shank_w: 26, lean: 4, lean_l: 15, s_r1: 150, s_r2: 175,
  top_r: 16, boss_r: 8,                      // shank plate top: round about the knee axle, joined to a boss round the lever pin
  // thigh plates: a hook. Hip round (plate_w/2) and knee round; the rear edge is two convex arcs (nearly straight from
  // the hip, then a tighter one into the knee round), the front edge two concave arcs (a long one from the hip round,
  // then a tight one into the knee round), so the bend is near the knee and the folded shank nests in front of it.
  // The junctions are at rear_j and front_j times lt below the hip. The front edge stays at least 1.5 mm in front
  // of the rod at every fold.
  knee_r: 20, rear_r: [1200, 230], front_r: [210, 40], rear_j: 0.4, front_j: 0.75,
  // thigh standoffs (x, z below the hip): four behind the rod, one in front of it near the hip
  so: [[-40, 45], [-41, 85], [-39, 120], [-36, 145], [3.5, 55]],
  sso: [55, 125],                            // shank spacers, at these distances along the centreline from the knee
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

// ---- thigh plate outline, in the leg plane (x forward, z up): hip round (plate_w/2) and knee round, joined at the
// rear by two convex arcs (centres in front, the rounds inside them) and at the front by two concave arcs (centres in
// front, the rounds outside them), each pair tangent at a junction set by its height. Initial points only; the sketch
// constraints place them. ----
const v2 = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, k) => [a[0] * k, a[1] * k] };
const unit2 = (a) => v2.mul(a, 1 / Math.hypot(a[0], a[1]));
// the point at distance d0 from c0 and d1 from c1, on side sd of the line c0 -> c1
function cci(c0, d0, c1, d1, sd) {
  const d = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]), a = (d0 * d0 - d1 * d1 + d * d) / (2 * d), h2 = d0 * d0 - a * a;
  if (h2 < 0) return null;
  const u = unit2(v2.sub(c1, c0));
  return v2.add(v2.add(c0, v2.mul(u, a)), v2.mul([-u[1], u[0]], sd * Math.sqrt(h2)));
}
function thighOutline() {
  const R0 = P.plate_w / 2, r = NL.knee_r, O = [0, 0], K = [0, -LT];
  const on = (c, rr, toward, sgn) => v2.add(c, v2.mul(unit2(v2.sub(toward, c)), sgn * rr));
  const sweep = (c, p, q) => { let a = Math.atan2(q[1] - c[1], q[0] - c[0]) - Math.atan2(p[1] - c[1], p[0] - c[0]); while (a <= 0) a += 2 * Math.PI; return a; };
  // scan the first arc's centre angle about the hip; keep the valid layout whose junction is nearest the target height
  function chain(R1, R2, zj, front) {
    let best = null;
    for (let th = -1.5; th <= 1.2; th += 0.0005) {
      const C1 = v2.mul([Math.cos(th), Math.sin(th)], front ? R1 + R0 : R1 - R0);
      for (const sd of [-1, 1]) {
        const C2 = cci(C1, R1 - R2, K, front ? R2 + r : R2 - r, sd);
        if (!C2 || C1[0] < 0 || C2[0] < 0) continue;
        const J = v2.add(C1, v2.mul(unit2(v2.sub(C2, C1)), R1));
        const P0 = on(O, R0, C1, front ? 1 : -1), P1 = on(K, r, C2, front ? 1 : -1);
        const ok = front ? sweep(C1, P0, J) < 1.6 && sweep(C2, J, P1) < 1.6 : P0[0] < 0 && J[0] < 0 && P1[0] < 0 && sweep(C1, P0, J) < 1.6 && sweep(C2, J, P1) < 1.6;
        const e = Math.abs(J[1] + zj);
        if (ok && (!best || e < best.e)) best = { e, C1, C2, J, P0, P1 };
      }
    }
    return best;
  }
  const rr = chain(NL.rear_r[0], NL.rear_r[1], NL.rear_j * LT, false), ff = chain(NL.front_r[0], NL.front_r[1], NL.front_j * LT, true);
  return { Ca: rr.C1, Cb: rr.C2, Jr: rr.J, B0: rr.P0, B1: rr.P1, Cc: ff.C1, Cd: ff.C2, Jf: ff.J, F0: ff.P0, F1: ff.P1 };
}
function thighPlate(body, yr, s) {
  const [a, b] = ext(yr, s), o = thighOutline(), rd = (p) => p.map(r4), c = (command, params) => ({ command, params });
  const arc = (center, start, end) => c("sketch.arc.center_point", { center: rd(center), start: rd(start), end: rd(end) });
  return [
    // sketch x = leg X, sketch y = leg Z; the plane's normal is -Y, so the plate extrudes from y = b down to a
    c("sketch.create", { plane: { origin: [0, b, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] }, name: body + "_Sketch" }),
    arc([0, 0], o.F0, o.B0),            // a1 hip round, over the top
    arc([0, -LT], o.B1, o.F1),          // a2 knee round, under it
    arc(o.Ca, o.B0, o.Jr),              // a3 rear edge from the hip (convex, nearly straight)
    arc(o.Cb, o.Jr, o.B1),              // a4 rear edge into the knee (convex)
    arc(o.Cc, o.F0, o.Jf),              // a5 front edge from the hip (concave)
    arc(o.Cd, o.Jf, o.F1),              // a6 front edge into the knee (concave, tight)
    ...[["a3.start", "a1.end"], ["a3.end", "a4.start"], ["a4.end", "a2.start"], ["a5.start", "a1.start"], ["a5.end", "a6.start"], ["a6.end", "a2.end"]]
      .map(([p, q]) => c("sketch.constraint.coincident", { a: p, b: q })),
    ...[["a1", P.plate_w / 2], ["a2", NL.knee_r], ["a3", NL.rear_r[0]], ["a4", NL.rear_r[1]], ["a5", NL.front_r[0]], ["a6", NL.front_r[1]]]
      .map(([e, v]) => c("sketch.dimension", { entities: [e], value: `${v} mm`, type: "radius" })),
    c("sketch.constraint.horizontal_vertical", { points: ["origin", "a2.center"], mode: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "a2.center"], value: "lt", type: "vertical" }),
    ...[["a3", "a1"], ["a3", "a4"], ["a4", "a2"], ["a5", "a1"], ["a5", "a6"], ["a6", "a2"]].map(([p, q]) => c("sketch.constraint.tangent", { a: p, b: q })),
    c("sketch.dimension", { entities: ["origin", "a3.end"], value: `${NL.rear_j} * lt`, type: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "a5.end"], value: `${NL.front_j} * lt`, type: "vertical" }),
    c("sketch.solve", {}),
    c("sketch.finish", {}),
    c("solid.extrude", { distance: r4(b - a), operation: "new", body_name: body, name: body }),
  ];
}

// ---- thigh: the two plates, front hip spacer, standoffs clear of the rod's band and the crank, and the knee actuator. Left and right are two definitions (the spacer sits in front, so the link is not symmetric). ----
function thigh(name, s) {
  const pre = name + "_";
  const plate = (body, yr) => thighPlate(body, yr, s);
  const { Cc } = thighOutline();
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
    { command: "solid.cylinder", params: { diameter: 2 * NL.front_r[0], height: P.cav_lk + 2, base: [r4(Cc[0]), c0 - 1, r4(Cc[1])], axis: "Y", operation: "cut", targets: [pre + "Spacer"], name: pre + "SpacerFront" } },
    ...NL.so.map(([x, z], i) => cyl(pre + "Standoff" + (i + 1), P.standoff_d, [x, -z], Y.cav, s)),
    // knee actuator, output inward onto the crank
    cyl(pre + "Motor", P.rs_body_d, [0, 0], Y.kneeBody, s),
    cyl(pre + "MotorCover", P.rs_cover_d, [0, 0], Y.kneeCover, s),
    cyl(pre + "MotorPilot", P.rs_pilot_d, [0, 0], [Y.kneeBody[0] - P.rs_pilot_h, Y.kneeBody[0]], s),
    box(pre + "PlugUp", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.kneePlug, [P.rs_plug_r0, P.rs_plug_r1], s),
    box(pre + "PlugDown", [-P.rs_plug_w / 2, P.rs_plug_w / 2], Y.kneePlug, [-P.rs_plug_r1, -P.rs_plug_r0], s),
  ]);
}

// ---- shank, in a frame on the knee axis (leg Y kept): two curved plates, each a band along an S-shaped centreline
// (a short line from the knee leaning NL.lean toward the rear, an arc turning toward the front, then an arc turning
// back that ends under the knee at the foot, so it follows ls) and a rounded top (a round about the axle joined to a
// boss round the lever pin); a tube on the axle and spacers between them; the lever pin hole through both tops; the
// foot pad. The curve is not symmetric front to back, so left and right are two definitions (the real plates are flat
// and serve both sides turned over). ----
const PIN = ["lk_b * cos(90 deg + lk_d)", "lk_b * sin(90 deg + lk_d)"];   // lever pin, in the shank frame

// Centreline for the initial drawing (the sketch constraints then place it): line to M, arc 1 (centre C1, turning
// toward the front) to J, arc 2 (centre C2, turning back) to the foot F. Newton on the two turns so that F = (0, -ls).
function centreline() {
  const d0 = (-(90 + NL.lean) * Math.PI) / 180, R1 = NL.s_r1, R2 = NL.s_r2;
  const M = [NL.lean_l * Math.cos(d0), NL.lean_l * Math.sin(d0)];
  const C1 = v2.add(M, v2.mul([-Math.sin(d0), Math.cos(d0)], R1));
  const at = (u1, u2) => {
    const a1 = Math.atan2(M[1] - C1[1], M[0] - C1[0]) + u1, J = v2.add(C1, [R1 * Math.cos(a1), R1 * Math.sin(a1)]);
    const d1 = d0 + u1, C2 = v2.add(J, v2.mul([Math.sin(d1), -Math.cos(d1)], R2));
    const a2 = Math.atan2(J[1] - C2[1], J[0] - C2[0]) - u2;
    return { J, C2, F: v2.add(C2, [R2 * Math.cos(a2), R2 * Math.sin(a2)]) };
  };
  let u1 = 0.4, u2 = 0.7;
  for (let k = 0; k < 60; k++) {
    const f0 = at(u1, u2).F, h = 1e-7, fa = at(u1 + h, u2).F, fb = at(u1, u2 + h).F, e = [f0[0], f0[1] + LS];
    const j = [(fa[0] - f0[0]) / h, (fb[0] - f0[0]) / h, (fa[1] - f0[1]) / h, (fb[1] - f0[1]) / h], det = j[0] * j[3] - j[1] * j[2];
    u1 -= (j[3] * e[0] - j[1] * e[1]) / det;
    u2 -= (-j[2] * e[0] + j[0] * e[1]) / det;
  }
  const { J, C2, F } = at(u1, u2);
  // a point at distance d along the centreline from the knee
  const along = (d) => {
    if (d <= NL.lean_l) return v2.mul([Math.cos(d0), Math.sin(d0)], d);
    d -= NL.lean_l;
    if (d <= R1 * u1) { const t = Math.atan2(M[1] - C1[1], M[0] - C1[0]) + d / R1; return v2.add(C1, [R1 * Math.cos(t), R1 * Math.sin(t)]); }
    d -= R1 * u1;
    const t = Math.atan2(J[1] - C2[1], J[0] - C2[0]) - d / R2;
    return v2.add(C2, [R2 * Math.cos(t), R2 * Math.sin(t)]);
  };
  return { d0, M, C1, J, C2, F, along };
}

function shankPlate(body, yr, s) {
  const [a, b] = ext(yr, s), { d0, M, C1, J, C2 } = centreline(), ls = LS, w = NL.shank_w / 2;
  const rd = (p) => p.map(r4), off = (p, n, d) => rd([p[0] + n[0] * d, p[1] + n[1] * d]);
  const nTop = [-Math.sin(d0), Math.cos(d0)];                             // front normal of the line from the knee
  const nFoot = unit2(v2.sub([0, -ls], C2));                              // radial at the foot (its front normal)
  const c = (command, params) => ({ command, params });
  return [
    // sketch x = leg X, sketch y = leg Z; the plane's normal is -Y, so the plate extrudes from y = b down to a
    c("sketch.create", { plane: { origin: [0, b, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] }, name: body + "_Sketch" }),
    c("sketch.line", { points: [[0, 0], rd(M)] }),                                        // l1, tied to the origin
    c("sketch.arc.center_point", { center: rd(C1), start: rd(M), end: rd(J) }),            // a1, M to J (toward the front)
    c("sketch.arc.center_point", { center: rd(C2), start: [0, r4(-ls)], end: rd(J) }),     // a2, foot to J (back)
    c("sketch.constraint.coincident", { a: "a1.start", b: "l1.end" }),
    c("sketch.constraint.tangent", { a: "l1", b: "a1" }),
    c("sketch.constraint.coincident", { a: "a2.end", b: "a1.end" }),
    c("sketch.constraint.tangent", { a: "a1", b: "a2" }),
    c("sketch.dimension", { entities: ["a1"], value: `${NL.s_r1} mm`, type: "radius" }),
    c("sketch.dimension", { entities: ["a2"], value: `${NL.s_r2} mm`, type: "radius" }),
    c("sketch.constraint.horizontal_vertical", { points: ["origin", "a2.start"], mode: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "a2.start"], value: "ls", type: "vertical" }),
    c("sketch.dimension", { entities: ["l1"], value: `${-(90 + NL.lean)} deg`, type: "angle" }),
    c("sketch.dimension", { entities: ["l1"], value: `${NL.lean_l} mm`, type: "length" }),
    c("sketch.construction", { curves: ["l1", "a1", "a2"] }),
    // band edges: l2, a3, a4 in front (p1 at the knee ... p4 at the foot) and l3, a5, a6 behind (p5 ... p8)
    c("sketch.offset", { curves: ["l1"], distance: `${w} mm`, symmetric: true }),
    // round ends: a7 about the knee (over the top), a8 about the foot (under it)
    c("sketch.arc.center_point", { center: [0, 0], start: off([0, 0], nTop, w), end: off([0, 0], nTop, -w) }),
    c("sketch.constraint.coincident", { a: "a7.start", b: "p1" }),
    c("sketch.constraint.coincident", { a: "a7.end", b: "p5" }),
    c("sketch.arc.center_point", { center: [0, r4(-ls)], start: off([0, -ls], nFoot, -w), end: off([0, -ls], nFoot, w) }),
    c("sketch.constraint.coincident", { a: "a8.center", b: "a2.start" }),
    c("sketch.constraint.coincident", { a: "a8.start", b: "p8" }),
    c("sketch.constraint.coincident", { a: "a8.end", b: "p4" }),
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
  const pre = name + "_", { along } = centreline();
  const y0 = s > 0 ? Y.shankIn[0] - 1 : -(Y.shankOut[1] + 1);
  return component(name, [
    ...shankPlate(pre + "PlateIn", Y.shankIn, s),
    ...shankPlate(pre + "PlateOut", Y.shankOut, s),
    ...shankTop(pre + "TopIn", Y.shankIn, s),
    ...shankTop(pre + "TopOut", Y.shankOut, s),
    { command: "solid.cylinder", params: { diameter: 5.5, height: Y.shankOut[1] - Y.shankIn[0] + 2, base: [PIN[0], y0, PIN[1]],
      axis: "Y", operation: "cut", targets: [pre + "TopIn", pre + "TopOut"], name: pre + "PinHole" } },
    cyl(pre + "Tube", NL.tube_d, [0, 0], Y.gap, s),
    ...NL.sso.map((d, i) => cyl(pre + "Spacer" + (i + 1), P.standoff_d, along(d).map(r4), Y.gap, s)),
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
