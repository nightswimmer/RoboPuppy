// Shared dimensions (mm). Single source for every part and assembly.
// Each part file receives the ones it uses as named parameters, so mating features
// (bolt circles, thicknesses, axis positions) are never typed twice.
module.exports = {
  // ---- RobStride 02 actuator (purchased), from the official STEP file (RS02-20261030.stp) ----
  // Angles in the actuator frame, from the plug (+X): pins 0/120/240, M4 30+60k, front M3 0+40k,
  // rear M3 40/80/120/240/280/320, rear heads 0/160/200, sockets 0 and 180.
  rs_body_d: 78.5, rs_body_l: 28,        // housing
  rs_cover_d: 65, rs_cover_l: 13.5,      // rear cover
  rs_pilot_d: 43, rs_pilot_h: 3.5,       // fixed pilot ring on the front face
  rs_flange_d: 30, rs_flange_h: 4,       // output flange (0.5 proud of the pilot)
  rs_m3_bcd: 73,                         // M3 circles, front (9x) and rear (6x)
  rs_flange_bcd: 24, rs_m4_depth: 7,     // 6x M4 (7 deep minimum) + 3x dia 4 pins on the output flange
  rs_head_d: 5.6, rs_head_h: 2.35,       // three proud screw heads on the rear annulus
  // XT30PB(2+2)-M sockets in the cover rim, facing outward (15.5 wide, 5.2 axial, 2.8-8.0 behind the rear annulus,
  // face at r 35.2). Modelled as the keep-out of the mated XT30(2+2)-F plug: plug size and cable room are estimates.
  rs_plug_w: 16, rs_plug_h: 6, rs_plug_z: 5.4,      // width, axial height, centre behind the rear annulus
  rs_plug_r0: 30, rs_plug_r1: 50,                   // radial extent: from inside the cover to 15 mm past the socket face

  // ---- serial bus servo, Feetech STS size (purchased; dimensions not yet verified) ----
  sv_l: 45, sv_w: 24.7, sv_h: 35, sv_off: 10,      // sv_h along the shaft; shaft sv_off from one end
  horn_d: 22, horn_t: 3,

  // ---- leg ----
  // Link lengths. lt and ls are the main design (the linkage leg, close to the Unitree Go2's 213/213). The belt variant
  // is frozen at its own lengths, which its belt sets.
  lt: 200,               // thigh: hip axis to knee axis
  ls: 200,               // shank: knee axis to foot centre
  lt_belt: 242.2,        // belt variant thigh (HTD 5M 635 belt, 24T:36T)
  ls_belt: 242,          // belt variant shank
  t_plate: 3,            // thigh plates
  plate_w: 84,           // thigh plate width
  y_h: 10,               // hip-pitch actuator rear annulus, from the abduction axis
  y_in: 42,              // inner plate inner face = hip-pitch flange face (y_h + 32)
  cav: 35,               // cavity between the plates (M3 x 35 standoffs)
  blade_zone: 14.5,      // inner part of the cavity, where the shank blade swings
  pulley_w: 19.5,        // belt zone (15 mm belt + flanges)
  pulley_flange_t: 1.5,
  od_hip: 37.05, od_knee: 56.15,       // HTD 5M 24T / 36T outside diameters
  hip_flange_d: 42, knee_flange_d: 61, // pulley flanges
  standoff_x: 37.5, standoff_d: 6,
  so_z1: 60, so_z2: 150, so_z3: 205, so_z4: 130,   // standoff heights below the hip axis
  win_x: 4, win_z0: 65, win_len: 105, win_w: 28,   // lightening window
  idl_z: 110, idl_x0: 34, idl_len: 11, idl_w: 5.2, idl_x: 31,   // tensioner slot; idl_x = nominal roller position
  axle_d: 8, pilot_clear_d: 43.2,
  // hip spacer: closes the gap between the plates around the hip end, clamped by the knee actuator screws
  sp_bore_d: 56,         // clears the belt on the hip pulley (back at r ~20) and the heads of the two lowest actuator screws
  sp_end: 6,             // legs run this far past the upper standoff holes
  // hip carrier
  cup_od: 88, cup_rear: 8, cup_len: 28, bore_d: 79.2, opening_d: 67,
  cover_relief: 1,       // the rear opening runs this far past the end of the actuator cover (5.5 proud of the cup), through the block
  plug_slot_w: 18, plug_slot_h: 96,
  flange_x: 46,          // abduction flange face, from the hip pitch axis
  block_t: 18, block_h: 68, block_back: 17, block_front: 40,
  head_pocket_d: 7, head_pocket_depth: 3.5, cb_d: 8, cb_floor: 6.5,
  // shank
  hub_d: 44, hub_gap: 0.5, blade_w: 30, blade_t: 13, foot_core_d: 44, foot_core_w: 24, foot_in: 5,
  axle_bore_d: 10, seat_d: 16, seat_out: 4.6, seat_in: 5.1,
  foot_pad_od: 56,

  // ---- leg, linkage knee (the main design: leg_linkage.sc, robot_linkage.sc; first designed in the motion rig) ----
  // The knee actuator turns a crank; a pushrod runs down the rear of the thigh to a lever on the shank (a four-bar).
  // Knee fold 60-159 deg (at 159.8 the foot pad meets the thigh's hip end). Ratio 1.38 in the Go2 stance, 1.27-1.38 over
  // the trotting folds (86-105), at least 1.25, about 3.0 at 60 and 2.1 at 159; transmission angles at least 18 deg.
  // Keys ending in _ang are angles (degrees); the others are lengths.
  cav_lk: 20,            // cavity between the thigh plates (M3 x 20 standoffs)
  lk_a: 22,              // crank: knee actuator axis to rod pin
  lk_b: 28,              // shank lever: knee axis to the lever pin
  lk_ang: -12,           // lever pin direction: from the shank axis above the knee, turned this far (positive toward the rear)
  lk_c: 203,             // pushrod: rod-end ball centre to ball centre (lt + 3)
  crank_t: 5, crank_hub_d: 40, crank_arm_w: 13, crank_cb_d: 8, crank_cb_depth: 3,   // 5 mm aluminium crank, counterbored M4
  re_d: 18, re_t: 6, re_ball_d: 11, re_ball_w: 8, re_neck_d: 7, re_neck: 14, re_bore_d: 5,   // M5 male rod end (SA5 T/K size), envelope
  rod_d: 8, rod_bore_d: 4, rod_end_gap: 18, rod_thread: 15,   // pushrod: 8 x 4 mm 6061 tube, the bore opened to the M5 tap drill at each end; it starts rod_end_gap from each ball centre (rod-end neck + jam nut)
  // thigh plates: a hook. Hip round plate_w/2 and knee round lk_knee_r; the rear edge is two convex arcs (nearly straight
  // from the hip, then a tighter one into the knee round), the front edge two concave arcs (a long one from the hip round,
  // then a tight one into the knee round), so the bend is near the knee and the folded shank nests in front of it.
  // The junctions are th_rear_j and th_front_j times lt below the hip (ratios). The front edge stays at least 1.5 mm in
  // front of the rod at every fold.
  lk_knee_r: 20,
  th_rear_r1: 1200, th_rear_r2: 230, th_front_r1: 210, th_front_r2: 40, th_rear_j: 0.4, th_front_j: 0.75,
  // thigh standoffs (M3 x 20), x and depth below the hip axis: four behind the rod (x toward the rear), one in front near the hip
  lk_so_x1: 40, lk_so_z1: 45, lk_so_x2: 41, lk_so_z2: 85, lk_so_x3: 39, lk_so_z3: 120, lk_so_x4: 36, lk_so_z4: 145,
  lk_so_x5: 3.5, lk_so_z5: 55,
  lk_sp_bore_d: 44, lk_sp_x0: 8,               // hip spacer: bore around the crank hub; rear edge clear of the crank and rod
  // shank: two 3 mm aluminium plates, sh_w wide, along an S-shaped centreline: a line sh_lean_l long from the knee
  // leaning sh_lean_ang toward the rear, an arc (sh_r1) turning toward the front, then an arc (sh_r2) turning back that
  // ends at the foot, under the knee. The plate top is a round (sh_top_r) about the knee joined to a boss (sh_boss_r)
  // round the lever pin.
  sh_w: 26, sh_lean_ang: 4, sh_lean_l: 15, sh_r1: 150, sh_r2: 175, sh_top_r: 16, sh_boss_r: 11,
  sh_in: 2.5,            // inner shank plate, from the cavity's inner face (the plates run sh_in inside the thigh plates;
                         // the Chicago screw heads pass under the thigh plates there, from about 60 to 105 deg of knee fold)
  sh_gap: 9,             // between the shank plates: the rod-end ball (re_ball_w) and a shim each side (shim_t)
  sh_so1: 55, sh_so2: 125,                     // shank spacers (M3 x 9), along the centreline from the knee (arc lengths)
  // lever pin: a Chicago screw (sex bolt) M4 x 15 through both shank plates, the shims and the rod-end ball. Barrel
  // dia cs_d, cs_l long under its head (= 2*t_plate + sh_gap); barrel head cs_d1 x cs_h1, screw head cs_d2 x cs_h2.
  cs_d: 5, cs_l: 15, cs_d1: 8.5, cs_h1: 1.8, cs_d2: 8.3, cs_h2: 1.7,
  shim_d: 10, shim_t: 0.5,                     // DIN 988 shim 5 x 10 x 0.5 each side of the rod-end ball
  // holes finished by reaming are modelled at the size they are cut (laser or drill): ream_stock under the finished
  // size, so the cut file carries the right size and the reamer has material to remove
  ream_stock: 0.2,
  // knee pivot: a printed PETG hub between the shank plates holds a drawn-cup needle bearing that runs on the knee
  // sleeve. Hub body kh_d across, cut back to kh_rel_r between kh_rel0_ang and kh_rel1_ang (shank plate frame:
  // 0 = forward, 90 = up), where the pushrod passes 10.4 mm from the knee axis at full fold. A D-shaped spigot at each
  // end (kh_key_d across, flat kh_key behind the axis) sits in the matching hole in each shank plate.
  kh_d: 26, kh_rel_r: 9.3, kh_rel0_ang: -35, kh_rel1_ang: 73, kh_key_d: 18, kh_key: 7.5,
  nb_od: 12, nb_l: 12,                         // needle bearing HK0812-2RS, 8 x 12 x 12, sealed; pressed into the hub
  tw_d: 16, tw_bore: 8.4, tw_t: 1.6,           // thrust washer DIN 125-A M8 against each end of the hub
  ks_d: 14, ks_t1: 0.5, ks_t2: 0.2,            // DIN 988 shims 8 x 14 between each washer and the thigh plate;
                                               // knee play each side: sh_in - tw_t - ks_t1 - ks_t2 (0.2)
  // knee axle: a hardened sleeve (bearing steel, 58-62 HRC, OD ground 8 0/-0.01), bore cs_d, axle_d across, cav_lk
  // long, clamped between the thigh plates' inner faces by a Chicago screw M4 x 25 (barrel dia cs_d, grip kcs_g0 to
  // kcs_g1) through both plates. Heads kcs_d1 x kcs_h (estimated; check against the bought screw)
  kcs_g0: 25, kcs_g1: 27, kcs_d1: 10, kcs_h: 3,
  foot_slot_clr: 0.2,    // foot core and pad: clearance round the plate ends in their slots

  // ---- torso ----
  hip_x: 210,            // hip pitch axes, fore/aft from centre
  abd_y: 42,             // abduction axes, lateral from the centreline
  lobe_r: 40.5,          // frame lower corners, about each abduction axis
  pan_lobe_r: 36,        // belly pan lower corners
  torso_half_w: 60, torso_top: 44,
  t_frame: 3, t_deck: 2, t_pan: 3,
  x_bulk: 160,           // bulkhead inner face = abduction actuator front face (hip_x - 50)
  x_mid: 129,            // mid frame inner face (hip_x - 78 - t_frame)
  mid_slot: 18, mid_slot_z0: 28, mid_head_d: 6.5,   // plug slot above each actuator axis (open to the top edge)
  mid_notch: 9,          // plug notch below each actuator axis: to r 37, just past the socket face (r 35.2)
  mid_tab_w: 30, mid_tab: 5,   // tab below each actuator, reaching mid_tab below the frame lobe: a web under the notch and heads
  plug_clr: 1,           // clearance round the abduction plugs in the deck slots and belly pan notches
  deck_spine_l: 612, deck_spine_w: 60, wag_hole_d: 12,
  bat_l: 200, bat_w: 110, bat_h: 72, bat_z0: -34,
  // spine ribs: bent 3 mm aluminium L under each end of the deck spine, from the mid frame through a slot in the bulkhead
  rib_t: 3, rib_h: 30,   // web thickness and depth below the deck (bottom stays clear of the abduction actuators)
  rib_fl: 15,            // flange width, from the web's far face; bent toward +Y on the front rib
  rib_clr: 0.2,          // clearance around the rib in the bulkhead slot
  rib_hx0: 13, rib_pitch: 29,   // flange screws, from the rib root (the fourth stays clear of the neck base)
  rib_tip_hole: 7,       // extra flange screw near the front rib's tip
  rib_gap: 1,            // rear rib tip to the tail wag servo

  // ---- neck, head, tail ----
  neck_x: 275,           // neck tilt axis
  tail_wag_x: 293,       // tail wag axis, behind centre
  tail_lift_dx: 35,      // lift axis behind the wag axis
  base_t: 3, base_back: 37, base_front: 13,
  yoke_in: 20.5,         // inner face of the yoke cheeks (sv_h/2 + horn_t)
  cheek_d: 24, cheek_t: 3, arm_d: 10, br: 22,      // br: bridge distance from the yoke axis
  tube_d: 28, tube_l: 45,
  pan_dx: 58, pan_dz: 47.65,           // pan axis and pan servo bottom, from the tilt axis
  cradle_wall: 3, cradle_floor: 4, cradle_fit: 0.2, cradle_drop: 6,
  skull_l: 110, skull_w: 100, skull_h: 85, skull_back: 33,
  muz_l: 95, muz_w: 56, muz_h: 48, muz_z0: 3, head_wall: 2.5,
  eye_y: 32, eye_z: 67, eye_d: 10, horn_hole_d: 8,
  cam_l: 12, cam_w: 25, cam_h: 24,
  bracket_l: 50, bracket_front: 5,
  tail_d: 22, tail_l: 300,
};
