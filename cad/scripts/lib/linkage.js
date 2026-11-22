// Knee four-bar of the linkage leg, in the thigh's plane: x forward, z up, hip axis at (0, 0), knee axis at
// (0, -lt). The crank (a) turns about the hip axis with the knee actuator; the shank lever (b) points up the
// shank axis above the knee, turned by dl degrees (positive toward the rear), so it is roughly opposite the
// shank; the pushrod (c) joins the two pins.
// q is the knee fold in degrees (0 = straight leg; the knee joint's value is -q).
// g overrides the geometry ({a, b, c, dl, lt}); by default it is the one in dims.js (dl = lk_ang).
const P = require("../dims");
const rad = (d) => (d * Math.PI) / 180, deg = (r) => (r * 180) / Math.PI;
const DEFAULT = { a: P.lk_a, b: P.lk_b, c: P.lk_c, dl: P.lk_ang, lt: P.lt };

function knee(q, g = {}) {
  const { a, b, c, dl, lt } = Object.assign({}, DEFAULT, g);
  const th = rad(90 + q + dl);                             // the shank points at -90 + q
  const B = [b * Math.cos(th), -lt + b * Math.sin(th)];
  const d = Math.hypot(B[0], B[1]);
  const cosA = (a * a + d * d - c * c) / (2 * a * d);
  if (Math.abs(cosA) > 1) throw new Error(`knee linkage cannot close at ${q} deg`);
  const phi = Math.atan2(B[1], B[0]) - Math.acos(cosA);   // the branch with the crank behind the hip axis
  const A = [a * Math.cos(phi), a * Math.sin(phi)];
  return { phi: deg(phi), A, B };
}

// Knee torque per unit of actuator torque at fold q (the crank's turn per turn of the knee).
function ratio(q, g) {
  let d = knee(q + 0.5, g).phi - knee(q - 0.5, g).phi;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return Math.abs(d);
}

module.exports = { knee, ratio };
