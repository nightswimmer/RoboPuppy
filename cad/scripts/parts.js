// Every unique part of the robot, one design file each (cad/parts/<key>.sc).
// `sym` is a mirror plane of the part in its own frame. It is what lets one part serve the left and
// the right side: a mirrored placement is the plain placement combined with that reflection, which
// is a rigid move, so the part itself is never mirrored.
const { Part } = require("./lib/dsl");
const { neg } = require("./lib/dsl");

const defs = [];
const def = (key, info, build) => defs.push({ key, info, build });
const S = Math.SQRT1_2;

// Spine ribs: root on the mid frame's outer face; the front rib runs to the tip of the deck spine, the rear
// rib to just short of the tail wag servo. Flange screw positions are measured from the root.
const RIB_ROOT_X = "(x_mid + t_frame)";
const RIB_L_FRONT = "deck_spine_l/2 - x_mid - t_frame";
const RIB_L_REAR = "tail_wag_x - (sv_l - sv_off) - rib_gap - x_mid - t_frame";
const RIB_SCREWS_X = ["rib_hx0", "rib_hx0 + rib_pitch", "rib_hx0 + 2*rib_pitch", "rib_hx0 + 3*rib_pitch"];

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

// Knee actuator front-face M3 pattern about the hip axis, in the thigh plate frame. One source for both plates
// and the hip spacer: the six upper screws run through inner plate, spacer and outer plate into the actuator;
// the three lower ones hold only the outer plate, and the inner plate's holes there give a hex key access.
const kneeM3 = (s) => s.pattern([s.pointOn(s.polar("origin", "rs_m3_bcd/2", 70).end)], "origin", 9);

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
  p.sketch("KneeM3_Sketch", "XY", 0, kneeM3);
  p.hole("KneeM3", "KneeM3_Sketch", { clearance: "M3" });
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
});

// Frame: the thigh plate frame (X forward, Y up, origin on the hip axis), filling the cavity from z = 0 to cav.
// A horseshoe over the hip pulley with legs down both plate edges to the upper standoff holes, so the two
// plates are tied together at the hip end as the knee axle ties them at the knee. The upper standoffs are
// replaced by M3 through-bolts in the legs. A prism with through holes: turned over, it serves both sides.
def("hip_spacer", { body: "HipSpacer", part_number: "RP-108", sym: { axis: "z", about: "cav/2" },
  description: "Hip spacer between the thigh plates, printed" }, (p) => {
  p.sketch("Arch_Sketch", "XY", 0, (s) => s.circle(0, 0, "plate_w"));
  p.extrude("Arch", "cav", { op: "new" });
  p.sketch("Legs_Sketch", "XY", 0, (s) => {
    const r = s.rect(neg("plate_w/2"), neg("so_z1 + sp_end"), "plate_w/2", 0, "plate_w", "so_z1 + sp_end");
    s.dist(r.right, "plate_w/2");
    s.on(r.top);
  });
  p.extrude("Legs", "cav");
  // holes first, while there is material at every point of the actuator pattern; the bore and slot then take the lower three away
  p.sketch("KneeM3_Sketch", "XY", 0, kneeM3);
  p.hole("KneeM3", "KneeM3_Sketch", { clearance: "M3", depth: "cav" });
  p.sketch("Bolts_Sketch", "XY", 0, (s) => s.mirror([s.point("standoff_x", neg("so_z1"))], "y"));
  p.hole("Bolts", "Bolts_Sketch", { clearance: "M3", depth: "cav" });
  p.sketch("Bore_Sketch", "XY", 0, (s) => s.circle(0, 0, "sp_bore_d"));
  p.extrude("Bore", 0, { op: "cut", through: true });
  p.sketch("Slot_Sketch", "XY", 0, (s) => {
    const r = s.rect(neg("sp_bore_d/2"), neg("so_z1 + sp_end"), "sp_bore_d/2", 0, "sp_bore_d", "so_z1 + sp_end");
    s.dist(r.right, "sp_bore_d/2");
    s.on(r.top);
  });
  p.extrude("Slot", 0, { op: "cut", through: true });
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
  // spine rib passing through: a slot for the web and a notch at the top for the flange, which is bent to one
  // side on the front rib and to the other on the rear rib
  p.sketch("RibSlot_Sketch", "XY", 0, (s) => {
    const r = s.rect(neg("rib_t/2 + rib_clr"), "torso_top - rib_h - rib_clr", "rib_t/2 + rib_clr", "torso_top + rib_clr",
      "rib_t + 2*rib_clr", "rib_h + 2*rib_clr");
    s.dist(r.right, "rib_t/2 + rib_clr");
    s.dist(r.bottom, "torso_top - rib_h - rib_clr");
  });
  p.extrude("RibSlot", 0, { op: "cut", through: true });
  p.sketch("FlangeNotch_Sketch", "XY", 0, (s) => {
    const r = s.rect(neg("rib_fl - rib_t/2 + rib_clr"), "torso_top - rib_t - rib_clr", "rib_fl - rib_t/2 + rib_clr", "torso_top + rib_clr",
      "2*(rib_fl - rib_t/2 + rib_clr)", "rib_t + 2*rib_clr");
    s.dist(r.right, "rib_fl - rib_t/2 + rib_clr");
    s.dist(r.bottom, "torso_top - rib_t - rib_clr");
  });
  p.extrude("FlangeNotch", 0, { op: "cut", through: true });
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
  // spine rib flange screws: the front rib's flange is on the left, the rear rib's (turned half a turn) on the right
  p.sketch("FrontRibScrews_Sketch", "XY", "t_deck", (s) => {
    RIB_SCREWS_X.forEach((x) => s.point(`${RIB_ROOT_X} + ${x}`, "rib_fl/2"));
    s.point(`${RIB_ROOT_X} + (${RIB_L_FRONT}) - rib_tip_hole`, "rib_fl/2");
  });
  p.hole("FrontRibScrews", "FrontRibScrews_Sketch", { clearance: "M3", depth: "t_deck" });
  p.sketch("RearRibScrews_Sketch", "XY", "t_deck", (s) =>
    RIB_SCREWS_X.forEach((x) => s.point(neg(`${RIB_ROOT_X} + ${x}`), neg("rib_fl/2"))));
  p.hole("RearRibScrews", "RearRibScrews_Sketch", { clearance: "M3", depth: "t_deck" });
});

// Spine ribs. Frame (front rib): robot axes, origin on the centreline at the rib root (the mid frame's face)
// on the deck underside. The web hangs below the deck and runs forward through the bulkhead slot; the flange
// is bent toward +Y and screwed to the deck. The rear rib is placed turned half a turn about Z.
// Bend radius not modelled (sharp corner).
const spineRib = (len, tipHole) => (p) => {
  p.sketch("Web_Sketch", "YZ", 0, (s) => {
    const r = s.rect(neg("rib_t/2"), neg("rib_h"), "rib_t/2", 0, "rib_t", "rib_h");
    s.dist(r.right, "rib_t/2");
    s.on(r.top);
  });
  p.extrude("Web", len, { op: "new" });
  p.sketch("Flange_Sketch", "YZ", 0, (s) => {
    const r = s.rect(neg("rib_t/2"), neg("rib_t"), "rib_fl - rib_t/2", 0, "rib_fl", "rib_t");
    s.dist(r.left, "rib_t/2");
    s.on(r.top);
  });
  p.extrude("Flange", len);
  p.sketch("DeckScrews_Sketch", "XY", 0, (s) => {
    RIB_SCREWS_X.forEach((x) => s.point(x, "rib_fl/2"));
    if (tipHole) s.point(`(${len}) - rib_tip_hole`, "rib_fl/2");
  });
  p.hole("DeckScrews", "DeckScrews_Sketch", { clearance: "M3", depth: "rib_t" });
};
def("spine_rib_front", { body: "SpineRibFront", part_number: "RP-205",
  description: "Front spine rib, 3 mm aluminium, laser-cut and bent" }, spineRib(RIB_L_FRONT, true));
def("spine_rib_rear", { body: "SpineRibRear", part_number: "RP-206",
  description: "Rear spine rib, 3 mm aluminium, laser-cut and bent" }, spineRib(RIB_L_REAR, false));

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

// ============================ leg, linkage knee variant ============================
// The knee actuator sits at the hip as before, but turns a crank instead of a pulley. A pushrod with a rod end at
// each end runs down the rear of the thigh to a lever on the shank, above the knee axis. Layers across the cavity,
// from the outer plate inward: knee actuator flange (1 mm proud), crank, rod (rod-end ring clamped between the
// crank and, at the knee, the two cheeks of the shank lever), then the shank blade on the inner side.
// Rod plane, from the cavity's inner face:
const ROD_Z = "(cav_lk - (rs_flange_h - t_plate) - crank_t - re_ball_w/2)";

// Frame: as the belt thigh plates (XY plane, X forward, Y up, origin on the hip axis, knee at (0, -lt)).
// Tapers from the hip disc (plate_w) to a small knee end. Flat with through features: turned over, it serves both sides.
const thighPlateLk = (p) => {
  p.sketch("Outline_Sketch", "XY", 0, (s) => s.taper("plate_w/2", "lt", "lk_knee_r"));
  p.extrude("Plate", "t_plate", { op: "new" });
  p.sketch("KneeAxle_Sketch", "XY", 0, (s) => s.point(0, neg("lt")));
  p.hole("KneeAxleHole", "KneeAxle_Sketch", { diameter: "axle_d" });
  p.sketch("Standoff_Sketch", "XY", 0, (s) => {
    s.point("lk_so_x1", neg("lk_so_z1"));
    s.point("lk_so_x2", neg("lk_so_z2"));
  });
  p.hole("StandoffHoles", "Standoff_Sketch", { clearance: "M3", fit: "close" });
  p.sketch("KneeM3_Sketch", "XY", 0, kneeM3);
  p.hole("KneeM3", "KneeM3_Sketch", { clearance: "M3" });
};

def("thigh_inner_plate_lk", { body: "ThighInnerPlateLk", part_number: "RP-111", sym: { axis: "z", about: "t_plate/2" },
  description: "Thigh inner plate, linkage knee, 3 mm aluminium, laser-cut" }, (p) => {
  thighPlateLk(p);
  p.sketch("FlangeM4_Sketch", "XY", 0, (s) => s.pattern([s.point("rs_flange_bcd/2", 0)], "origin", 6));
  p.hole("FlangeM4", "FlangeM4_Sketch", { clearance: "M4", fit: "close" });
  p.sketch("FlangePin_Sketch", "XY", 0, (s) => s.pattern([s.point(0, "rs_flange_bcd/2")], "origin", 3));
  p.hole("FlangePins", "FlangePin_Sketch", { diameter: 4 });
});

def("thigh_outer_plate_lk", { body: "ThighOuterPlateLk", part_number: "RP-112", sym: { axis: "z", about: "t_plate/2" },
  description: "Thigh outer plate, linkage knee, 3 mm aluminium, laser-cut" }, (p) => {
  thighPlateLk(p);
  p.sketch("Pilot_Sketch", "XY", 0, (s) => s.circle(0, 0, "pilot_clear_d"));
  p.extrude("PilotHole", 0, { op: "cut", through: true });
});

// Frame: the thigh plate frame, filling the cavity from z = 0 to cav_lk. Only the front of the hip disc: the crank
// and the rod sweep the rear half. Clamped by the four front knee actuator screws. A prism with through holes.
def("hip_spacer_lk", { body: "HipSpacerLk", part_number: "RP-113", sym: { axis: "z", about: "cav_lk/2" },
  description: "Hip spacer, linkage knee, printed" }, (p) => {
  p.sketch("Disc_Sketch", "XY", 0, (s) => s.circle(0, 0, "plate_w"));
  p.extrude("Disc", "cav_lk", { op: "new" });
  // holes first, while there is material at every point of the actuator pattern; the cuts then take the rear ones away
  p.sketch("KneeM3_Sketch", "XY", 0, kneeM3);
  p.hole("KneeM3", "KneeM3_Sketch", { clearance: "M3", depth: "cav_lk" });
  p.sketch("Bore_Sketch", "XY", 0, (s) => s.circle(0, 0, "lk_sp_bore_d"));
  p.extrude("Bore", 0, { op: "cut", through: true });
  p.sketch("Rear_Sketch", "XY", 0, (s) => {
    const r = s.rect(neg("plate_w/2 + 5"), neg("plate_w/2 + 5"), "lk_sp_x0", "plate_w/2 + 5", "plate_w/2 + 5 + lk_sp_x0", "plate_w + 10");
    s.dist(r.right, "lk_sp_x0");
    s.dist(r.bottom, "plate_w/2 + 5");
  });
  p.extrude("RearCut", 0, { op: "cut", through: true });
});

// Frame: axis Z = the knee actuator axis, origin on the flange face, crank toward +Z (into the cavity), rod pin on +X.
// Symmetric about its XZ plane (the flange pattern is too), so the same crank serves both sides.
def("knee_crank", { body: "KneeCrank", part_number: "RP-114", sym: { axis: "y" },
  description: "Knee crank, 6 mm aluminium, laser-cut, counterbored and tapped" }, (p) => {
  p.sketch("Hub_Sketch", "XY", 0, (s) => s.circle(0, 0, "crank_hub_d"));
  p.extrude("Hub", "crank_t", { op: "new" });
  p.sketch("Arm_Sketch", "XY", 0, (s) => s.slot([0, 0], ["lk_a", 0], "lk_a", "crank_arm_w"));
  p.extrude("Arm", "crank_t");
  // actuator output flange: 6x M4 counterbored from the rod side (heads flush), 3 dowel pins
  p.sketch("FlangeM4_Sketch", "XY", "crank_t", (s) => s.pattern([s.pointOn(s.polar("origin", "rs_flange_bcd/2", 30).end)], "origin", 6));
  p.hole("FlangeM4", "FlangeM4_Sketch", { clearance: "M4", fit: "close", type: "counterbore", cb_diameter: "crank_cb_d", cb_depth: "crank_cb_depth" });
  p.sketch("FlangePin_Sketch", "XY", "crank_t", (s) => s.pattern([s.point("rs_flange_bcd/2", 0)], "origin", 3));
  p.hole("FlangePins", "FlangePin_Sketch", { diameter: 4, depth: "crank_t" });
  p.sketch("RodPin_Sketch", "XY", "crank_t", (s) => s.point("lk_a", 0));
  p.hole("RodPin", "RodPin_Sketch", { thread: "M5", depth: "crank_t" });
});

// Frame: axis Z, from z = 0 to its length. Tapped for a rod end at each end.
def("knee_pushrod", { body: "KneePushrod", part_number: "RP-115", sym: { axis: "x" },
  description: "Knee pushrod, dia 8 aluminium rod, tapped M5 both ends" }, (p) => {
  p.sketch("Rod_Sketch", "XY", 0, (s) => s.circle(0, 0, "rod_d"));
  p.extrude("Rod", "lk_c - 2*rod_end_gap", { op: "new" });
  p.sketch("TopThread_Sketch", "XY", "lk_c - 2*rod_end_gap", (s) => s.point(0, 0));
  p.hole("TopThread", "TopThread_Sketch", { thread: "M5", depth: "rod_thread" });
  p.sketch("BottomThread_Sketch", { origin: [0, 0, 0], x_dir: [1, 0, 0], y_dir: [0, -1, 0] }, 0, (s) => s.point(0, 0));
  p.hole("BottomThread", "BottomThread_Sketch", { thread: "M5", depth: "rod_thread" });
});

// Frame: origin at the ball centre, bore along Z, threaded shank toward +X. The stud inside the pushrod is not modelled.
def("rod_end_m5", { body: "RodEnd", part_number: "SA5-TK", bom_type: "purchased", sym: { axis: "z" },
  description: "Rod end M5 male, 5 mm bore (SA5 T/K size)" }, (p) => {
  p.sketch("Eye_Sketch", "XY", "-re_t/2", (s) => s.circle(0, 0, "re_d"));
  p.extrude("Eye", "re_t", { op: "new" });
  p.sketch("Ball_Sketch", "XY", "-re_ball_w/2", (s) => s.circle(0, 0, "re_ball_d"));
  p.extrude("Ball", "re_ball_w");
  p.sketch("Neck_Sketch", "YZ", 0, (s) => s.circle(0, 0, "re_neck_d"));
  p.extrude("Neck", "re_neck");
  p.sketch("Bore_Sketch", "XY", "re_ball_w/2", (s) => s.point(0, 0));
  p.hole("Bore", "Bore_Sketch", { diameter: "re_bore_d" });
});

def("standoff_m3x20", { body: "Standoff20", part_number: "SO-M3X20", bom_type: "purchased", sym: { axis: "z", about: "cav_lk/2" },
  description: "Standoff M3 x 20, female-female" }, (p) => {
  p.sketch("Standoff_Sketch", "XY", 0, (s) => s.circle(0, 0, "standoff_d"));
  p.extrude("Standoff", "cav_lk", { op: "new" });
  p.sketch("Thread_Sketch", "XY", "cav_lk", (s) => s.point(0, 0));
  p.hole("Thread", "Thread_Sketch", { thread: "M3" });
});

def("knee_axle_lk", { body: "KneeAxleLk", part_number: "RP-117", sym: { axis: "z", about: "(2*t_plate + cav_lk)/2" },
  description: "Knee axle, linkage knee, dia 8 steel, ends tapped" }, (p) => {
  p.sketch("Axle_Sketch", "XY", 0, (s) => s.circle(0, 0, "axle_d"));
  p.extrude("Axle", "2*t_plate + cav_lk", { op: "new" });
});

// Frame: as the belt shank (origin on the knee axis at the cavity's inner face; X forward, Y down the shank,
// Z outward). Hub across the cavity on two 688 bearings, blade on the inner side, lever straight up the shank
// axis above the knee. The lever is a clevis: the rod end's ring sits in a slot between two cheeks.
// Symmetric front to back, so the same part serves both sides (turned half a turn about the vertical).
def("shank_lk", { body: "ShankLk", part_number: "RP-116", sym: { axis: "x" },
  description: "Shank with knee lever, linkage knee, printed" }, (p) => {
  p.sketch("Hub_Sketch", "XY", "hub_gap", (s) => s.circle(0, 0, "lk_hub_d"));
  p.extrude("Hub", "cav_lk - 2*hub_gap", { op: "new" });
  p.sketch("Blade_Sketch", "XY", "hub_gap", (s) => {
    const r = s.rect(neg("blade_w/2"), 0, "blade_w/2", "ls", "blade_w", "ls");
    s.dist(r.right, "blade_w/2");
    s.on(r.bottom);
  });
  p.extrude("Blade", "blade_t");
  p.sketch("FootCore_Sketch", "XY", "-foot_in", (s) => s.circle(0, "ls", "foot_core_d"));
  p.extrude("FootCore", "foot_core_w");
  p.sketch("Lever_Sketch", "XY", "hub_gap", (s) => s.slot([0, 0], [0, neg("lk_b")], "lk_b", "lever_w"));
  p.extrude("Lever", "cav_lk - 2*hub_gap");
  p.sketch("Clevis_Sketch", "XY", `${ROD_Z} - re_ball_w/2`, (s) => {
    const r = s.rect(neg("lever_w/2 + 2"), neg("lk_b + lever_w/2 + 2"), "lever_w/2 + 2", neg("lk_hub_d/2 + 1"),
      "lever_w + 4", "lk_b + lever_w/2 + 1 - lk_hub_d/2");
    s.dist(r.right, "lever_w/2 + 2");
    s.dist(r.top, "lk_hub_d/2 + 1");
  });
  p.extrude("ClevisSlot", "re_ball_w", { op: "cut" });
  p.sketch("RodPin_Sketch", "XY", "cav_lk - hub_gap", (s) => s.point(0, neg("lk_b")));
  p.hole("RodPin", "RodPin_Sketch", { clearance: "M5", depth: "cav_lk - 2*hub_gap" });
  // knee axle bore with a 688 bearing seat at each end
  p.sketch("Axle_Sketch", "XY", "cav_lk - hub_gap", (s) => s.point(0, 0));
  p.hole("AxleBore", "Axle_Sketch", { diameter: "axle_bore_d", type: "counterbore", cb_diameter: "seat_d", cb_depth: "lk_seat" });
  p.sketch("SeatIn_Sketch", "XY", "hub_gap", (s) => s.point(0, 0));
  p.hole("BearingSeatIn", "SeatIn_Sketch", { diameter: "seat_d", depth: "lk_seat" });
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
