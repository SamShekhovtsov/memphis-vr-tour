"""Foreground finish pass. All masks are in the original Blender world frame.

Only existing surfaces are refined; no object roots or collision meshes change.
Colour is glTF COLOR_0, with opaque white everywhere outside the finish mask.
"""
import math
import bmesh


def foreground(p):
    return 10.5 <= p.y <= 19.2


def finish_foreground(bm, obj, ids):
    world = obj.matrix_world
    colour = bm.loops.layers.float_color.new('HeroFinish')
    for face in bm.faces:
        for loop in face.loops:
            loop[colour] = (1, 1, 1, 1)
    # Existing plaster skins only: avoid roof masses, thresholds and reveals.
    selected = [f for f in bm.faces if ids[f.material_index] == 'plaster'
                and foreground(world @ f.calc_center_median())
                and abs(f.normal.x) > .94
                and ((-15.1 < (world @ f.calc_center_median()).x < -14.2)
                     or (-6.4 < (world @ f.calc_center_median()).x < -5.4))]
    edges = {e for f in selected for e in f.edges}
    # Preserve every original perimeter vertex and opening. Only the new
    # interior samples acquire shallow hand-applied undulations.
    original = set(bm.verts)
    if edges:
        bm.edges.index_update()
        bmesh.ops.subdivide_edges(bm, edges=sorted(edges,key=lambda e:e.index), cuts=2, use_grid_fill=True)
    bm.normal_update()
    for vertex in bm.verts:
        p = world @ vertex.co
        if vertex in original or not foreground(p):
            continue
        if not all(ids[f.material_index] == 'plaster' for f in vertex.link_faces):
            continue
        if abs(vertex.normal.x) < .94:
            continue
        # Inward only, maximum 7mm; silhouette and wall envelope stay fixed.
        if not ((-15.1 < p.x < -14.2) or (-6.4 < p.x < -5.4)):
            continue
        depth = .0035 * (1 + math.sin(p.y*4.1 + math.sin(p.z*5.3)))
        vertex.co -= vertex.normal * depth
    for face in bm.faces:
        sid = ids[face.material_index]
        p = world @ face.calc_center_median()
        if not foreground(p):
            continue
        if sid == 'plaster' and abs(face.normal.x) > .90 and (
                -15.1 < p.x < -14.2 or -6.4 < p.x < -5.4):
            for loop in face.loops:
                q = world @ loop.vert.co
                # Broad unique repair patches and splash wear; no painted AO.
                broad = math.sin(q.y*1.7 + math.sin(q.z*2.7))*math.sin(q.z*3.4 + q.y*.7)
                base = math.exp(-max(0, q.z)/.30)
                wear = .035 * broad
                loop[colour] = (1 + wear - .16*base,
                                .985 + wear - .20*base,
                                .95 + wear - .24*base, 1)
        elif sid in ('pottery', 'wood'):
            for loop in face.loops:
                q = world @ loop.vert.co
                variation = .035*math.sin(q.z*21 + q.y*2.1) + .025*math.sin(q.x*11)
                loop[colour] = (1+variation, .98+variation, .95+variation, 1)
    bm.normal_update()
