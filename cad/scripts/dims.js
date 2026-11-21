// Shared dimensions (mm). Single source for every part and assembly.
// Each part file receives the ones it uses as named parameters, so mating features
// (bolt circles, thicknesses, axis positions) are never typed twice.
module.exports = {
  // ---- RobStride 01 actuator (purchased) ----
  rs_body_d: 78.5, rs_body_l: 28,        // housing
  rs_cover_d: 63, rs_cover_l: 8.5,       // rear cover
  rs_pilot_d: 43, rs_pilot_h: 3.5,       // fixed pilot ring on the front face
  rs_flange_d: 30, rs_flange_h: 4,       // output flange (0.5 proud of the pilot)
  rs_m3_bcd: 73,                         // M3 circles, front (9x) and rear (6x)
  rs_flange_bcd: 24,                     // 6x M4 + 3x dia 4 pins on the output flange
  rs_head_d: 5.5, rs_head_h: 3,          // three proud screw heads on the rear annulus
  rs_plug_w: 14, rs_plug_r0: 28, rs_plug_r1: 38,   // plug stub on the rear cover (size assumed)

  // ---- serial bus servo, Feetech STS size (purchased; dimensions not yet verified) ----
  sv_l: 45, sv_w: 24.7, sv_h: 35, sv_off: 10,      // sv_h along the shaft; shaft sv_off from one end
  horn_d: 22, horn_t: 3,

  // ---- leg ----
  lt: 242.2,             // thigh: hip axis to knee axis (HTD 5M 635 belt, 24T:36T)
  ls: 242,               // shank: knee axis to foot centre
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
  sp_bore_d: 56,         // clears the belt on the hip pulley (back at r ~20) and the heads of the three lower actuator screws
  sp_end: 6,             // legs run this far past the upper standoff holes
  // hip carrier
  cup_od: 88, cup_rear: 8, cup_len: 28, bore_d: 79.2, opening_d: 65,
  cover_relief: 1,       // the rear opening starts this far behind the cup, so the actuator cover (0.5 proud) clears the block
  plug_slot_w: 18, plug_slot_h: 96,
  flange_x: 46,          // abduction flange face, from the hip pitch axis
  block_t: 18, block_h: 68, block_back: 17, block_front: 40,
  head_pocket_d: 7, head_pocket_depth: 3.5, cb_d: 8, cb_floor: 6.5,
  // shank
  hub_d: 44, hub_gap: 0.5, blade_w: 30, blade_t: 13, foot_core_d: 44, foot_core_w: 24, foot_in: 5,
  axle_bore_d: 10, seat_d: 16, seat_out: 4.6, seat_in: 5.1,
  foot_pad_od: 56,

  // ---- leg, linkage knee variant (leg_linkage.sc, robot_linkage.sc) ----
  // The knee actuator turns a crank; a pushrod runs down the thigh to a lever on the shank (a four-bar).
  // Knee fold range 45-140 deg; ratio 1.42:1 standing, at least 1.29:1 everywhere, rising toward both ends.
  cav_lk: 20,            // cavity between the plates (M3 x 20 standoffs)
  lk_knee_r: 18,         // plate end radius at the knee; the hip end keeps plate_w/2
  lk_a: 26,              // crank: knee actuator axis to rod pin
  lk_b: 34,              // shank lever: knee axis to rod pin, along the shank axis above the knee
  lk_c: 244.2,           // pushrod: rod-end ball centre to ball centre
  crank_t: 6, crank_hub_d: 40, crank_arm_w: 13, crank_cb_d: 8, crank_cb_depth: 3,   // 6 mm aluminium crank, counterbored M4
  re_d: 18, re_t: 6, re_ball_d: 11, re_ball_w: 8, re_neck_d: 7, re_neck: 14, re_bore_d: 5,   // M5 male rod end (SA5 T/K size), envelope
  rod_d: 8, rod_end_gap: 18, rod_thread: 15,   // pushrod; it starts rod_end_gap from each ball centre (rod-end neck + jam nut)
  lk_hub_d: 24, lever_w: 20, lk_seat: 5,       // shank hub, lever width, 688 bearing seat depth at each end
  lk_sp_bore_d: 44, lk_sp_x0: 8,               // hip spacer: bore around the crank hub; rear edge clear of the crank and rod
  lk_so_x1: 26, lk_so_z1: 95, lk_so_x2: 15, lk_so_z2: 185,   // standoffs, all in the front half (the rod runs at the rear)

  // ---- torso ----
  hip_x: 210,            // hip pitch axes, fore/aft from centre
  abd_y: 42,             // abduction axes, lateral from the centreline
  lobe_r: 40.5,          // frame lower corners, about each abduction axis
  pan_lobe_r: 36,        // belly pan lower corners
  torso_half_w: 60, torso_top: 44,
  t_frame: 3, t_deck: 2, t_pan: 3,
  x_bulk: 160,           // bulkhead inner face = abduction actuator front face (hip_x - 50)
  x_mid: 129,            // mid frame inner face (hip_x - 78 - t_frame)
  mid_slot: 18, mid_slot_z0: 28, mid_head_d: 6.5,
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
