// Part-building helpers: every feature comes from a fully constrained sketch, positions are
// dimensions or constraints (never typed coordinates), repeats are patterns or mirrors.
// Values are numbers or expressions over the names in dims.js ("rs_m3_bcd/2"); a part's file gets
// the names it uses as parameters. neg("lt") is a position on the negative side: the dimension
// keeps the magnitude, the sign only places the initial geometry.
const P = require("../dims");

const KEYS = Object.keys(P);
const evalExpr = (e) => Function(...KEYS, `return (${e});`)(...KEYS.map((k) => P[k]));
const val = (e) => (typeof e === "number" ? e : typeof e === "object" ? e.s * val(e.e) : evalExpr(e));
const mag = (e) => (typeof e === "object" ? e.e : e);            // what a dimension is given
const neg = (e) => ({ e, s: -1 });
const r4 = (v) => Math.round(v * 1e4) / 1e4;
const rad = (d) => (d * Math.PI) / 180;

class Sketch {
  constructor(part) { this.part = part; this.n = { l: 0, c: 0, a: 0, p: 0 }; }
  cmd(command, params) { this.part.cmds.push({ command, params }); }
  dim(entities, value, type) { this.cmd("sketch.dimension", Object.assign({ entities, value: mag(value) }, type ? { type } : {})); }
  coincident(a, b) { this.cmd("sketch.constraint.coincident", { a, b }); }
  hv(a, b, mode) { this.cmd("sketch.constraint.horizontal_vertical", { points: [a, b], mode }); }
  // Position a point from the sketch origin. Something drawn on the origin is tied to it as it is drawn.
  place(pt, x, y) {
    const X = val(x), Y = val(y);
    if (X === 0 && Y === 0) return;
    if (X === 0) this.hv("origin", pt, "vertical"); else this.dim(["origin", pt], x, "horizontal");
    if (Y === 0) this.hv("origin", pt, "horizontal"); else this.dim(["origin", pt], y, "vertical");
  }
  circle(x, y, d) {
    this.cmd("sketch.circle.center", { center: [r4(val(x)), r4(val(y))], radius: r4(val(d) / 2) });
    const id = "c" + ++this.n.c;
    this.dim([id], d, "diameter");
    this.place(id + ".center", x, y);
    return id;
  }
  // A circle or a point on an existing point (the end of a polar line).
  circleOn(ref, d) {
    this.cmd("sketch.circle.center", { center: ref.at, radius: r4(val(d) / 2) });
    const id = "c" + ++this.n.c;
    this.dim([id], d, "diameter");
    this.coincident(id + ".center", ref.id);
    return id;
  }
  point(x, y) {
    this.cmd("sketch.point", { point: [r4(val(x)), r4(val(y))] });
    const id = "p" + ++this.n.p;
    this.place(id, x, y);
    return id;
  }
  pointOn(ref) {
    this.cmd("sketch.point", { point: ref.at });
    const id = "p" + ++this.n.p;
    this.coincident(id, ref.id);
    return id;
  }
  // Construction line of length r at `deg` from the sketch x axis. `from` is "origin", an existing
  // point {id, at}, or a position [x, y] that the line's start is then dimensioned to.
  polar(from, r, deg) {
    const c = from === "origin" ? [0, 0] : Array.isArray(from) ? [val(from[0]), val(from[1])] : from.at;
    const end = [r4(c[0] + val(r) * Math.cos(rad(deg))), r4(c[1] + val(r) * Math.sin(rad(deg)))];
    this.cmd("sketch.draw.dimensioned", { command: "sketch.line", params: { points: [[r4(c[0]), r4(c[1])], end] },
      dimensions: { length: mag(r), angle: deg + " deg" } });
    const id = "l" + ++this.n.l;
    this.cmd("sketch.construction", { curves: [id] });
    if (Array.isArray(from)) this.place(id + ".start", from[0], from[1]);
    else if (from !== "origin") this.coincident(id + ".start", from.id);
    return { start: { id: id + ".start", at: [r4(c[0]), r4(c[1])] }, end: { id: id + ".end", at: end } };
  }
  // Rectangle with its two sizes dimensioned; position it with dist() and on().
  rect(x0, y0, x1, y1, w, h) {
    this.cmd("sketch.rectangle.two_point", { p0: [r4(val(x0)), r4(val(y0))], p1: [r4(val(x1)), r4(val(y1))] });
    const l = this.n.l; this.n.l += 4; this.n.p += 4;
    const r = { bottom: "l" + (l + 1), right: "l" + (l + 2), top: "l" + (l + 3), left: "l" + (l + 4) };
    this.dim([r.bottom], w);
    this.dim([r.right], h);
    return r;
  }
  dist(line, d) { this.dim(["origin", line], d); }            // origin to a line
  on(line) { this.coincident("origin", line); }                 // line through the origin
  // Rectangle symmetric about the sketch x axis, from x0 to x1.
  rectX(x0, x1, w, h) {
    const r = this.rect(x0, neg(`(${mag(h)})/2`), x1, `(${mag(h)})/2`, w, h);
    this.dist(r.bottom, `(${mag(h)})/2`);
    return r;
  }
  // Rectangle centred on the origin.
  rectC(w, h) {
    const r = this.rectX(neg(`(${mag(w)})/2`), `(${mag(w)})/2`, w, h);
    this.dist(r.right, `(${mag(w)})/2`);
    return r;
  }
  // Slot between arc centres c0 and c1 (horizontal or vertical).
  slot(c0, c1, length, width) {
    const a = [val(c0[0]), val(c0[1])], b = [val(c1[0]), val(c1[1])];
    this.cmd("sketch.draw.dimensioned", { command: "sketch.slot.center_to_center",
      params: { p0: a.map(r4), p1: b.map(r4), width: r4(val(width)) }, dimensions: { length: mag(length), width: mag(width) } });
    const first = "a" + (this.n.a + 2) + ".center", second = "a" + (this.n.a + 1) + ".center";   // a2 is at c0
    this.n.l += 3; this.n.a += 2; this.n.p += 5;
    const centred = Math.abs(a[0] + b[0]) < 1e-9 && Math.abs(a[1] + b[1]) < 1e-9;   // middle on the origin: tied as drawn
    if (!centred) this.place(first, c0[0], c0[1]);
    this.hv(first, second, Math.abs(a[0] - b[0]) < 1e-9 ? "vertical" : "horizontal");
  }
  // Outline of two circles joined by their outer tangent lines: radius r0 about the origin, r1 about
  // (0, -L) (a tapered link). Two arcs and two lines, tangent where they meet. Use it in a sketch of its own:
  // the points it creates are not tracked.
  taper(r0, L, r1) {
    const R = val(r0), r = val(r1), Lv = val(L), al = Math.asin((R - r) / Lv), c = Math.cos(al), s = Math.sin(al);
    const a1 = "a" + (this.n.a + 1), a2 = "a" + (this.n.a + 2), l1 = "l" + (this.n.l + 1), l2 = "l" + (this.n.l + 2);
    this.cmd("sketch.arc.center_point", { center: [0, 0], start: [r4(R * c), r4(R * s)], end: [r4(-R * c), r4(R * s)] });
    this.cmd("sketch.arc.center_point", { center: [0, r4(-Lv)], start: [r4(-r * c), r4(-Lv + r * s)], end: [r4(r * c), r4(-Lv + r * s)] });
    this.cmd("sketch.line", { points: [a2 + ".end", a1 + ".start"] });
    this.cmd("sketch.line", { points: [a1 + ".end", a2 + ".start"] });
    this.n.a += 2; this.n.l += 2;
    this.dim([a1], r0, "radius");
    this.dim([a2], r1, "radius");
    this.hv("origin", a2 + ".center", "vertical");
    this.dim(["origin", a2 + ".center"], L, "vertical");
    for (const l of [l1, l2]) for (const a of [a1, a2]) this.cmd("sketch.constraint.tangent", { a: l, b: a });
  }
  // Patterns and mirrors come last in a sketch: the ids they create are not tracked.
  pattern(entities, center, count) {
    this.cmd("sketch.pattern.circular", { entities, center: center === "origin" ? "origin" : center.id, count });
  }
  mirror(entities, axis) { this.cmd("sketch.mirror", { entities, line: axis }); }
  ids(prefix, from, to) { const out = []; for (let i = from; i <= to; i++) out.push(prefix + i); return out; }
}

class Part {
  // def: { key, file, body, part_number, description, bom_type?, sym?: {axis, about} }
  constructor(def) { Object.assign(this, def); this.cmds = []; this.sketches = []; }
  // Sketch plane: "XY" | "XZ" | "YZ" | {origin, x_dir, y_dir}; offset along its normal.
  sketch(name, plane, offset, fn) {
    const params = { plane, name };
    if (offset !== 0) params.offset = mag(offset);
    this.cmds.push({ command: "sketch.create", params });
    fn(new Sketch(this));
    this.cmds.push({ command: "sketch.solve", params: {} });
    this.cmds.push({ command: "sketch.finish", params: {} });
    this.sketches.push(name);
    return name;
  }
  target(op) { return op === "new" ? { body_name: this.body } : { targets: [this.body] }; }
  // Extrude the sketch just finished.
  extrude(name, distance, opts = {}) {
    const op = opts.op || "join";
    const params = Object.assign({ operation: op, name }, this.target(op));
    if (opts.through) params.through_all = true; else params.distance = mag(distance);
    if (opts.dir) params.direction = opts.dir;
    this.cmds.push({ command: "solid.extrude", params });
  }
  // One hole feature for every point of a sketch.
  hole(name, sketch, opts) {
    this.cmds.push({ command: "solid.hole", params: Object.assign({ sketch, name, targets: [this.body] }, opts) });
  }
  mirrorFeature(name, features, plane) {
    this.cmds.push({ command: "solid.mirror", params: { features, plane, name } });
  }
  // Parameters this part uses, the commands, its properties and a final measure.
  script() {
    const text = JSON.stringify(this.cmds);
    const used = KEYS.filter((k) => new RegExp(`\\b${k}\\b`).test(text));
    const params = used.map((k) => ({ command: "parameters.add", params: { name: k, expression: P[k] + " mm" } }));
    const meta = { part_number: this.part_number, description: this.description };
    return { commands: [...params, ...this.cmds,
      { command: "document.metadata.set", params: { values: meta } },
      { command: "inspect.measure", params: { summary: true } }] };
  }
}

module.exports = { Part, Sketch, P, val, neg, mag };
