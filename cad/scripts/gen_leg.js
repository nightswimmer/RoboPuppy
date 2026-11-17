// Generates the SolidCraft command script for one detailed leg (front-left, leg-local frame) on a stub bulkhead.
// Usage: node cad/scripts/gen_leg.js   then
//   solidcraft-cli run cad/leg/build/leg_detailed.json --save cad/leg/leg_detailed.sc
// Production files (plate DXFs, 3MF print files, STEP) are written only on request, into cad/leg/export/ (git-ignored):
//   node cad/scripts/gen_leg.js --export
//   solidcraft-cli run cad/leg/build/leg_export.json --in cad/leg/leg_detailed.sc
// Dimensions live in lib_leg.js.
const fs = require("fs");
const path = require("path");
const { buildLeg, plateDxf, rad, r3 } = require("./lib_leg");

const cmds = [];
const leg = buildLeg(cmds, {});

// torso bulkhead stub (shows how the abduction actuator mounts); outer edge at y = 39 like the real torso side
cmds.push({ command: "solid.box", params: { length: 3, width: 84, height: 106, center: [-48.5, -3, 3], operation: "new", name: "Bulkhead_Plate", body_name: "BulkheadStub" } });
cmds.push({ command: "solid.cylinder", params: { diameter: 43.2, height: 5, base: [-51, 0, 0], axis: "X", operation: "cut", targets: ["BulkheadStub"], name: "Bulkhead_Pilot" } });
for (let k = 0; k < 9; k++) {
  const a = rad(20 + 40 * k);
  cmds.push({ command: "solid.cylinder", params: { diameter: 3.4, height: 5, base: [-51, r3(36.5 * Math.sin(a)), r3(36.5 * Math.cos(a))], axis: "X", operation: "cut", targets: ["BulkheadStub"], name: "Bulkhead_M3_" + k } });
}

const comp = (name, bodies) => {
  cmds.push({ command: "component.create", params: { name, parent: "root", activate: false } });
  cmds.push({ command: "component.move_bodies", params: { bodies, component: name } });
};
const joint = (name, a, b, j) =>
  cmds.push({ command: "joint.as_built", params: { type: "revolute", a, b,
    at: { occurrence: a + ":1", point: j.point, z: j.z }, name, limits: [j.limits] } });
comp("Torso", ["BulkheadStub", ...leg.bodies.torso]);
comp("HipCarrier", leg.bodies.carrier);
comp("Thigh", leg.bodies.thigh);
comp("LowerLeg", leg.bodies.lower);
joint("HipAbduction", "Torso", "HipCarrier", leg.joints.abd);
joint("HipPitch", "HipCarrier", "Thigh", leg.joints.hip);
joint("Knee", "Thigh", "LowerLeg", leg.joints.knee);

const out = path.join(__dirname, "..", "leg", "build");
const exp = path.join(__dirname, "..", "leg", "export");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "leg_detailed.json"), JSON.stringify({ commands: cmds }, null, 1));
if (process.argv.includes("--export")) {
  fs.mkdirSync(exp, { recursive: true });
  fs.writeFileSync(path.join(exp, "thigh_inner_plate_3mm.dxf"), plateDxf(leg.dxf.ThighInnerPlate));
  fs.writeFileSync(path.join(exp, "thigh_outer_plate_3mm.dxf"), plateDxf(leg.dxf.ThighOuterPlate));
  const rel = (f) => "cad/leg/export/" + f;
  fs.writeFileSync(path.join(out, "leg_export.json"), JSON.stringify({ commands: [
    ...["Carrier", "HipPulley", "Shank", "FootPad"].map((b) => ({ command: "file.export_3mf", params: { path: rel(b.toLowerCase() + ".3mf"), bodies: [b], quality: "fine" } })),
    { command: "file.export_step", params: { path: rel("leg_detailed.step") } },
  ] }, null, 1));
}
console.log("commands:", cmds.length);
