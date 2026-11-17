// Detailed leg builder, shared by gen_leg.js (single leg) and gen_robot.js (whole robot).
// Leg-local frame: X forward, Y outward, Z up. Origin = abduction axis (along X) x hip pitch axis (along Y).
// Neutral pose: leg straight down.

// ---- main dimensions (mm) ----
const D = {
  LT: 242.2,            // thigh: hip axis to knee axis (HTD 5M 635 belt, 24T:36T, taut at 242.3; idler takes up the rest)
  LS: 242,              // shank: knee axis to foot centre
  T_PLATE: 3,           // thigh plates (laser-cut aluminium)
  Y_H: 10,              // hip-pitch actuator rear body face. Chosen so the thigh plane clears the
                        // abduction actuator (radius 39.25) and the torso side when the thigh swings.
  CAV: 35,              // cavity between plates (standard M3 x 35 standoffs)
  BLADE_ZONE: 14.5,     // inner part of the cavity: shank blade swings here, beside the belt
  PULLEY_W: 19.5,       // belt zone width (15 mm belt + flanges)
  PLATE_W: 84,          // stadium width of the thigh plates
  OD_HIP: 37.05, OD_KNEE: 56.15,   // HTD 5M 24T / 36T outside diameters
  STANDOFFS: [[-37.5, -60], [-37.5, -150], [-37.5, -205], [37.5, -60], [37.5, -130]], // [x, z]
  KNEE_LIMITS: [-145, 0],
  WINDOW: { x: 4, z0: -65, z1: -170, w: 28 },          // lightening window in both plates
  IDLER: { z: -110, x0: -34, x1: -23, xNom: -31, slotW: 5.2, d: 16, w: 15 }, // belt tensioner on the rear span
};
D.Y_IN = D.Y_H + 32;                 // 42, inner plate inner face = hip-pitch actuator flange face
D.Y_CAV0 = D.Y_IN + D.T_PLATE;       // 45
D.Y_OUT = D.Y_CAV0 + D.CAV;          // 80, outer plate inner face
D.Y_K = D.Y_OUT + D.T_PLATE;         // 83, knee actuator front face
D.Y_BELT0 = D.Y_CAV0 + D.BLADE_ZONE; // 59.5, belt zone start
D.Y_MAX = D.Y_K + 36.5;              // 119.5, outermost point (knee actuator cover)

const rad = (deg) => (deg * Math.PI) / 180;
const r3 = (v) => Math.round(v * 1000) / 1000;

/**
 * Appends the commands for one leg to `cmds`.
 * opts: id (name suffix, "" for none), hx (world x of the hip pitch axis), abdY (world |y| of the abduction axis),
 *       sx (+1: abduction actuator behind the hip, -1: in front), sy (+1 left, -1 right),
 *       kx (+1: thigh internals as designed, knee folds the foot forward; -1 mirrored).
 * Returns { bodies: {torso, carrier, thigh, lower}, joints: {abd, hip, knee}, dxf }.
 */
function buildLeg(cmds, opts) {
  const { id = "", hx = 0, abdY = 0, sx = 1, sy = 1, kx = 1 } = opts;
  const N = (name) => (id ? name + "_" + id : name);
  const X = (lx) => r3(hx + sx * lx);    // torso-side parts (abduction actuator, carrier)
  const XT = (lx) => r3(hx + kx * lx);   // thigh-side parts
  const Y = (ly) => r3(sy * (abdY + ly));
  const AX = [sx, 0, 0], AY = [0, sy, 0];
  const dxf = {};

  const prim = (command, name, body, op, params) =>
    cmds.push({ command, params: Object.assign(params, { operation: op, name: N(name) },
      op === "new" ? { body_name: N(body) } : { targets: [N(body)] }) });
  // cylinder along local Y from local y0, length len, at local [x, z] (xf: X or XT)
  const cylY = (name, body, op, d, y0, len, x, z, xf = XT) =>
    prim("solid.cylinder", name, body, op, { diameter: d, height: len, base: [xf(x), Y(y0), r3(z)], axis: AY });
  // cylinder along local X from local x0 (lower local coordinate), at local [y, z]
  const cylX = (name, body, op, d, x0, len, y, z) =>
    prim("solid.cylinder", name, body, op, { diameter: d, height: len, base: [X(x0), Y(y), r3(z)], axis: AX });
  const box = (name, body, op, l, w, h, c, xf = XT) =>
    prim("solid.box", name, body, op, { length: l, width: w, height: h, center: [xf(c[0]), Y(c[1]), r3(c[2])] });
  const holeY = (name, body, d, x, z, y0, len, xf = XT) => {
    cylY(name, body, "cut", d, y0, len, x, z, xf);
    if (dxf[body]) dxf[body].circles.push([r3(x), r3(z), d]);
  };
  const onHip = (r, deg) => [r * Math.sin(rad(deg)), r * Math.cos(rad(deg))]; // angle from +Z toward +X

  // RobStride 01 stand-in. at = local coordinate of the housing front face along the axis, dir = output direction.
  const motor = (body, axis, at, dir) => {
    const c = axis === "X" ? (n, op, d, a, len) => cylX(n, body, op, d, a, len, 0, 0)
                           : (n, op, d, a, len) => cylY(n, body, op, d, a, len, 0, 0);
    const lo = Math.min;
    c(body + "_Body", "new", 78.5, lo(at, at - dir * 28), 28);
    c(body + "_Cover", "join", 63, lo(at - dir * 28, at - dir * 36.5), 8.5);
    c(body + "_Pilot", "join", 43, lo(at, at + dir * 3.5), 3.5);
    c(body + "_Flange", "join", 30, lo(at, at + dir * 4), 4);
  };

  // ---- actuators ----
  motor("MotorA", "X", -50, 1);            // abduction, flange face at local x = -46
  motor("MotorH", "Y", D.Y_H + 28, 1);     // hip pitch, flange face at y = Y_IN
  motor("MotorK", "Y", D.Y_K, -1);         // knee, flange face at y = Y_K - 4

  // ---- hip carrier (printed): cup around the hip-pitch actuator + block bolted to the abduction flange ----
  cylY("Carrier_Cup", "Carrier", "new", 88, D.Y_H - 8, 28, 0, 0, X);
  box("Carrier_Block", "Carrier", "join", 18, D.Y_H + 30 + 17, 68, [-37, (D.Y_H + 30 - 17) / 2, 0], X); // y -17 .. Y_H+30
  cylY("Carrier_Bore", "Carrier", "cut", 79.2, D.Y_H, 31, 0, 0, X);
  cylY("Carrier_RearOpening", "Carrier", "cut", 65, D.Y_H - 9, 9.5, 0, 0, X);
  box("Carrier_PlugSlot", "Carrier", "cut", 18, 9, 20, [0, D.Y_H - 4.5, 38], X);
  [20, -20, 100, -100, 140, -140].forEach((deg, i) => {       // actuator rear M3 pattern, plug toward +Z
    const [x, z] = onHip(36.5, deg);
    holeY("Carrier_RearM3_" + i, "Carrier", 3.4, x, z, D.Y_H - 9, 10, X);
  });
  [60, 180, 300].forEach((deg, i) => {                        // pockets for the proud rear screw heads
    const [x, z] = onHip(36.5, deg);
    holeY("Carrier_HeadPocket_" + i, "Carrier", 7, x, z, D.Y_H - 3.5, 3.6, X);
  });
  for (let k = 0; k < 6; k++) {                               // abduction flange: 6x M4 on dia 24
    const a = rad(60 * k), y = 12 * Math.cos(a), z = 12 * Math.sin(a);
    cylX("Carrier_FlangeM4_" + k, "Carrier", "cut", 4.3, -47, 21, y, z);
    cylX("Carrier_FlangeCbore_" + k, "Carrier", "cut", 8, -39.5, 13, y, z);   // 6.5 mm under the head
  }
  for (let k = 0; k < 3; k++) {                               // 3x dia 4 dowel pins
    const a = rad(30 + 120 * k);
    cylX("Carrier_FlangePin_" + k, "Carrier", "cut", 4, -47, 21, 12 * Math.cos(a), 12 * Math.sin(a));
  }

  // ---- thigh plates (laser-cut): stadium outline with a lightening window and the idler slot ----
  const plate = (body, y0) => {
    dxf[body] = { stadiums: [[0, 0, 0, -D.LT, D.PLATE_W],
      [D.WINDOW.x, D.WINDOW.z0, D.WINDOW.x, D.WINDOW.z1, D.WINDOW.w],
      [D.IDLER.x0, D.IDLER.z, D.IDLER.x1, D.IDLER.z, D.IDLER.slotW]], circles: [] };
    // XZ plane: sketch x = +X, sketch y = -Z, normal +Y. Right-hand legs extrude toward -Y.
    cmds.push({ command: "sketch.create", params: { plane: "XZ", offset: Y(y0), name: N(body + "_Sketch") } });
    for (const [x0, z0, x1, z1, w] of dxf[body].stadiums)
      cmds.push({ command: "sketch.slot.center_to_center", params: { p0: [XT(x0), -z0], p1: [XT(x1), -z1], width: w } });
    cmds.push({ command: "sketch.finish", params: {} });
    cmds.push({ command: "solid.extrude", params: { distance: D.T_PLATE, direction: sy > 0 ? "positive" : "negative",
      operation: "new", name: N(body + "_Extrude"), body_name: N(body) } });
    holeY(body + "_KneeAxle", body, 8, 0, -D.LT, y0 - 1, D.T_PLATE + 2);
    D.STANDOFFS.forEach(([x, z], i) => holeY(body + "_Standoff_" + i, body, 3.2, x, z, y0 - 1, D.T_PLATE + 2));
  };
  plate("ThighInnerPlate", D.Y_IN);
  for (let k = 0; k < 6; k++) {                               // bolts to the hip-pitch flange
    const [x, z] = onHip(12, 60 * k);
    holeY("ThighInnerPlate_FlangeM4_" + k, "ThighInnerPlate", 4.3, x, z, D.Y_IN - 1, D.T_PLATE + 2);
  }
  for (let k = 0; k < 3; k++) {
    const [x, z] = onHip(12, 30 + 120 * k);
    holeY("ThighInnerPlate_FlangePin_" + k, "ThighInnerPlate", 4, x, z, D.Y_IN - 1, D.T_PLATE + 2);
  }
  plate("ThighOuterPlate", D.Y_OUT);
  holeY("ThighOuterPlate_Pilot", "ThighOuterPlate", 43.2, 0, 0, D.Y_OUT - 1, D.T_PLATE + 2);
  for (let k = 0; k < 9; k++) {                               // bolts into the knee actuator front face
    const [x, z] = onHip(36.5, 20 + 40 * k);
    holeY("ThighOuterPlate_M3_" + k, "ThighOuterPlate", 3.4, x, z, D.Y_OUT - 1, D.T_PLATE + 2);
  }
  D.STANDOFFS.forEach(([x, z], i) => cylY("Standoff_" + i, "Standoff_" + i, "new", 6, D.Y_CAV0, D.CAV, x, z));

  // ---- belt tensioner: three 625 bearings (5x16x5) on an M5 bolt that slides in slots in both plates ----
  cylY("Idler_Roller", "Idler", "new", D.IDLER.d, D.Y_BELT0 + (D.PULLEY_W - D.IDLER.w) / 2, D.IDLER.w, D.IDLER.xNom, D.IDLER.z);
  // Inner end flush with the inner plate (countersunk screw): only ~1.5 mm separates the thigh from the torso.
  cylY("Idler_Bolt", "IdlerBolt", "new", 5, D.Y_IN, D.T_PLATE * 2 + D.CAV + 4, D.IDLER.xNom, D.IDLER.z);

  // ---- hip pulley (24T, bolted to the knee actuator flange) ----
  cylY("HipPulley_Teeth", "HipPulley", "new", D.OD_HIP, D.Y_BELT0, D.PULLEY_W, 0, 0);
  cylY("HipPulley_FlangeIn", "HipPulley", "join", 42, D.Y_BELT0, 1.5, 0, 0);
  cylY("HipPulley_FlangeOut", "HipPulley", "join", 42, D.Y_BELT0 + D.PULLEY_W - 1.5, 1.5, 0, 0);
  for (let k = 0; k < 6; k++) {
    const [x, z] = onHip(12, 60 * k);
    holeY("HipPulley_M4_" + k, "HipPulley", 4.3, x, z, D.Y_BELT0 - 1, D.PULLEY_W + 2);
  }

  // ---- shank (printed, one piece): knee pulley + hub + blade + foot core ----
  const zk = -D.LT, zf = -D.LT - D.LS;
  cylY("Shank_KneePulley", "Shank", "new", D.OD_KNEE, D.Y_BELT0, D.PULLEY_W, 0, zk);
  cylY("Shank_PulleyFlangeIn", "Shank", "join", 61, D.Y_BELT0, 1.5, 0, zk);
  cylY("Shank_PulleyFlangeOut", "Shank", "join", 61, D.Y_BELT0 + D.PULLEY_W - 1.5, 1.5, 0, zk);
  cylY("Shank_Hub", "Shank", "join", 44, D.Y_CAV0 + 0.5, D.BLADE_ZONE - 0.5, 0, zk);
  box("Shank_Blade", "Shank", "join", 30, 13, D.LS, [0, D.Y_CAV0 + 0.5 + 6.5, zk - D.LS / 2]);
  cylY("Shank_FootCore", "Shank", "join", 44, D.Y_CAV0 - 5, 24, 0, zf);
  cylY("Shank_AxleBore", "Shank", "cut", 10, D.Y_CAV0 - 1, D.CAV + 2, 0, zk);
  cylY("Shank_BearingSeatIn", "Shank", "cut", 16, D.Y_CAV0, 5.6, 0, zk);            // 688 bearing, 8x16x5
  cylY("Shank_BearingSeatOut", "Shank", "cut", 16, D.Y_OUT - 5.6, 5.6, 0, zk);
  cylY("FootPad_Outer", "FootPad", "new", 56, D.Y_CAV0 - 5, 24, 0, zf);             // TPU tyre
  cylY("FootPad_Bore", "FootPad", "cut", 44, D.Y_CAV0 - 6, 26, 0, zf);
  // Knee axle: dia 8 shaft with tapped ends, held by countersunk screws so both plate faces stay flush.
  cylY("KneeAxle_Shaft", "KneeAxle", "new", 8, D.Y_IN, D.T_PLATE * 2 + D.CAV, 0, zk);

  return {
    dxf,
    bodies: {
      torso: [N("MotorA")],
      carrier: [N("Carrier"), N("MotorH")],
      thigh: ["ThighInnerPlate", "ThighOuterPlate", "MotorK", "HipPulley", "KneeAxle", "Idler", "IdlerBolt",
        ...D.STANDOFFS.map((_, i) => "Standoff_" + i)].map(N),
      lower: [N("Shank"), N("FootPad")],
    },
    joints: {
      abd: { point: [X(-46), Y(0), 0], z: [1, 0, 0], limits: [-45, 45] },
      hip: { point: [r3(hx), Y(D.Y_IN), 0], z: [0, 1, 0], limits: [-120, 120] },
      knee: { point: [r3(hx), Y(D.Y_CAV0 + 7), -D.LT], z: [0, 1, 0], limits: D.KNEE_LIMITS },
    },
  };
}

// DXF cut file for a plate (R12, mm; drawing X = leg X, drawing Y = leg Z)
function plateDxf(g) {
  const e = [];
  const line = (x0, y0, x1, y1) => e.push("0", "LINE", "8", "0", "10", x0, "20", y0, "11", x1, "21", y1);
  const arc = (cx, cy, r, a0, a1) => e.push("0", "ARC", "8", "0", "10", cx, "20", cy, "40", r, "50", a0, "51", a1);
  for (const [x0, z0, x1, z1, w] of g.stadiums) {
    const r = w / 2;
    if (x0 === x1) {
      const [zt, zb] = [Math.max(z0, z1), Math.min(z0, z1)];
      line(x0 - r, zt, x0 - r, zb); line(x0 + r, zt, x0 + r, zb);
      arc(x0, zt, r, 0, 180); arc(x0, zb, r, 180, 360);
    } else {
      const [xl, xr] = [Math.min(x0, x1), Math.max(x0, x1)];
      line(xl, z0 - r, xr, z0 - r); line(xl, z0 + r, xr, z0 + r);
      arc(xl, z0, r, 90, 270); arc(xr, z0, r, 270, 90);
    }
  }
  for (const [x, z, d] of g.circles) e.push("0", "CIRCLE", "8", "0", "10", x, "20", z, "40", d / 2);
  return ["0", "SECTION", "2", "ENTITIES", ...e, "0", "ENDSEC", "0", "EOF"].join("\n") + "\n";
}

module.exports = { D, buildLeg, plateDxf, rad, r3 };
