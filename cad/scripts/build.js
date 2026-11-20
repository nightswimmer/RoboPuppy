// Builds the design files from the generators.
//   node cad/scripts/build.js parts [key...]   every part file (or the ones named) -> cad/parts/<key>.sc
//   node cad/scripts/build.js leg              single leg assembly                 -> cad/leg/leg.sc
//   node cad/scripts/build.js robot            whole robot assembly                -> cad/robot/robot.sc
//   node cad/scripts/build.js all              parts, then both assemblies
//   node cad/scripts/build.js symmetry         check that every part used on both sides equals its own mirror image
// Run from the repository root. Each build fails if a sketch is not fully constrained.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CLI = process.env.SOLIDCRAFT_CLI || "C:\\Program Files\\SolidCraft\\solidcraft-cli.exe";
const ROOT = path.join(__dirname, "..", "..");

function run(group, name, script, out, input) {
  const dir = path.join(ROOT, "cad", group, "build");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name + ".json"), res = path.join(dir, name + ".results.json");
  fs.writeFileSync(file, JSON.stringify(script, null, 1));
  try {
    execFileSync(CLI, ["run", file, ...(input ? ["--in", input] : ["--save", out]), "--results", "--json-out", res, "--quiet"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    console.log(`FAILED ${name}: ${String(e.stderr || e.message).trim().split("\n").slice(-6).join("\n")}`);
    return null;
  }
  const parsed = JSON.parse(fs.readFileSync(res, "utf8"));
  return Array.isArray(parsed) ? parsed : parsed.results || parsed;
}

function buildPart(part) {
  const p = part.make();
  const script = p.script();
  const results = run("parts", part.key, script, part.file);
  if (!results) return false;
  const loose = [];
  let k = 0;
  script.commands.forEach((c, i) => {
    if (c.command !== "sketch.solve") return;
    const r = results[i] && (results[i].result || results[i]);
    const name = p.sketches[k++];
    if (!r || r.dof !== 0 || r.status !== "solved") loose.push(`${name} (dof ${r ? r.dof : "?"}, ${r ? r.status : "no result"})`);
  });
  const last = results[results.length - 1];
  const m = last && (last.result || last);
  const bodies = (m && m.bodies) || [];
  const vol = bodies.map((b) => `${b.name} ${Math.round(b.volume_mm3)} mm3 [${b.bbox.min.map((v) => +v.toFixed(2))} .. ${b.bbox.max.map((v) => +v.toFixed(2))}]`).join("; ");
  const ok = loose.length === 0 && bodies.length === 1;
  console.log(`${ok ? "ok    " : "CHECK "} ${part.key}: ${p.sketches.length} sketches${loose.length ? ", NOT fully constrained: " + loose.join(", ") : ", all dof 0"}; ${bodies.length} body: ${vol}`);
  return ok;
}

// A part placed on both sides must be its own mirror image about its declared plane: mirror the body,
// intersect it with the original and compare volumes. Nothing is saved.
function checkSymmetry(part) {
  const { val } = require("./lib/dsl");
  const i = "xyz".indexOf(part.sym.axis), origin = [0, 0, 0], normal = [0, 0, 0];
  origin[i] = val(part.sym.about || 0); normal[i] = 1;
  const script = { commands: [
    { command: "inspect.measure", params: { summary: true } },
    { command: "solid.mirror", params: { bodies: [part.body], plane: { origin, normal }, name: "SymmetryCheck" } },
    { command: "solid.combine", params: { target: part.body, tools: [part.body + " (2)"], operation: "intersect" } },
    { command: "inspect.measure", params: { summary: true } },
  ] };
  const results = run("parts", part.key + ".symmetry", script, null, part.file);
  if (!results) return false;
  const v0 = results[0].total.volume_mm3, v1 = results[3].total.volume_mm3;
  const same = Math.abs(v1 - v0) <= 1e-5 * v0;
  console.log(`${same ? "ok    " : "CHECK "} ${part.key}: mirror plane ${part.sym.axis} = ${origin[i]}; volume ${v0.toFixed(1)} mm3, shared with its mirror image ${v1.toFixed(1)} mm3`);
  return same;
}

const [what = "all", ...names] = process.argv.slice(2);
let ok = true;
if (what === "parts" || what === "all") {
  const parts = require("./parts");
  for (const key of names.length ? names : Object.keys(parts)) {
    if (!parts[key]) { console.log("unknown part " + key); ok = false; continue; }
    ok = buildPart(parts[key]) && ok;
  }
}
if (what === "symmetry") {
  const parts = require("./parts");
  for (const part of Object.values(parts)) if (part.sym) ok = checkSymmetry(part) && ok;
}
if (what === "leg" || what === "robot" || what === "all") {
  const asm = require("./assemblies");
  for (const key of what === "all" ? ["leg", "robot"] : [what]) {
    const a = asm[key]();
    const results = run(key, key, { commands: a.cmds }, a.file);
    if (!results) { ok = false; continue; }
    console.log(`ok     ${key}: ${a.cmds.length} commands -> ${a.file}`);
  }
}
process.exit(ok ? 0 : 1);
