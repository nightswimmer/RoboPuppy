// Every unique part of the robot, one design file each (cad/parts/<key>.sc).
// `sym` is a mirror plane of the part in its own frame. It is what lets one part serve the left and
// the right side: a mirrored placement is the plain placement combined with that reflection, which
// is a rigid move, so the part itself is never mirrored.
const { Part } = require("./lib/dsl");
const { neg } = require("./lib/dsl");

const defs = [];
const def = (key, info, build) => defs.push({ key, info, build });
const S = Math.SQRT1_2;

// ============================ purchased ============================

// Frame: axis Z, origin on the housing front face, output toward +Z, plug toward +X.
def("robstride01", { body: "RobStride01", part_number: "RS01", bom_type: "purchased", sym: { axis: "y" },
  description: "RobStride 01 actuator (envelope with mounting patterns)" }, (p) => {
  p.sketch("Body_Sketch", "XY", "-rs_body_l", (s) => s.circle(0, 0, "rs_body_d"));
  p.extrude("Body", "rs_body_l", { op: "new" });
  p.sketch("Cover_Sketch", "XY", "-rs_body_l - rs_cover_l", (s) => s.circle(0, 0, "rs_cover_d"));
  p.extrude("Cover", "rs_cover_l");
  p.sketch("Pilot_Sketch", "XY", 0, (s) => s.circle(0, 0, "rs_pilot_d"));
  p.extrude("Pilot", "rs_pilot_h");
  p.sketch("Flange_Sketch", "XY", 0, (s) => s.circle(0, 0, "rs_flange_d"));
  p.extrude("Flange", "rs_flange_h");
  p.sketch("Plug_Sketch", "XY", "-rs_body_l - rs_cover_l", (s) => {
    const r = s.rectX("rs_plug_r0", "rs_plug_r1", "rs_plug_r1 - rs_plug_r0", "rs_plug_w");
    s.dist(r.left, "rs_plug_r0");
  });
  p.extrude("Plug", "rs_cover_l");
  // 9x M3 on the front face, 20 deg either side of the plug direction and every 40 deg
  p.sketch("FrontM3_Sketch", "XY", 0, (s) => s.pattern([s.pointOn(s.polar("origin", "rs_m3_bcd/2", 20).end)], "origin", 9));
  p.hole("FrontM3", "FrontM3_Sketch", { thread: "M3", depth: 8 });
  // 6x M3 on the rear annulus: a pair 20 deg either side of the plug, three times
  p.sketch("RearM3_Sketch", "XY", "-rs_body_l", (s) => {
    const a = s.pointOn(s.polar("origin", "rs_m3_bcd/2", 20).end);
    const b = s.pointOn(s.polar("origin", "rs_m3_bcd/2", 100).end);
    s.pattern([a, b], "origin", 3);
  });
  p.hole("RearM3", "RearM3_Sketch", { thread: "M3", depth: 8 });
  // three screw heads standing proud of the rear annulus, between the pairs
  p.sketch("RearHeads_Sketch", "XY", "-rs_body_l", (s) =>
    s.pattern([s.circleOn(s.polar("origin", "rs_m3_bcd/2", 60).end, "rs_head_d")], "origin", 3));
  p.extrude("RearHeads", "rs_head_h", { dir: "negative" });
  // output flange: 6x M4 and 3x dia 4 pins on one circle (a pin in line with the plug)
  p.sketch("FlangeM4_Sketch", "XY", "rs_flange_h", (s) => s.pattern([s.pointOn(s.polar("origin", "rs_flange_bcd/2", 30).end)], "origin", 6));
  p.hole("FlangeM4", "FlangeM4_Sketch", { thread: "M4", depth: 9 });
  p.sketch("FlangePin_Sketch", "XY", "rs_flange_h", (s) => s.pattern([s.point("rs_flange_bcd/2", 0)], "origin", 3));
  p.hole("FlangePins", "FlangePin_Sketch", { diameter: 4, depth: 5 });
});

// Frame: shaft axis Z, origin where the shaft leaves the top face; the body extends toward -X.
// Two purchased items share this envelope: the standard servo and a stronger one of the same size for the neck tilt.
const servo = (p) => {
  p.sketch("Body_Sketch", "XY", "-sv_h", (s) => {
    const r = s.rectX(neg("sv_l - sv_off"), "sv_off", "sv_l", "sv_w");
    s.dist(r.right, "sv_off");
  });
  p.extrude("Body", "sv_h", { op: "new" });
};
def("servo_sts", { body: "Servo", part_number: "STS3215", bom_type: "purchased", sym: { axis: "y" },
  description: "Serial bus servo, Feetech STS size (envelope, dimensions to verify)" }, servo);
def("servo_sts_ht", { body: "ServoHighTorque", part_number: "STS-HT", bom_type: "purchased", sym: { axis: "y" },
  description: "Serial bus servo, same size, higher torque (neck tilt; model to choose)" }, servo);

def("servo_horn", { body: "Horn", part_number: "STS-HORN", bom_type: "purchased", sym: { axis: "y" },
  description: "Servo horn disc" }, (p) => {
  p.sketch("Horn_Sketch", "XY", 0, (s) => s.circle(0, 0, "horn_d"));
  p.extrude("Horn", "horn_t", { op: "new" });
});

def("standoff_m3x35", { body: "Standoff", part_number: "SO-M3X35", bom_type: "purchased", sym: { axis: "z", about: "cav/2" },
  description: "Standoff M3 x 35, female-female" }, (p) => {
  p.sketch("Standoff_Sketch", "XY", 0, (s) => s.circle(0, 0, "standoff_d"));
  p.extrude("Standoff", "cav", { op: "new" });
  p.sketch("Thread_Sketch", "XY", "cav", (s) => s.point(0, 0));
  p.hole("Thread", "Thread_Sketch", { thread: "M3" });
});

def("bearing_625", { body: "Bearing", part_number: "BRG-625", bom_type: "purchased", sym: { axis: "z", about: 2.5 },
  description: "Ball bearing 625, 5 x 16 x 5 (belt idler, three side by side)" }, (p) => {
  p.sketch("Bearing_Sketch", "XY", 0, (s) => { s.circle(0, 0, 16); s.circle(0, 0, 5); });
  p.extrude("Bearing", 5, { op: "new" });
});

def("idler_bolt_m5", { body: "IdlerBolt", part_number: "SCR-M5X45", bom_type: "purchased", sym: { axis: "z", about: "(2*t_plate + cav + 4)/2" },
  description: "Idler bolt M5 x 45 (shank only)" }, (p) => {
  p.sketch("Bolt_Sketch", "XY", 0, (s) => s.circle(0, 0, 5));
  p.extrude("Bolt", "2*t_plate + cav + 4", { op: "new" });
});

// ============================ leg, fabricated ============================

// Frame: the leg frame. Origin where the abduction axis (X) meets the hip pitch axis (Y); Y outward, Z up.
// Symmetric top to bottom, so the same part serves all four hips.
def("hip_carrier", { body: "HipCarrier", part_number: "RP-101", sym: { axis: "z" },
  description: "Hip carrier, printed" }, (p) => {
  p.sketch("Cup_Sketch", "XZ", "y_h - cup_rear", (s) => s.circle(0, 0, "cup_od"));
  p.extrude("Cup", "cup_len", { op: "new" });
  p.sketch("Block_Sketch", "XZ", "-block_back", (s) => {
    const r = s.rectX(neg("flange_x"), neg("flange_x - block_t"), "block_t", "block_h");
    s.dist(r.right, "flange_x - block_t");
  });
  p.extrude("Block", "block_back + block_front");
  p.sketch("Bore_Sketch", "XZ", "y_h", (s) => s.circle(0, 0, "bore_d"));
  p.extrude("Bore", 0, { op: "cut", through: true });
  p.sketch("Opening_Sketch", "XZ", "y_h - cup_rear - cover_relief", (s) => s.circle(0, 0, "opening_d"));
  p.extrude("RearOpening", "cup_rear + cover_relief", { op: "cut" });
  // plug slot through the rear wall, top and bottom, so the actuator plug points up whichever way up the carrier is
  p.sketch("PlugSlot_Sketch", "XZ", "y_h - cup_rear", (s) => s.rectC("plug_slot_w", "plug_slot_h"));
  p.extrude("PlugSlot", "cup_rear", { op: "cut" });
  // actuator rear M3 pattern, repeated every 60 deg (the actuator uses every other pair)
  p.sketch("RearM3_Sketch", "XZ", "y_h - cup_rear", (s) => {
    const a = s.pointOn(s.polar("origin", "rs_m3_bcd/2", 10).end);
    const b = s.pointOn(s.polar("origin", "rs_m3_bcd/2", 50).end);
    s.pattern([a, b], "origin", 6);
  });
  p.hole("RearM3", "RearM3_Sketch", { clearance: "M3", depth: "cup_rear" });
  // pockets for the actuator's proud rear screw heads
  p.sketch("HeadPocket_Sketch", "XZ", "y_h", (s) =>
    s.pattern([s.circleOn(s.polar("origin", "rs_m3_bcd/2", 30).end, "head_pocket_d")], "origin", 6));
  p.extrude("HeadPockets", "head_pocket_depth", { op: "cut", dir: "negative" });
  // abduction flange: 6x M4 with counterbores from the inside, dowel pin holes between them
  p.sketch("FlangeM4_Sketch", "YZ", "-flange_x", (s) => s.pattern([s.point("rs_flange_bcd/2", 0)], "origin", 6));
  p.hole("FlangeM4", "FlangeM4_Sketch", { clearance: "M4", fit: "close", depth: "block_t" });
  p.sketch("FlangePin_Sketch", "YZ", "-flange_x", (s) => s.pattern([s.pointOn(s.polar("origin", "rs_flange_bcd/2", 30).end)], "origin", 6));
  p.hole("FlangePins", "FlangePin_Sketch", { diameter: 4, depth: "block_t" });
  p.sketch("Counterbore_Sketch", "YZ", "-flange_x + cb_floor", (s) => s.pattern([s.circle("rs_flange_bcd/2", 0, "cb_d")], "origin", 6));
  p.extrude("FlangeCounterbores", "block_t - cb_floor", { op: "cut" });
});

// Frame: plate in the XY plane, X forward, Y up, origin on the hip axis, knee at (0, -lt). Thickness along +Z.
// Flat with through features only, so it can be turned over: the same plate serves both sides.
const thighPlate = (p) => {
  p.sketch("Outline_Sketch", "XY", 0, (s) => {
    s.slot([0, 0], [0, neg("lt")], "lt", "plate_w");
    s.slot(["win_x", neg("win_z0")], ["win_x", neg("win_z0 + win_len")], "win_len", "win_w");
    s.slot([neg("idl_x0"), neg("idl_z")], [neg("idl_x0 - idl_len"), neg("idl_z")], "idl_len", "idl_w");
  });
  p.extrude("Plate", "t_plate", { op: "new" });
  p.sketch("KneeAxle_Sketch", "XY", 0, (s) => s.point(0, neg("lt")));
  p.hole("KneeAxleHole", "KneeAxle_Sketch", { diameter: "axle_d" });
  p.sketch("Standoff_Sketch", "XY", 0, (s) => {
    s.point(neg("standoff_x"), neg("so_z1"));
    s.point(neg("standoff_x"), neg("so_z2"));
    s.point(neg("standoff_x"), neg("so_z3"));
    s.point("standoff_x", neg("so_z1"));
    s.point("standoff_x", neg("so_z4"));
  });
  p.hole("StandoffHoles", "Standoff_Sketch", { clearance: "M3", fit: "close" });
};

def("thigh_inner_plate", { body: "ThighInnerPlate", part_number: "RP-102", sym: { axis: "z", about: "t_plate/2" },
  description: "Thigh inner plate, 3 mm aluminium, laser-cut" }, (p) => {
  thighPlate(p);
  p.sketch("FlangeM4_Sketch", "XY", 0, (s) => s.pattern([s.point("rs_flange_bcd/2", 0)], "origin", 6));
  p.hole("FlangeM4", "FlangeM4_Sketch", { clearance: "M4", fit: "close" });
  p.sketch("FlangePin_Sketch", "XY", 0, (s) => s.pattern([s.point(0, "rs_flange_bcd/2")], "origin", 3));
  p.hole("FlangePins", "FlangePin_Sketch", { diameter: 4 });
});

def("thigh_outer_plate", { body: "ThighOuterPlate", part_number: "RP-103", sym: { axis: "z", about: "t_plate/2" },
  description: "Thigh outer plate, 3 mm aluminium, laser-cut" }, (p) => {
  thighPlate(p);
  p.sketch("Pilot_Sketch", "XY", 0, (s) => s.circle(0, 0, "pilot_clear_d"));
  p.extrude("PilotHole", 0, { op: "cut", through: true });
  p.sketch("MotorM3_Sketch", "XY", 0, (s) => s.pattern([s.pointOn(s.polar("origin", "rs_m3_bcd/2", 70).end)], "origin", 9));
  p.hole("MotorM3", "MotorM3_Sketch", { clearance: "M3" });
});

// Frame: axis Z, from z = 0 to pulley_w. Tooth profile still to be modelled.
def("hip_pulley", { body: "HipPulley", part_number: "RP-104", sym: { axis: "z", about: "pulley_w/2" },
  description: "Hip pulley HTD 5M 24T, printed (teeth not yet modelled)" }, (p) => {
  p.sketch("Teeth_Sketch", "XY", 0, (s) => s.circle(0, 0, "od_hip"));
  p.extrude("Teeth", "pulley_w", { op: "new" });
  p.sketch("FlangeA_Sketch", "XY", 0, (s) => s.circle(0, 0, "hip_flange_d"));
  p.extrude("FlangeA", "pulley_flange_t");
  p.sketch("FlangeB_Sketch", "XY", "pulley_w - pulley_flange_t", (s) => s.circle(0, 0, "hip_flange_d"));
  p.extrude("FlangeB", "pulley_flange_t");
  p.sketch("M4_Sketch", "XY", "pulley_w", (s) => s.pattern([s.point("rs_flange_bcd/2", 0)], "origin", 6));
  p.hole("M4", "M4_Sketch", { clearance: "M4", fit: "close" });
});

// Frame: origin on the knee axis at the cavity's inner face; X forward, Y down the shank, Z outward.
// Symmetric front to back, so the same part serves both sides (turned half a turn about the vertical).
def("shank", { body: "Shank", part_number: "RP-105", sym: { axis: "x" },
  description: "Shank with knee pulley HTD 5M 36T, printed (teeth not yet modelled)" }, (p) => {
  p.sketch("Hub_Sketch", "XY", "hub_gap", (s) => s.circle(0, 0, "hub_d"));
  p.extrude("Hub", "blade_zone - hub_gap", { op: "new" });
  p.sketch("Pulley_Sketch", "XY", "blade_zone", (s) => s.circle(0, 0, "od_knee"));
  p.extrude("KneePulley", "pulley_w");
  p.sketch("FlangeIn_Sketch", "XY", "blade_zone", (s) => s.circle(0, 0, "knee_flange_d"));
  p.extrude("PulleyFlangeIn", "pulley_flange_t");
  p.sketch("FlangeOut_Sketch", "XY", "blade_zone + pulley_w - pulley_flange_t", (s) => s.circle(0, 0, "knee_flange_d"));
  p.extrude("PulleyFlangeOut", "pulley_flange_t");
  p.sketch("Blade_Sketch", "XY", "hub_gap", (s) => {
    const r = s.rect(neg("blade_w/2"), 0, "blade_w/2", "ls", "blade_w", "ls");
    s.dist(r.right, "blade_w/2");
    s.on(r.bottom);
  });
  p.extrude("Blade", "blade_t");
  p.sketch("FootCore_Sketch", "XY", "-foot_in", (s) => s.circle(0, "ls", "foot_core_d"));
  p.extrude("FootCore", "foot_core_w");
  // knee axle bore with the outer bearing seat, then the inner bearing seat (688 bearings, 8 x 16 x 5)
  p.sketch("Axle_Sketch", "XY", "blade_zone + pulley_w", (s) => s.point(0, 0));
  p.hole("AxleBore", "Axle_Sketch", { diameter: "axle_bore_d", type: "counterbore", cb_diameter: "seat_d", cb_depth: "seat_out" });
  p.sketch("SeatIn_Sketch", "XY", "hub_gap", (s) => s.point(0, 0));
  p.hole("BearingSeatIn", "SeatIn_Sketch", { diameter: "seat_d", depth: "seat_in" });
});

def("foot_pad", { body: "FootPad", part_number: "RP-106", sym: { axis: "z", about: "foot_core_w/2" },
  description: "Foot pad, printed TPU" }, (p) => {
  p.sketch("Pad_Sketch", "XY", 0, (s) => { s.circle(0, 0, "foot_pad_od"); s.circle(0, 0, "foot_core_d"); });
  p.extrude("Pad", "foot_core_w", { op: "new" });
});

def("knee_axle", { body: "KneeAxle", part_number: "RP-107", sym: { axis: "z", about: "(2*t_plate + cav)/2" },
  description: "Knee axle, dia 8 steel, ends tapped" }, (p) => {
  p.sketch("Axle_Sketch", "XY", 0, (s) => s.circle(0, 0, "axle_d"));
  p.extrude("Axle", "2*t_plate + cav", { op: "new" });
});

// ============================ torso, fabricated ============================

// Frame for the frame plates: X to the robot's left, Y up, origin on the centreline at the height of the
// abduction axes; thickness along +Z (the robot's forward direction).
const torsoSection = (s, lobe, halfW, top) => {
  s.slot([neg("abd_y"), 0], ["abd_y", 0], "2*abd_y", `2*(${lobe})`);
  const r = s.rect(neg(halfW), 0, halfW, top, `2*(${halfW})`, top);
  s.dist(r.right, halfW);
  s.on(r.bottom);
};

// Flat and symmetric left to right: one part for the front and the rear.
def("bulkhead", { body: "Bulkhead", part_number: "RP-201", sym: { axis: "z", about: "t_frame/2" },
  description: "Bulkhead, 3 mm aluminium, laser-cut" }, (p) => {
  p.sketch("Outline_Sketch", "XY", 0, (s) => torsoSection(s, "lobe_r", "torso_half_w", "torso_top"));
  p.extrude("Plate", "t_frame", { op: "new" });
  // left actuator: pilot bore and the 9x M3 of its front face; the right side is mirrored
  p.sketch("Pilot_Sketch", "XY", 0, (s) => s.circle("abd_y", 0, "pilot_clear_d"));
  p.extrude("PilotLeft", 0, { op: "cut", through: true });
  p.sketch("M3_Sketch", "XY", 0, (s) => {
    const e = s.polar(["abd_y", 0], "rs_m3_bcd/2", 70);
    s.pattern([s.pointOn(e.end)], e.start, 9);
  });
  p.hole("M3Left", "M3_Sketch", { clearance: "M3" });
  p.mirrorFeature("RightSide", ["PilotLeft", "M3Left"], "YZ");
});

def("mid_frame", { body: "MidFrame", part_number: "RP-202", sym: { axis: "z", about: "t_frame/2" },
  description: "Mid frame, 3 mm aluminium, laser-cut" }, (p) => {
  p.sketch("Outline_Sketch", "XY", 0, (s) => torsoSection(s, "lobe_r", "torso_half_w", "torso_top"));
  p.extrude("Plate", "t_frame", { op: "new" });
  p.sketch("Cover_Sketch", "XY", 0, (s) => s.circle("abd_y", 0, "opening_d"));
  p.extrude("CoverLeft", 0, { op: "cut", through: true });
  p.sketch("PlugSlot_Sketch", "XY", 0, (s) => {
    const r = s.rect("abd_y - mid_slot/2", "mid_slot_z0", "abd_y + mid_slot/2", "mid_slot_z0 + mid_slot", "mid_slot", "mid_slot");
    s.dist(r.left, "abd_y - mid_slot/2");
    s.dist(r.bottom, "mid_slot_z0");
  });
  p.extrude("PlugSlotLeft", 0, { op: "cut", through: true });
  // actuator rear face: 6x M3 and clearance for its three proud screw heads
  p.sketch("M3_Sketch", "XY", 0, (s) => {
    const e = s.polar(["abd_y", 0], "rs_m3_bcd/2", 70);
    const a = s.pointOn(e.end);
    const b = s.pointOn(s.polar(e.start, "rs_m3_bcd/2", 110).end);
    s.pattern([a, b], e.start, 3);
  });
  p.hole("M3Left", "M3_Sketch", { clearance: "M3" });
  p.sketch("Heads_Sketch", "XY", 0, (s) => {
    const e = s.polar(["abd_y", 0], "rs_m3_bcd/2", 30);
    s.pattern([s.circleOn(e.end, "mid_head_d")], e.start, 3);
  });
  p.extrude("HeadsLeft", 0, { op: "cut", through: true });
  p.mirrorFeature("RightSide", ["CoverLeft", "PlugSlotLeft", "M3Left", "HeadsLeft"], "YZ");
});

// Frame: the robot frame (X forward, Y left, Z up, origin at the torso centre on the abduction axes' height).
def("belly_pan", { body: "BellyPan", part_number: "RP-203", description: "Belly pan, printed" }, (p) => {
  p.sketch("Outer_Sketch", "YZ", "-x_mid", (s) => torsoSection(s, "pan_lobe_r", "torso_half_w", "torso_top"));
  p.extrude("Outer", "2*x_mid", { op: "new" });
  p.sketch("Inner_Sketch", "YZ", "-x_mid", (s) => torsoSection(s, "pan_lobe_r - t_pan", "torso_half_w - t_pan", "torso_top + 2"));
  p.extrude("Inner", 0, { op: "cut", through: true });
});

// Frame: robot X and Y, underside at z = 0.
def("deck", { body: "Deck", part_number: "RP-204", description: "Deck with spine, 2 mm aluminium, laser-cut" }, (p) => {
  p.sketch("Outline_Sketch", "XY", 0, (s) => {
    s.rectC("2*(x_bulk + t_frame)", "2*torso_half_w");
    s.rectC("deck_spine_l", "deck_spine_w");
  });
  p.extrude("Plate", "t_deck", { op: "new" });
  p.sketch("WagShaft_Sketch", "XY", "t_deck", (s) => s.point(neg("tail_wag_x"), 0));
  p.hole("WagShaftHole", "WagShaft_Sketch", { diameter: "wag_hole_d" });
});

def("battery_keepout", { body: "BatteryKeepout", part_number: "REF-BATTERY", bom_type: "reference",
  description: "Battery keep-out volume" }, (p) => {
  p.sketch("Keepout_Sketch", "XY", "bat_z0", (s) => s.rectC("bat_l", "bat_w"));
  p.extrude("Keepout", "bat_h", { op: "new" });
});

// ============================ neck, head, tail ============================

// Frame: origin on the deck under the neck tilt axis.
def("neck_base", { body: "NeckBase", part_number: "RP-301", description: "Neck servo base plate, printed" }, (p) => {
  p.sketch("Base_Sketch", "XY", 0, (s) => {
    const r = s.rectX(neg("base_back"), "base_front", "base_back + base_front", "2*yoke_in");
    s.dist(r.right, "base_front");
  });
  p.extrude("Base", "base_t", { op: "new" });
});

// Frame: origin at the middle of the tilt axis (Y); axes parallel to the robot's with the neck upright.
const SIDE = { origin: [0, 0, 0], x_dir: [1, 0, 0], y_dir: [0, 0, 1] };      // side view: x forward, y up, normal -Y
const ALONG = { origin: [0, 0, 0], x_dir: [0, 1, 0], y_dir: [-S, 0, S] };    // normal along the neck, 45 deg up and forward
def("neck", { body: "Neck", part_number: "RP-302", description: "Neck: yoke, tube and pan servo cradle, printed" }, (p) => {
  p.sketch("Bridge_Sketch", SIDE, "yoke_in + cheek_t", (s) => s.circleOn(s.polar("origin", "br", 45).end, "arm_d"));
  p.extrude("Bridge", "2*(yoke_in + cheek_t)", { op: "new", dir: "negative" });
  p.sketch("Arms_Sketch", ALONG, 0, (s) => s.mirror([s.circle("yoke_in + cheek_t/2", 0, "arm_d")], "y"));
  p.extrude("Arms", "br");
  p.sketch("CheekL_Sketch", "XZ", "yoke_in", (s) => s.circle(0, 0, "cheek_d"));
  p.extrude("CheekL", "cheek_t");
  p.sketch("CheekR_Sketch", "XZ", "-yoke_in", (s) => s.circle(0, 0, "cheek_d"));
  p.extrude("CheekR", "cheek_t", { dir: "negative" });
  p.sketch("Tube_Sketch", ALONG, "br", (s) => s.circle(0, 0, "tube_d"));
  p.extrude("Tube", "tube_l");
  p.sketch("Cradle_Sketch", "XY", "pan_dz - cradle_floor", (s) => {
    const r = s.rectX("pan_dx - (sv_l - sv_off) - cradle_wall", "pan_dx + sv_off + cradle_wall", "sv_l + 2*cradle_wall", "sv_w + 2*cradle_wall");
    s.dist(r.left, "pan_dx - (sv_l - sv_off) - cradle_wall");
  });
  p.extrude("Cradle", "sv_h - cradle_drop + cradle_floor");
  p.sketch("Pocket_Sketch", "XY", "pan_dz", (s) => {
    const r = s.rectX("pan_dx - (sv_l - sv_off) - cradle_fit", "pan_dx + sv_off + cradle_fit", "sv_l + 2*cradle_fit", "sv_w + 2*cradle_fit");
    s.dist(r.left, "pan_dx - (sv_l - sv_off) - cradle_fit");
  });
  p.extrude("CradlePocket", 0, { op: "cut", through: true });
});

// Frame: origin on the pan axis at the underside of the head; X forward.
def("head", { body: "Head", part_number: "RP-303", description: "Head shell, printed" }, (p) => {
  p.sketch("Skull_Sketch", "XY", 0, (s) => {
    const r = s.rectX(neg("skull_back"), "skull_l - skull_back", "skull_l", "skull_w");
    s.dist(r.left, "skull_back");
  });
  p.extrude("Skull", "skull_h", { op: "new" });
  p.sketch("Muzzle_Sketch", "YZ", "skull_l - skull_back", (s) => {
    const r = s.rect(neg("muz_w/2"), "muz_z0", "muz_w/2", "muz_z0 + muz_h", "muz_w", "muz_h");
    s.dist(r.right, "muz_w/2");
    s.dist(r.bottom, "muz_z0");
  });
  p.extrude("Muzzle", "muz_l");
  p.sketch("SkullCavity_Sketch", "XY", "head_wall", (s) => {
    const r = s.rectX(neg("skull_back - head_wall"), "skull_l - skull_back - head_wall", "skull_l - 2*head_wall", "skull_w - 2*head_wall");
    s.dist(r.left, "skull_back - head_wall");
  });
  p.extrude("SkullCavity", "skull_h - 2*head_wall", { op: "cut" });
  p.sketch("MuzzleCavity_Sketch", "YZ", "skull_l - skull_back - 2*head_wall", (s) => {
    const r = s.rect(neg("muz_w/2 - head_wall"), "muz_z0 + head_wall", "muz_w/2 - head_wall", "muz_z0 + muz_h - head_wall",
      "muz_w - 2*head_wall", "muz_h - 2*head_wall");
    s.dist(r.right, "muz_w/2 - head_wall");
    s.dist(r.bottom, "muz_z0 + head_wall");
  });
  p.extrude("MuzzleCavity", "muz_l + head_wall", { op: "cut" });
  p.sketch("HornHole_Sketch", "XY", 0, (s) => s.point(0, 0));
  p.hole("HornHole", "HornHole_Sketch", { diameter: "horn_hole_d", depth: "head_wall" });
  p.sketch("Eyes_Sketch", "YZ", "skull_l - skull_back", (s) => s.mirror([s.point("eye_y", "eye_z")], "y"));
  p.hole("Eyes", "Eyes_Sketch", { diameter: "eye_d", depth: "head_wall" });
});

def("camera_keepout", { body: "CameraKeepout", part_number: "REF-CAMERA", bom_type: "reference",
  description: "Camera keep-out volume (Raspberry Pi Camera Module 3 size)" }, (p) => {
  p.sketch("Keepout_Sketch", "XY", "-cam_h/2", (s) => s.rectC("cam_l", "cam_w"));
  p.extrude("Keepout", "cam_h", { op: "new" });
});

// Frame: origin on the wag axis at the underside of the plate; the plate extends toward -X.
def("tail_bracket", { body: "TailBracket", part_number: "RP-304", description: "Tail lift servo bracket, printed" }, (p) => {
  p.sketch("Plate_Sketch", "XY", 0, (s) => {
    const r = s.rectX(neg("bracket_l - bracket_front"), "bracket_front", "bracket_l", "sv_h");
    s.dist(r.right, "bracket_front");
  });
  p.extrude("Plate", "base_t", { op: "new" });
});

// Frame: origin at the middle of the lift axis (Y); the arms run along +X.
def("tail_yoke", { body: "TailYoke", part_number: "RP-305", description: "Tail yoke, printed" }, (p) => {
  p.sketch("Bridge_Sketch", "XZ", "-(yoke_in + cheek_t)", (s) => s.circle("br", 0, "arm_d"));
  p.extrude("Bridge", "2*(yoke_in + cheek_t)", { op: "new" });
  p.sketch("Arms_Sketch", "YZ", 0, (s) => s.mirror([s.circle("yoke_in + cheek_t/2", 0, "arm_d")], "y"));
  p.extrude("Arms", "br");
  p.sketch("CheekL_Sketch", "XZ", "yoke_in", (s) => s.circle(0, 0, "cheek_d"));
  p.extrude("CheekL", "cheek_t");
  p.sketch("CheekR_Sketch", "XZ", "-yoke_in", (s) => s.circle(0, 0, "cheek_d"));
  p.extrude("CheekR", "cheek_t", { dir: "negative" });
});

def("tail", { body: "Tail", part_number: "RP-306", description: "Tail rod, printed TPU" }, (p) => {
  p.sketch("Tail_Sketch", "XY", 0, (s) => s.circle(0, 0, "tail_d"));
  p.extrude("Tail", "tail_l", { op: "new" });
});

// key -> { key, file, comp, sym, bom_type, part }
const parts = {};
for (const d of defs) {
  const comp = d.info.body;
  parts[d.key] = Object.assign({ key: d.key, file: `cad/parts/${d.key}.sc`, comp }, d.info, {
    make: () => { const p = new Part(Object.assign({ key: d.key }, d.info)); d.build(p); return p; },
  });
}
module.exports = parts;
