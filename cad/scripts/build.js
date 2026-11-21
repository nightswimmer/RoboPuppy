// Builds the design files from the generators.
//   node cad/scripts/build.js parts [key...]   every part file (or the ones named) -> cad/parts/<key>.sc
//   node cad/scripts/build.js leg              single leg assembly                 -> cad/leg/leg.sc
//   node cad/scripts/build.js robot            whole robot assembly                -> cad/robot/robot.sc
//   node cad/scripts/build.js leg_linkage      single leg, linkage knee variant    -> cad/leg/leg_linkage.sc
//   node cad/scripts/build.js robot_linkage    whole robot, linkage knee variant   -> cad/robot/robot_linkage.sc
//   node cad/scripts/build.js rig              motion test rig (simplified legs, flat) -> cad/robot/motion_rig.sc
//   node cad/scripts/build.js all              parts, then all assemblies and the rig
//   node cad/scripts/build.js symmetry [key...] check that every part used on both sides (or the ones named) equals its own mirror image
//   node cad/scripts/build.js ping [words...]  check the connection to the open app (lists commands matching the words)
// Add --app to run through the open SolidCraft desktop app (its control channel) instead of
// solidcraft-cli, for example when Windows will not start the CLI. Each script then runs in a new
// design tab, which is closed afterwards; the app's other tabs are left alone.
// Run from the repository root. Each build fails if a sketch is not fully constrained.
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const CLI = process.env.SOLIDCRAFT_CLI || "C:\\Program Files\\SolidCraft\\solidcraft-cli.exe";
const ROOT = path.join(__dirname, "..", "..");
const args = process.argv.slice(2);
const APP = args.includes("--app");
const [what = "all", ...names] = args.filter((a) => a !== "--app");
// Saved assemblies: key -> [folder under cad/, file]
const ASSEMBLIES = {
  leg: ["leg", "leg.sc"], robot: ["robot", "robot.sc"],
  leg_linkage: ["leg", "leg_linkage.sc"], robot_linkage: ["robot", "robot_linkage.sc"],
  rig: ["robot", "motion_rig.sc"],
};
let app = null;                     // control channel connection, opened on first use

// Runs a command script, saved to `out` (or applied to the design file `input` without saving).
// Returns one result per command, or null on failure.
async function run(group, name, script, out, input) {
  const dir = path.join(ROOT, "cad", group, "build");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name + ".json"), res = path.join(dir, name + ".results.json");
  fs.writeFileSync(file, JSON.stringify(script, null, 1));
  if (APP) return runInApp(name, script, out, input, res);
  try {
    execFileSync(CLI, ["run", file, ...(input ? ["--in", input] : ["--save", out]), "--results", "--json-out", res, "--quiet"], { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    console.log(`FAILED ${name}: ${String(e.stderr || e.message).trim().split("\n").slice(-6).join("\n")}`);
    return null;
  }
  const parsed = JSON.parse(fs.readFileSync(res, "utf8"));
  return Array.isArray(parsed) ? parsed : parsed.results || parsed;
}

// The app resolves file paths itself, so relative ones (linked part files, BOM output) are made absolute.
const absPaths = (commands) => commands.map((c) => {
  const p = c.params || {};
  return p.path && !path.isAbsolute(p.path) ? { command: c.command, params: Object.assign({}, p, { path: path.join(ROOT, p.path) }) } : c;
});

async function runInApp(name, script, out, input, res) {
  if (!app) app = await require("./lib/control").Control.open();
  let tab = null;
  try {
    if (input) {
      await app.execute("doc.open", { path: path.resolve(ROOT, input) });       // opens in a tab of its own
    } else {
      await app.call("ui.documents", { action: "new" });
    }
    tab = (await app.call("ui.documents", {})).active;
    const reply = await app.request("engine.script", { commands: absPaths(script.commands) });
    const results = reply.ok ? (Array.isArray(reply.result) ? reply.result : reply.result.results) : (reply.results || []);
    fs.writeFileSync(res, JSON.stringify(reply, null, 1));
    if (!reply.ok) { console.log(`FAILED ${name}: ${reply.error}`); return null; }
    if (out) await app.execute("file.save_as", { path: path.resolve(ROOT, out) });
    return results;
  } catch (e) {
    console.log(`FAILED ${name}: ${e.message}`);
    return null;
  } finally {
    if (tab !== null && tab !== undefined) await app.call("ui.documents", { action: "close", index: tab, force: true }).catch(() => {});
  }
}

async function buildPart(part) {
  const p = part.make();
  const script = p.script();
  const results = await run("parts", part.key, script, part.file);
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
async function checkSymmetry(part) {
  const { val } = require("./lib/dsl");
  const i = "xyz".indexOf(part.sym.axis), origin = [0, 0, 0], normal = [0, 0, 0];
  origin[i] = val(part.sym.about || 0); normal[i] = 1;
  const script = { commands: [
    { command: "inspect.measure", params: { summary: true } },
    { command: "solid.mirror", params: { bodies: [part.body], plane: { origin, normal }, name: "SymmetryCheck" } },
    { command: "solid.combine", params: { target: part.body, tools: [part.body + " (2)"], operation: "intersect" } },
    { command: "inspect.measure", params: { summary: true } },
  ] };
  const results = await run("parts", part.key + ".symmetry", script, null, part.file);
  if (!results) return false;
  const measured = (r) => (r.result || r).total.volume_mm3;
  const v0 = measured(results[0]), v1 = measured(results[3]);
  const same = Math.abs(v1 - v0) <= 1e-5 * v0;
  console.log(`${same ? "ok    " : "CHECK "} ${part.key}: mirror plane ${part.sym.axis} = ${origin[i]}; volume ${v0.toFixed(1)} mm3, shared with its mirror image ${v1.toFixed(1)} mm3`);
  return same;
}

// Check the connection to the open app; list the commands whose id contains one of the given words.
async function ping() {
  const c = await require("./lib/control").Control.open();
  console.log(`connected to port ${c.port}; capabilities:`, JSON.stringify(await c.call("control.capabilities")));
  const cmds = await c.call("engine.commands");
  const list = Array.isArray(cmds) ? cmds : cmds.commands || [];
  console.log(`${list.length} commands`);
  for (const k of list) if (names.some((n) => String(k.id).includes(n))) console.log(" ", k.id, "-", k.label, k.params ? "| " + JSON.stringify(k.params).slice(0, 1500) : "");
  c.close();
  return true;
}

// Camera views rendered by `check` (mm and radians; yaw about Z from +X, pitch up from the XY plane).
const VIEWS = {
  robot: {
    iso: { view: "iso" },
    bottom: { view: "bottom" },
    left: { view: "left" },
  },
  leg: { iso: { view: "iso" }, front: { view: "front" } },
};
VIEWS.robot_linkage = VIEWS.robot;
VIEWS.leg_linkage = VIEWS.leg;

// Clash check of the robot with the given joints driven, e.g. all abduction joints to -45 and 45 degrees:
//   node cad/scripts/build.js pose HipAbduction -45 45 --app
//   node cad/scripts/build.js pose robot_linkage Knee -45 -140 --app    (another saved robot)
async function pose(key, prefix, angles) {
  const joints = ["FL", "FR", "RL", "RR"].map((l) => `${prefix}_${l}`);
  if (!APP) {
    // CLI: one script on the saved file (not saved back): drive, check, next angle
    const commands = [];
    for (const a of angles) {
      for (const joint of joints) commands.push({ command: "joint.drive", params: { joint, value: Number(a), quiet: true } });
      commands.push({ command: "inspect.interference", params: { budget_s: 900 } });
    }
    const results = await run(ASSEMBLIES[key][0], `${key}_pose_${prefix}`, { commands }, null, path.join("cad", ...ASSEMBLIES[key]));
    if (!results) return false;
    const checks = commands.map((c, i) => [c, results[i]]).filter(([c]) => c.command === "inspect.interference");
    checks.forEach(([, r], k) => {
      const list = (r.result || r).interferences || [];
      console.log(`${prefix} ${angles[k]} deg: ${list.length} overlapping pairs`);
      for (const f of list) console.log(`  ${f.a}  x  ${f.b}: ${(+f.volume_mm3 || 0).toFixed(1)} mm3`);
    });
    return true;
  }
  app = app || (await require("./lib/control").Control.open());
  await app.execute("doc.open", { path: path.join(ROOT, "cad", ...ASSEMBLIES[key]) });
  const tab = (await app.call("ui.documents", {})).active;
  try {
    for (const a of angles) {
      const commands = joints.map((joint) => ({ command: "joint.drive", params: { joint, value: Number(a), quiet: true } }));
      commands.push({ command: "inspect.interference", params: { budget_s: 900 } });
      const batch = await app.call("engine.batch", { commands, rollback: false });
      const r = batch.results[batch.results.length - 1];
      const list = r.interferences || [];
      console.log(`${prefix} ${a} deg: ${list.length} overlapping pairs`);
      for (const f of list) console.log(`  ${f.a}  x  ${f.b}: ${(+f.volume_mm3 || 0).toFixed(1)} mm3`);
    }
    return true;
  } finally {
    await app.call("ui.documents", { action: "close", index: tab, force: true }).catch(() => {});
  }
}

// Clash check (and renders) of a saved assembly: node cad/scripts/build.js check robot|leg --app
const reportClashes = (key, r) => {
  const list = r.interferences || [];
  console.log(`${key}: ${r.checked ?? "?"} bodies checked, ${list.length} overlapping pairs, ${(r.unchecked || []).length} unchecked`);
  for (const f of list) {
    const where = (p) => (p && p.path ? p.path.join("/") : "");
    console.log(`  ${f.a} [${where(f.a_part)}]  x  ${f.b} [${where(f.b_part)}]: ${(+f.volume_mm3 || +f.volume || 0).toFixed(1)} mm3`);
  }
  for (const u of r.unchecked || []) console.log(`  unchecked ${u.a} x ${u.b}: ${u.reason}`);
};

async function check(key) {
  if (!ASSEMBLIES[key]) { console.log("unknown assembly " + key); return false; }
  const dir = path.join(ROOT, "cad", ASSEMBLIES[key][0], "build");
  fs.mkdirSync(dir, { recursive: true });
  if (!APP) {
    // CLI: clash check only (renders need the app)
    const script = { commands: [{ command: "inspect.interference", params: { budget_s: 900 } }] };
    const results = await run(ASSEMBLIES[key][0], `${key}_check`, script, null, path.join("cad", ...ASSEMBLIES[key]));
    if (!results) return false;
    const r = results[0].result || results[0];
    fs.writeFileSync(path.join(dir, `${key}_interference.json`), JSON.stringify(r, null, 1));
    reportClashes(key, r);
    return true;
  }
  app = app || (await require("./lib/control").Control.open());
  await app.execute("doc.open", { path: path.join(ROOT, "cad", ...ASSEMBLIES[key]) });
  const tab = (await app.call("ui.documents", {})).active;
  try {
    // engine.batch, not engine.execute: it may run for up to an hour instead of 60 s
    const batch = await app.call("engine.batch", { commands: [{ command: "inspect.interference", params: { budget_s: 900 } }], rollback: false });
    const r = batch.results[0];
    fs.writeFileSync(path.join(dir, `${key}_interference.json`), JSON.stringify(r, null, 1));
    reportClashes(key, r);
    for (const [name, v] of Object.entries(VIEWS[key] || {})) {
      await app.execute("view.apply", v);
      const file = path.join(dir, `${key}_render_${name}.png`);
      await app.call("ui.render", { path: file, width: 1400, height: 900 });
      console.log(`  render ${path.relative(ROOT, file)}`);
    }
    return true;
  } finally {
    await app.call("ui.documents", { action: "close", index: tab, force: true }).catch(() => {});
  }
}

async function main() {
  let ok = true;
  if (what === "ping") return ping();
  if (what === "pose") return ASSEMBLIES[names[0]] ? pose(names[0], names[1], names.slice(2)) : pose("robot", names[0], names.slice(1));
  if (what === "check") { for (const k of names.length ? names : ["robot"]) ok = (await check(k)) && ok; return ok; }
  if (what === "parts" || what === "all") {
    const parts = require("./parts");
    for (const key of names.length ? names : Object.keys(parts)) {
      if (!parts[key]) { console.log("unknown part " + key); ok = false; continue; }
      ok = (await buildPart(parts[key])) && ok;
    }
  }
  if (what === "symmetry") {
    const parts = require("./parts");
    for (const part of Object.values(parts)) if (part.sym && (!names.length || names.includes(part.key))) ok = (await checkSymmetry(part)) && ok;
  }
  if (ASSEMBLIES[what] || what === "all") {
    const asm = Object.assign({}, require("./assemblies"), require("./rig"));
    for (const key of what === "all" ? Object.keys(ASSEMBLIES) : [what]) {
      const a = asm[key]();
      const results = await run(ASSEMBLIES[key][0], key, { commands: a.cmds }, a.file);
      if (!results) { ok = false; continue; }
      console.log(`ok     ${key}: ${a.cmds.length} commands -> ${a.file}`);
    }
  }
  return ok;
}

main()
  .then((ok) => { if (app) app.close(); process.exit(ok ? 0 : 1); })
  .catch((e) => { console.log("FAILED: " + e.message); process.exit(1); });
