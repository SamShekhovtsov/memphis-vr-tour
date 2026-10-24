"""Small, deterministic surface refinements on the locked street's existing mesh.

No object transforms, footprints, cameras, or source GLBs are edited. Run before
UV1 generation so the irradiance follows the final geometry.
"""
import bmesh
import math
from mathutils import Vector
from refine_hero_foreground import finish_foreground, foreground


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
        front = [e for e in edges if foreground(obj.matrix_world @ ((e.verts[0].co+e.verts[1].co)*.5))]
        front_set = set(front)
        other = [e for e in edges if e not in front_set]
        if other:
            bmesh.ops.bevel(bm, geom=other, offset=.018, segments=3,
                            affect='EDGES', clamp_overlap=True)
        # Existing foreground wall masses, jambs and roof trim retain their
        # bounding envelope but catch a broader, worn highlight at the edges.
        front = [e for e in front if e.is_valid]
        if front:
            bmesh.ops.bevel(bm, geom=front, offset=.035, segments=4,
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
                    front = foreground(obj.matrix_world @ ((lo+hi)*.5))
                    if front:
                        # Broad hanging belly plus folds radiating from the
                        # four fixed supports; tension relaxes into the centre.
                        belly = math.sin(math.pi*u)*math.sin(math.pi*w)
                        corner = min(math.hypot(u,w), math.hypot(1-u,w),
                                     math.hypot(u,1-w), math.hypot(1-u,1-w))
                        folds = .018*math.sin(corner*math.pi*15)*math.exp(-corner*4)
                        v.co[normal_axis] += envelope*(folds + .009*math.sin(u*math.pi*3+w*4))
                        if normal_axis == 2:
                            v.co.z -= (.24 if span[b] > 2 else .12)*belly
                    else:
                        v.co[normal_axis] += envelope*(.028*math.sin(u*math.pi*8+w*2) + .012*math.sin(w*math.pi*5))
                        if normal_axis == 2:
                            v.co.z -= .18*math.sin(math.pi*u)*math.sin(math.pi*w)
                    # Raised stitched hems stay inside the existing cloth panel.
                    edge = min(u, 1-u)
                    v.co[normal_axis] += .004*math.exp(-(edge/.035)**2)*math.sin(math.pi*w)
                    if front:
                        edge_w = min(w,1-w)
                        v.co[normal_axis] += .004*math.exp(-(edge_w/.035)**2)*math.sin(math.pi*u)
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
    front_rims = [e for e in rims if foreground(obj.matrix_world @ ((e.verts[0].co+e.verts[1].co)*.5))]
    front_set = set(front_rims)
    other_rims = [e for e in rims if e not in front_set]
    if other_rims: bmesh.ops.bevel(bm, geom=other_rims, offset=.004, segments=2, affect='EDGES', clamp_overlap=True)
    front_rims = [e for e in front_rims if e.is_valid]
    if front_rims: bmesh.ops.bevel(bm, geom=front_rims, offset=.007, segments=3, affect='EDGES', clamp_overlap=True)
    bm.normal_update()
    timber_edges = [e for e in bm.edges if e.is_manifold and e.calc_length()>.04
                    and all(ids[f.material_index]=='wood' for f in e.link_faces)
                    and foreground(obj.matrix_world @ ((e.verts[0].co+e.verts[1].co)*.5))
                    and e.calc_face_angle()>math.radians(45)]
    if timber_edges: bmesh.ops.bevel(bm, geom=timber_edges, offset=.003, segments=2, affect='EDGES', clamp_overlap=True)
    finish_foreground(bm, obj, ids)
    # Reuse all original material slots outside the bounded finish pass.
    variants = {}
    for face in bm.faces:
        p = obj.matrix_world @ face.calc_center_median()
        sid = ids[face.material_index]
        selected = foreground(p) and (sid == 'linen' or (sid == 'plaster'
                   and abs(face.normal.x) > .90 and
                   (-15.1 < p.x < -14.2 or -6.4 < p.x < -5.4)))
        if not selected: continue
        original_index = face.material_index
        if original_index not in variants:
            mat = obj.data.materials[original_index].copy()
            mat.name = 'hero-finish-' + sid + '-' + mat.name
            obj.data.materials.append(mat)
            variants[original_index] = len(obj.data.materials)-1
        face.material_index = variants[original_index]
    bm.normal_update()
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
