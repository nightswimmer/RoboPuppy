---
name: cad-modelling
description: Conventions for how 3D CAD models are structured and built - one file per part and sub-assembly, reuse by instancing, mirrored parts, purchased components, BOM identity, fully constrained sketches, hole patterns and feature patterns. Use whenever creating, editing, restructuring or reviewing a CAD part, assembly, generator script or BOM, in any CAD tool.
---

# CAD modelling conventions

These rules say how a model must be structured, whatever CAD tool builds it. For command syntax and the tool's own traps, read the tool's documentation or skill as well. Where the tool's guidance suggests a shortcut that conflicts with these rules (for example "a hole is cheapest as a positioned primitive"), these rules win, because the model has to stay editable and produce a correct BOM, not just look right.

If the tool cannot do something these rules ask for, say so and propose the closest alternative. Do not fall back silently to copied geometry or hard-coded coordinates.

## 1. Design each thing once, then instance it

A part or sub-assembly that appears more than once is modelled once, in its own file, and placed as linked instances. Never build the same geometry twice, and never copy it.

- **One file per unique part or sub-assembly.** Each level of the assembly links the level below: part files, then sub-assembly files (a leg, a gearbox), then the top assembly. The top assembly contains placements and joints, not part geometry.
- **Repeats are instances of one definition.** Four identical legs are one leg file placed four times. A change to the leg file then reaches every instance, and the BOM counts four of one item.
- **Purchased components get their own file each** (motors, servos, bearings, connectors, fasteners not taken from a standard library). Model the envelope and the real mounting interface: bolt patterns, pilot diameters, shaft, connector keep-out. Import that file wherever the component is used. Never redraw a purchased component inside another part's file.
- **Plan the tree before modelling.** List the unique parts, the sub-assemblies, and how many times each is used. Show this list to the user for anything larger than a single part.

### Mirrored and nearly identical parts

A left and a right sub-assembly are mirror images of each other as assemblies, but they must be built from the same fabricated parts. The mirroring happens in how the parts are placed, not in the parts.

1. **Every fabricated part serves both sides.** Design it so the same physical part fits the left and the right assembly: symmetric about its own mid-plane, or usable flipped or rotated, even at the cost of a few extra holes or a little extra material. This gives one item in the BOM, one print or cut file, and one spare.
2. **Build the opposite-hand assembly by placing the same part files** in mirrored positions (each part flipped or rotated as a rigid body). Never mirror part geometry to make it, because that silently creates a second, different part to manufacture.
3. **Check it:** every part in the mirrored assembly must be an unmirrored instance of the same file as on the other side. Flat plates may be turned over; a printed part may be turned over only if it still prints and works that way up.
4. **Purchased parts are never mirrored.** A motor has no mirror-image version, so the design must accept the same motor on both sides.
5. **A handed part is a last resort.** If a part cannot be made to serve both sides, stop and ask the user before creating a second hand. If they approve, derive it as a linked mirror of the first with its own part number (`-L` and `-R`).
6. **Small differences between instances** (front and rear legs that differ in one bracket) are handled by keeping the common parts shared and adding only the differing part as a separate file, or by a configuration of the same file. Do not fork the whole sub-assembly.

Tell the user which parts are shared across sides and how each one is reoriented (flipped, rotated, or placed as is).

### Part identity and the BOM

- Give every unique part a part number and a description, and mark it as made or purchased, using the tool's part properties.
- Two placements are the same BOM item only if they are instances of the same file (and configuration). The BOM must come from the assembly structure, never from a hand-written list or from comparing shapes.
- Before reporting a BOM, check that the instance counts match the planned tree. A part that shows up as several one-off items is a sign that it was copied rather than instanced.

## 2. Sketches carry the design intent

Use a sketch whenever a feature's shape or position expresses a design decision. Positioned primitives (a cylinder cut at typed coordinates) hide that decision in numbers nobody can read later.

- **Primitives are acceptable only for** the first stock shape of a simple part (a block, a rod) and for throwaway envelope or keep-out bodies. Everything positioned relative to something else comes from a sketch.
- **Every sketch is fully constrained** before it is used: zero degrees of freedom, confirmed with the tool's solver report. Nothing may be left floating at the position it happened to be drawn.
- **Dimension to what matters functionally:** the mating edge, the axis, the centreline, the origin. Do not dimension to whatever edge is nearest. A hole that must sit 8 mm from the mounting edge is dimensioned 8 mm from that edge.
- **Use geometric constraints before dimensions:** symmetric, concentric, equal, coincident, horizontal, vertical, tangent. Four equal holes symmetric about a centreline need one diameter and two spacings, not four diameters and eight coordinates.
- **Use named parameters** for any value that appears in more than one place or that the user is likely to tune (plate thickness, bolt circle, clearance). A typed number never follows a later change.
- **Sketch on the face or plane the feature belongs to,** and reference existing geometry by projecting it, so the feature follows when the part changes.

## 3. Holes

- **Positions come from one sketch per hole group.** A group is a set of holes with one purpose: a motor bolt circle, the four corner mounting holes, a row of vents. Place sketch points (or circles) for the group, fully constrained, then cut the whole group with a single feature.
- **Do not create one cut per hole,** and never type hole coordinates into a cut feature.
- **Keep separate groups in separate sketches and features,** even on the same face. Each group can then be edited, suppressed or re-patterned without touching the others. One sketch holding every hole on a face is as hard to edit as none.
- **Use the tool's hole feature driven by the sketch points when it has one,** in preference to a plain extruded cut. The hole feature records clearance fit, thread, counterbore and countersink, which drawings and the BOM need. Use an extruded cut only for openings that are not fastener holes or when no hole feature exists.
- **Mating patterns share one source.** When two parts bolt together, both patterns are driven by the same parameters or by the projected interface of the purchased component, never typed twice.
- **Model a hole at the size it is cut, when a later operation finishes it.** A precision hole that is reamed after laser cutting or drilling (a pin or shaft fit such as 5 H7) is modelled undersize by a named allowance (for example `ream_stock`, 0.2 mm), so the cut file carries the right size and the workshop does not have to be told to change it. Write the finished size and fit in the part's description (for example "cut 4.8, reamed 5 H7") and in a comment at the hole. The pin then overlaps the hole by the allowance in clash checks; report that overlap as intended. Tapped holes are the exception: the hole feature's thread already records the tap drill.

## 4. Patterns and mirrors

When geometry repeats regularly, model one and pattern it. Typed-out repeats are an error.

- **Circular pattern** for anything spaced around an axis: bolt circles, spokes, vents.
- **Linear or rectangular pattern** for rows and grids.
- **Mirror** for anything symmetric about a plane, in the sketch or as a feature.
- Count, spacing and angle are parameters or expressions, so the pattern can be changed in one place.
- Pattern at the level that matches the intent: sketch entities for a hole group cut by one feature, features for repeated bosses or pockets, component instances for repeated parts in an assembly (screws around a flange).
- An irregular set (positions with no rule) is not a pattern. Dimension each position in the sketch instead.

## 5. Check before reporting

Before saying a model is done, confirm and report:

1. The assembly tree matches the plan: every repeated item is an instance, with the expected count.
2. Every sketch has zero degrees of freedom.
3. No feature is positioned by typed coordinates where a sketch, constraint or parameter should drive it.
4. Changing a key parameter (a thickness, a bolt circle, a link length) rebuilds without errors and moves everything that depends on it.
5. Every part placed on both sides is its own mirror image about its stated plane (mirror the body, intersect it with the original, compare volumes), and no placement in an assembly is a mirrored one.
6. A clash check on each assembly: list every pair of parts that overlap, and say which overlaps are intended (a press fit, a thread) and which are errors.
7. Any rule above that could not be followed, with the reason.
