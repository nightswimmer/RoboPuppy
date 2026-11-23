// Outlines of the linkage leg's thigh and shank plates: the geometry and the sketch commands that draw it. One source for
// the part files (parts.js) and the motion rig (rig.js), so the two stay in step.
// 2D coordinates are the leg plane: x forward, y = the leg's Z (up). The thigh's origin is the hip axis, the knee at
// (0, -lt); the shank's origin is the knee axis, the foot at (0, -ls), with the leg straight.
// The sketch commands go inside a sketch of their own (the ids they rely on, a1, l1, p1 ..., start from 1). Sizes are
// dims.js names, so a part file gets them as parameters; the coordinates given are only the initial drawing.
const P = require("../dims");

const r4 = (v) => (typeof v === "number" ? Math.round(v * 1e4) / 1e4 : v);
const rd = (p) => p.map(r4);
const v2 = { add: (a, b) => [a[0] + b[0], a[1] + b[1]], sub: (a, b) => [a[0] - b[0], a[1] - b[1]], mul: (a, k) => [a[0] * k, a[1] * k] };
const unit2 = (a) => v2.mul(a, 1 / Math.hypot(a[0], a[1]));
const c = (command, params) => ({ command, params });

// the point at distance d0 from c0 and d1 from c1, on side sd of the line c0 -> c1
function cci(c0, d0, c1, d1, sd) {
  const d = Math.hypot(c1[0] - c0[0], c1[1] - c0[1]), a = (d0 * d0 - d1 * d1 + d * d) / (2 * d), h2 = d0 * d0 - a * a;
  if (h2 < 0) return null;
  const u = unit2(v2.sub(c1, c0));
  return v2.add(v2.add(c0, v2.mul(u, a)), v2.mul([-u[1], u[0]], sd * Math.sqrt(h2)));
}

// ---- thigh plate: hip round (plate_w/2) and knee round (lk_knee_r), joined at the rear by two convex arcs (centres in
// front, the rounds inside them) and at the front by two concave arcs (centres in front, the rounds outside them), each
// pair tangent at a junction set by its height. ----
function thighOutline(lt = P.lt) {
  const R0 = P.plate_w / 2, r = P.lk_knee_r, O = [0, 0], K = [0, -lt];
  const on = (cc, rr, toward, sgn) => v2.add(cc, v2.mul(unit2(v2.sub(toward, cc)), sgn * rr));
  const sweep = (cc, p, q) => { let a = Math.atan2(q[1] - cc[1], q[0] - cc[0]) - Math.atan2(p[1] - cc[1], p[0] - cc[0]); while (a <= 0) a += 2 * Math.PI; return a; };
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
  const rr = chain(P.th_rear_r1, P.th_rear_r2, P.th_rear_j * lt, false), ff = chain(P.th_front_r1, P.th_front_r2, P.th_front_j * lt, true);
  return { Ca: rr.C1, Cb: rr.C2, Jr: rr.J, B0: rr.P0, B1: rr.P1, Cc: ff.C1, Cd: ff.C2, Jf: ff.J, F0: ff.P0, F1: ff.P1 };
}

// Sketch: arcs a1 (hip round, over the top), a2 (knee round, under it), a3/a4 (rear edge), a5/a6 (front edge).
function thighOutlineCmds() {
  const o = thighOutline();
  const arc = (center, start, end) => c("sketch.arc.center_point", { center: rd(center), start: rd(start), end: rd(end) });
  return [
    arc([0, 0], o.F0, o.B0),            // a1 hip round, over the top
    arc([0, -P.lt], o.B1, o.F1),        // a2 knee round, under it
    arc(o.Ca, o.B0, o.Jr),              // a3 rear edge from the hip (convex, nearly straight)
    arc(o.Cb, o.Jr, o.B1),              // a4 rear edge into the knee (convex)
    arc(o.Cc, o.F0, o.Jf),              // a5 front edge from the hip (concave)
    arc(o.Cd, o.Jf, o.F1),              // a6 front edge into the knee (concave, tight)
    ...[["a3.start", "a1.end"], ["a3.end", "a4.start"], ["a4.end", "a2.start"], ["a5.start", "a1.start"], ["a5.end", "a6.start"], ["a6.end", "a2.end"]]
      .map(([p, q]) => c("sketch.constraint.coincident", { a: p, b: q })),
    ...[["a1", "plate_w/2"], ["a2", "lk_knee_r"], ["a3", "th_rear_r1"], ["a4", "th_rear_r2"], ["a5", "th_front_r1"], ["a6", "th_front_r2"]]
      .map(([e, v]) => c("sketch.dimension", { entities: [e], value: v, type: "radius" })),
    c("sketch.constraint.horizontal_vertical", { points: ["origin", "a2.center"], mode: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "a2.center"], value: "lt", type: "vertical" }),
    ...[["a3", "a1"], ["a3", "a4"], ["a4", "a2"], ["a5", "a1"], ["a5", "a6"], ["a6", "a2"]].map(([p, q]) => c("sketch.constraint.tangent", { a: p, b: q })),
    c("sketch.dimension", { entities: ["origin", "a3.end"], value: `${P.th_rear_j} * lt`, type: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "a5.end"], value: `${P.th_front_j} * lt`, type: "vertical" }),
  ];
}

// ---- shank plate: a band sh_w wide along an S-shaped centreline (line to M, arc 1 about C1 toward the front to J, arc 2
// about C2 back to the foot F = (0, -ls)), round ends. Newton on the two turns so that F lands under the knee. ----
function centreline(ls = P.ls) {
  const d0 = (-(90 + P.sh_lean_ang) * Math.PI) / 180, R1 = P.sh_r1, R2 = P.sh_r2;
  const M = [P.sh_lean_l * Math.cos(d0), P.sh_lean_l * Math.sin(d0)];
  const C1 = v2.add(M, v2.mul([-Math.sin(d0), Math.cos(d0)], R1));
  const at = (u1, u2) => {
    const a1 = Math.atan2(M[1] - C1[1], M[0] - C1[0]) + u1, J = v2.add(C1, [R1 * Math.cos(a1), R1 * Math.sin(a1)]);
    const d1 = d0 + u1, C2 = v2.add(J, v2.mul([Math.sin(d1), -Math.cos(d1)], R2));
    const a2 = Math.atan2(J[1] - C2[1], J[0] - C2[0]) - u2;
    return { J, C2, F: v2.add(C2, [R2 * Math.cos(a2), R2 * Math.sin(a2)]) };
  };
  let u1 = 0.4, u2 = 0.7;
  for (let k = 0; k < 60; k++) {
    const f0 = at(u1, u2).F, h = 1e-7, fa = at(u1 + h, u2).F, fb = at(u1, u2 + h).F, e = [f0[0], f0[1] + ls];
    const j = [(fa[0] - f0[0]) / h, (fb[0] - f0[0]) / h, (fa[1] - f0[1]) / h, (fb[1] - f0[1]) / h], det = j[0] * j[3] - j[1] * j[2];
    u1 -= (j[3] * e[0] - j[1] * e[1]) / det;
    u2 -= (-j[2] * e[0] + j[0] * e[1]) / det;
  }
  const { J, C2, F } = at(u1, u2);
  // the point at distance d along the centreline from the knee, and the segment it is on (0 line, 1 arc 1, 2 arc 2)
  const along = (d) => {
    if (d <= P.sh_lean_l) return { p: v2.mul([Math.cos(d0), Math.sin(d0)], d), seg: 0 };
    d -= P.sh_lean_l;
    if (d <= R1 * u1) { const t = Math.atan2(M[1] - C1[1], M[0] - C1[0]) + d / R1; return { p: v2.add(C1, [R1 * Math.cos(t), R1 * Math.sin(t)]), seg: 1 }; }
    d -= R1 * u1;
    const t = Math.atan2(J[1] - C2[1], J[0] - C2[0]) - d / R2;
    return { p: v2.add(C2, [R2 * Math.cos(t), R2 * Math.sin(t)]), seg: 2 };
  };
  // the plate end's direction at the foot: the centreline's tangent there, pointing up the shank (degrees from +x)
  const footUp = (Math.atan2(F[1] - C2[1], F[0] - C2[0]) * 180) / Math.PI + 90;
  return { d0, M, C1, J, C2, F, u1, u2, along, footUp };
}

// Sketch: the centreline (construction): l1 from the knee, a1 (toward the front), a2 (foot to J).
function centrelineCmds() {
  const { M, C1, J, C2 } = centreline();
  return [
    c("sketch.line", { points: [[0, 0], rd(M)] }),                                        // l1, tied to the origin
    c("sketch.arc.center_point", { center: rd(C1), start: rd(M), end: rd(J) }),            // a1, M to J (toward the front)
    c("sketch.arc.center_point", { center: rd(C2), start: [0, r4(-P.ls)], end: rd(J) }),   // a2, foot to J (back)
    c("sketch.constraint.coincident", { a: "a1.start", b: "l1.end" }),
    c("sketch.constraint.tangent", { a: "l1", b: "a1" }),
    c("sketch.constraint.coincident", { a: "a2.end", b: "a1.end" }),
    c("sketch.constraint.tangent", { a: "a1", b: "a2" }),
    c("sketch.dimension", { entities: ["a1"], value: "sh_r1", type: "radius" }),
    c("sketch.dimension", { entities: ["a2"], value: "sh_r2", type: "radius" }),
    c("sketch.constraint.horizontal_vertical", { points: ["origin", "a2.start"], mode: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "a2.start"], value: "ls", type: "vertical" }),
    c("sketch.dimension", { entities: ["l1"], value: "-(90 deg + sh_lean_ang)", type: "angle" }),
    c("sketch.dimension", { entities: ["l1"], value: "sh_lean_l", type: "length" }),
    c("sketch.construction", { curves: ["l1", "a1", "a2"] }),
  ];
}

// Sketch: the band. Centreline as above, then its offsets (l2, a3, a4 in front, p1 at the knee ... p4 at the foot; l3,
// a5, a6 behind, p5 ... p8) and round ends: a7 about the knee (over the top), a8 about the foot (under it).
function shankBandCmds() {
  const { d0, C2 } = centreline(), w = P.sh_w / 2;
  const off = (p, n, d) => rd([p[0] + n[0] * d, p[1] + n[1] * d]);
  const nTop = [-Math.sin(d0), Math.cos(d0)];                             // front normal of the line from the knee
  const nFoot = unit2(v2.sub([0, -P.ls], C2));                            // radial at the foot (its front normal)
  return [
    ...centrelineCmds(),
    c("sketch.offset", { curves: ["l1"], distance: "sh_w/2", symmetric: true }),
    c("sketch.arc.center_point", { center: [0, 0], start: off([0, 0], nTop, w), end: off([0, 0], nTop, -w) }),
    c("sketch.constraint.coincident", { a: "a7.start", b: "p1" }),
    c("sketch.constraint.coincident", { a: "a7.end", b: "p5" }),
    c("sketch.arc.center_point", { center: [0, r4(-P.ls)], start: off([0, -P.ls], nFoot, -w), end: off([0, -P.ls], nFoot, w) }),
    c("sketch.constraint.coincident", { a: "a8.center", b: "a2.start" }),
    c("sketch.constraint.coincident", { a: "a8.start", b: "p8" }),
    c("sketch.constraint.coincident", { a: "a8.end", b: "p4" }),
  ];
}

// The lever pin, in the shank frame: lk_b from the knee, at 90 deg + lk_ang.
const pin = () => { const t = ((90 + P.lk_ang) * Math.PI) / 180; return [P.lk_b * Math.cos(t), P.lk_b * Math.sin(t)]; };

// Sketch: the plate top, a round sh_top_r about the knee and a boss sh_boss_r about the lever pin joined by tangent lines
// (l1 is the construction line knee -> pin; a1 the round, a2 the boss, l2 and l3 the tangents).
function shankTopCmds() {
  const R = P.sh_top_r, r = P.sh_boss_r, th = ((90 + P.lk_ang) * Math.PI) / 180;
  const al = Math.asin((R - r) / P.lk_b), at = (cx, rr, ang) => [r4(cx[0] + rr * Math.cos(ang)), r4(cx[1] + rr * Math.sin(ang))];
  const Pp = pin(), up = th + Math.PI / 2 + al, dn = th - Math.PI / 2 - al;
  return [
    c("sketch.draw.dimensioned", { command: "sketch.line", params: { points: [[0, 0], rd(Pp)] }, dimensions: { length: "lk_b", angle: "90 deg + lk_ang" } }),
    c("sketch.construction", { curves: ["l1"] }),
    c("sketch.arc.center_point", { center: [0, 0], start: at([0, 0], R, up), end: at([0, 0], R, dn) }),   // a1, away from the pin
    c("sketch.arc.center_point", { center: rd(Pp), start: at(Pp, r, dn), end: at(Pp, r, up) }),           // a2, round the pin
    c("sketch.constraint.coincident", { a: "a2.center", b: "l1.end" }),
    c("sketch.line", { points: ["a2.end", "a1.start"] }),
    c("sketch.line", { points: ["a1.end", "a2.start"] }),
    c("sketch.dimension", { entities: ["a1"], value: "sh_top_r", type: "radius" }),
    c("sketch.dimension", { entities: ["a2"], value: "sh_boss_r", type: "radius" }),
    ...["l2", "l3"].flatMap((l) => ["a1", "a2"].map((arc) => c("sketch.constraint.tangent", { a: l, b: arc }))),
  ];
}

// ---- knee hub (printed, between the shank plates; shank plate frame, centred on the knee axis) ----
// Body: a round kh_d across, cut back to kh_rel_r between kh_rel0_ang and kh_rel1_ang (0 = forward, 90 = up), where the
// pushrod passes close to the knee at deep folds. Construction lines l1/l2 (kh_rel_r long) set the relief's ends; a1 is
// the round, a2 the relief, l3/l4 the radial steps between them (collinear with l2/l1).
function kneeHubCmds() {
  const R = P.kh_d / 2, r = P.kh_rel_r, a0 = (P.kh_rel0_ang * Math.PI) / 180, a1 = (P.kh_rel1_ang * Math.PI) / 180;
  const at = (rr, a) => [r4(rr * Math.cos(a)), r4(rr * Math.sin(a))];
  const ray = (a, ang) => c("sketch.draw.dimensioned", { command: "sketch.line", params: { points: [[0, 0], at(r, a)] }, dimensions: { length: "kh_rel_r", angle: ang } });
  return [
    ray(a0, "kh_rel0_ang"), c("sketch.construction", { curves: ["l1"] }),
    ray(a1, "kh_rel1_ang"), c("sketch.construction", { curves: ["l2"] }),
    c("sketch.arc.center_point", { center: [0, 0], start: at(R, a1), end: at(R, a0) }),   // a1, the round (the long way)
    c("sketch.arc.center_point", { center: [0, 0], start: at(r, a0), end: at(r, a1) }),   // a2, the relief
    c("sketch.line", { points: ["a2.end", "a1.start"] }),                                 // l3
    c("sketch.line", { points: ["a1.end", "a2.start"] }),                                 // l4
    c("sketch.constraint.coincident", { a: "a2.start", b: "l1.end" }),
    c("sketch.constraint.coincident", { a: "a2.end", b: "l2" }),
    c("sketch.dimension", { entities: ["a1"], value: "kh_d/2", type: "radius" }),
    c("sketch.constraint.coincident", { a: "l3", b: "l2" }),
    c("sketch.constraint.coincident", { a: "l4", b: "l1" }),
  ];
}

// The hub's D-shaped spigot, and the matching hole in each shank plate (one source for both): a round kh_key_d across
// with a flat kh_key behind the axis, so the hub cannot turn in the plates and its relief stays toward the rod.
function kneeKeyCmds() {
  const R = P.kh_key_d / 2, h = Math.sqrt(R * R - P.kh_key * P.kh_key);
  return [
    c("sketch.arc.center_point", { center: [0, 0], start: [-P.kh_key, r4(-h)], end: [-P.kh_key, r4(h)] }),   // a1, round the front
    c("sketch.line", { points: ["a1.end", "a1.start"] }),                                                    // l1, the flat
    c("sketch.dimension", { entities: ["a1"], value: "kh_key_d/2", type: "radius" }),
    c("sketch.constraint.horizontal_vertical", { points: ["l1.start", "l1.end"], mode: "vertical" }),
    c("sketch.dimension", { entities: ["origin", "l1"], value: "kh_key" }),
  ];
}

module.exports = { thighOutline, thighOutlineCmds, centreline, centrelineCmds, shankBandCmds, shankTopCmds, kneeHubCmds, kneeKeyCmds, pin, v2, unit2 };
