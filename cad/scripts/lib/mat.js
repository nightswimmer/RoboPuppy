// Small 4x4 matrix helpers (row-major arrays of 4 rows) for assembly placements.
const I = () => [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const mul = (...ms) => ms.reduce((a, b) =>
  a.map((row, i) => row.map((_, j) => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j] + a[i][3] * b[3][j])));
const tr = (x, y, z) => [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]];
const rad = (d) => (d * Math.PI) / 180;
const rx = (d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]]; };
const ry = (d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]]; };
const rz = (d) => { const c = Math.cos(rad(d)), s = Math.sin(rad(d)); return [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]; };
// Frame from the images of the part's x, y, z axes and its origin.
const basis = (ex, ey, ez, o) => [[ex[0], ey[0], ez[0], o[0]], [ex[1], ey[1], ez[1], o[1]], [ex[2], ey[2], ez[2], o[2]], [0, 0, 0, 1]];
// Reflection of one coordinate about a plane: c -> 2*about - c.
const reflect = (axis, about = 0) => {
  const m = I(), i = "xyz".indexOf(axis);
  m[i][i] = -1; m[i][3] = 2 * about;
  return m;
};
const det3 = (m) =>
  m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
  m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
  m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
// A placement must be a rigid move: a mirrored part would be a different part to manufacture.
const assertRigid = (m, what) => {
  if (Math.abs(det3(m) - 1) > 1e-9) throw new Error(`${what}: placement is not a rigid move (det ${det3(m)})`);
  return m;
};
const r6 = (v) => Math.round(v * 1e6) / 1e6 + 0;
// Rotation entries keep full precision (a rounded rotation is refused as not rigid); translations are rounded.
const r12 = (v) => Math.round(v * 1e12) / 1e12 + 0;
const flat12 = (m) => [...m[0], ...m[1], ...m[2]].map((v, i) => (i % 4 === 3 ? r6(v) : r12(v)));
const apply = (m, p) => [0, 1, 2].map((i) => r6(m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3]));
const isIdentity = (m) => flat12(m).every((v, i) => Math.abs(v - (i % 5 === 0 ? 1 : 0)) < 1e-9);
module.exports = { I, mul, tr, rx, ry, rz, basis, reflect, det3, assertRigid, flat12, apply, isIdentity };
