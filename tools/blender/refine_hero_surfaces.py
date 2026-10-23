"""Small, deterministic surface refinements on the locked street's existing mesh.

No object transforms, footprints, cameras, or source GLBs are edited. Run before
UV1 generation so the irradiance follows the final geometry.
"""
import bmesh
import math
from mathutils import Vector


def islands(bm, ids, kind):
    pending = {v for f in bm.faces if ids[f.material_index] == kind for v in f.verts}
    groups = []
    while pending:
        seed = pending.pop()
        group, todo = {seed}, [seed]
        while todo:
            for edge in todo.pop().link_edges:
                for vertex in edge.verts:
                    if vertex in pending:
                        pending.remove(vertex); group.add(vertex); todo.append(vertex)
        groups.append(group)
    return groups


def bounds(group):
    lo = Vector(tuple(min(v.co[a] for v in group) for a in range(3)))
    hi = Vector(tuple(max(v.co[a] for v in group) for a in range(3)))
    return lo, hi, hi-lo


def eligible(span, kind):
    if kind == 'linen': return sorted(span)[1] >= .15
    return min(span.x, span.y) >= .08 and span.z >= .08 and max(span.x, span.y)/min(span.x, span.y) <= 1.2


def refine_surfaces(obj, material_id):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.normal_update()
    ids = {i: material_id(m.name) for i, m in enumerate(obj.data.materials)}
    # Round only architectural hard edges; leave open plaster skins and all
    # ground, door openings and thin trim untouched.
    edges = [e for e in bm.edges if e.is_manifold and e.calc_length() > .12
             and all(ids[f.material_index] == 'plaster' for f in e.link_faces)
             and e.calc_face_angle() > math.radians(38)]
    if edges:
        bmesh.ops.bevel(bm, geom=edges, offset=.018, segments=3,
                        affect='EDGES', clamp_overlap=True)
    # Keep support endpoints fixed while breaking the ruler-straight silhouette.
    for verts in islands(bm, ids, 'wood'):
        lo, hi, span = bounds(verts)
        axis = max(range(3), key=lambda a: span[a])
        if span[axis] < .4 or sorted(span)[1] > .3: continue
        for v in verts:
            t = (v.co[axis]-lo[axis])/span[axis]
            for a in range(3):
                if a != axis:
                    v.co[a] += .006*math.sin(math.pi*t)*math.sin(7*t+lo[axis]+a)
    # Work per connected cloth/pottery island, preserving its original frame.
    for kind in ('linen', 'pottery'):
        edges = set()
        for group in islands(bm, ids, kind):
            if eligible(bounds(group)[2], kind):
                edges.update(e for v in group for e in v.link_edges if all(w in group for w in e.verts))
        # A topology operation may invalidate references anywhere in BMesh.
        # Subdivide once, then collect fresh islands before deforming them.
        bm.edges.index_update()
        if edges:
            bmesh.ops.subdivide_edges(bm, edges=sorted(edges, key=lambda e: e.index), cuts=3 if kind == 'linen' else 1, use_grid_fill=True)
        for verts in islands(bm, ids, kind):
            lo, hi, span = bounds(verts)
            if not eligible(span, kind): continue
            if kind == 'linen':
                axes = sorted(range(3), key=lambda a: span[a], reverse=True)
                a, b, normal_axis = axes
                if span[b] < .15: continue
                for v in verts:
                    u = (v.co[a]-lo[a])/span[a]
                    w = (v.co[b]-lo[b])/span[b]
                    # Zero at panel corners; centimetre-scale hanging folds.
                    envelope = math.sin(math.pi*u)*(.35+.65*math.sin(math.pi*w))
                    v.co[normal_axis] += envelope*(.028*math.sin(u*math.pi*8+w*2) + .012*math.sin(w*math.pi*5))
                    if normal_axis == 2:
                        v.co.z -= .18*math.sin(math.pi*u)*math.sin(math.pi*w)
                    # Raised stitched hems stay inside the existing cloth panel.
                    edge = min(u, 1-u)
                    v.co[normal_axis] += .004*math.exp(-(edge/.035)**2)*math.sin(math.pi*w)
                for v in verts:
                    for f in v.link_faces: f.smooth = True
            else:
                # Refine round, upright vessels only (exclude flat clay shards).
                if min(span.x, span.y) < .08 or span.z < .08 or max(span.x, span.y)/min(span.x, span.y) > 1.2: continue
                center = (lo+hi)*.5
                for v in verts:
                    t = (v.co.z-lo.z)/span.z
                    # Gentle thrown-clay belly, no change to base or rim anchors.
                    bulge = .018*math.sin(math.pi*t)**2
                    radial = Vector((v.co.x-center.x, v.co.y-center.y, 0))
                    if radial.length > .03: v.co += radial.normalized()*bulge
                bm.normal_update()
                for v in verts:
                    for f in v.link_faces:
                        f.smooth = abs(f.normal.z) < .85
    # Real thickness on existing cloth makes oblique views read as fabric.
    cloth = [f for f in bm.faces if ids[f.material_index] == 'linen']
    if cloth:
        old_faces=set(bm.faces)
        linen_index=cloth[0].material_index
        bmesh.ops.solidify(bm, geom=cloth, thickness=.003)
        for face in bm.faces:
            if face not in old_faces: face.material_index=linen_index
    # Soften the existing vessel lips instead of adding disconnected ring props.
    bm.normal_update()
    rims = [e for e in bm.edges if e.is_manifold and all(ids[f.material_index]=='pottery' for f in e.link_faces)
            and e.calc_face_angle() > math.radians(45) and e.calc_length() > .015]
    if rims: bmesh.ops.bevel(bm, geom=rims, offset=.004, segments=2, affect='EDGES', clamp_overlap=True)
    bm.normal_update()
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
