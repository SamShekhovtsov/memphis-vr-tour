"""Generate the first modular GLB asset kit for the Memphis browser tour.

The meshes in this script are project-authored procedural reconstructions.
They are intentionally modest-poly so the current laptop-browser MVP can load
them while Babylon assembles the world.
"""

from __future__ import annotations

import json
import math
import random
from datetime import date
from pathlib import Path

import bpy
from mathutils import Vector


ROOT_DIR = Path(__file__).resolve().parents[2]
OUT_DIR = ROOT_DIR / "apps" / "web-tour" / "public" / "assets" / "generated" / "glb"

ASSETS = [
    {
        "id": "nile-boat-large",
        "fileName": "nile_boat_large.glb",
        "label": "Detailed Nile arrival cargo boat",
        "category": "nile-arrival",
        "evidenceLevel": "inferred",
        "runtimeAssetId": "generated-modular-glb-kit-nile-arrival",
        "referenceSourceIds": ["met-open-access", "natural-earth", "unesco-memphis-necropolis"],
        "notes": [
            "Project-authored hull, ribs, mast, sail, rope, oars, jars, and cargo.",
            "Broadly inspired by Nile craft and riverine material culture; not copied from source media."
        ],
    },
    {
        "id": "date-palm-cluster",
        "fileName": "date_palm_cluster.glb",
        "label": "Date palm and bank vegetation cluster",
        "category": "nile-arrival",
        "evidenceLevel": "inferred",
        "runtimeAssetId": "generated-modular-glb-kit-nile-arrival",
        "referenceSourceIds": ["met-open-access", "natural-earth"],
        "notes": [
            "Project-authored segmented trunks, fronds, fruit clusters, and small undergrowth.",
            "Designed as repeated bank vegetation for the Nile arrival scene."
        ],
    },
    {
        "id": "reed-bank-cluster",
        "fileName": "reed_bank_cluster.glb",
        "label": "Dense Nile reed bank cluster",
        "category": "nile-arrival",
        "evidenceLevel": "inferred",
        "runtimeAssetId": "generated-modular-glb-kit-nile-arrival",
        "referenceSourceIds": ["natural-earth", "unesco-memphis-necropolis"],
        "notes": [
            "Project-authored reeds, seed heads, bank grasses, and wet-bank silhouettes.",
            "Used to soften the water edge and add parallax detail."
        ],
    },
    {
        "id": "hero-street-corridor",
        "fileName": "hero_street_corridor.glb",
        "label": "Authored dense hero street corridor",
        "category": "residential-street",
        "evidenceLevel": "inferred",
        "runtimeAssetId": "generated-modular-glb-kit-residential-street",
        "referenceSourceIds": ["aera-memphis", "sfar-kom-el-fakhry", "petrie-memphis-i", "met-open-access", "cleveland-open-access"],
        "notes": [
            "Project-authored two-row mudbrick street corridor with inward-facing facades.",
            "Includes worn doors, small windows, awnings, roof clutter, plaster patches, cracks, pottery, baskets, sacks, straw, stones, and work surfaces.",
            "Layout follows docs/design/memphis-hero-district-plan.md and avoids overlapping architecture systems."
        ],
    },
    {
        "id": "mudbrick-house-cluster",
        "fileName": "mudbrick_house_cluster.glb",
        "label": "Mudbrick residential house cluster",
        "category": "residential-street",
        "evidenceLevel": "inferred",
        "runtimeAssetId": "generated-modular-glb-kit-residential-street",
        "referenceSourceIds": ["aera-memphis", "sfar-kom-el-fakhry", "petrie-memphis-i", "met-open-access"],
        "notes": [
            "Project-authored compact houses, parapets, stairs, doors, niches, plaster bands, and painted panels.",
            "Uses Kom el-Fakhry / Mit Rahina only as human-reference context."
        ],
    },
    {
        "id": "residential-market-details",
        "fileName": "residential_market_details.glb",
        "label": "Residential street props and awning details",
        "category": "residential-street",
        "evidenceLevel": "inferred",
        "runtimeAssetId": "generated-modular-glb-kit-residential-street",
        "referenceSourceIds": ["met-open-access", "cleveland-open-access", "petrie-memphis-i"],
        "notes": [
            "Project-authored jars, baskets, mats, awnings, ropes, benches, crates, and small vessels.",
            "Decorative density pass for the living-city route."
        ],
    },
    {
        "id": "animated-street-actors",
        "fileName": "animated_street_actors.glb",
        "label": "Animated early Memphis street actors",
        "category": "residential-street",
        "evidenceLevel": "speculative",
        "runtimeAssetId": "generated-modular-glb-kit-residential-street",
        "referenceSourceIds": ["met-old-kingdom-cattle-relief", "met-open-access", "tla-earlier-egyptian-hf"],
        "notes": [
            "Project-authored articulated GLB figures with walking, carrying, idle, and work-loop object animation.",
            "Clothing is intentionally restrained: plain linen kilts and sheath-like linen garments suitable for an Old Kingdom visual direction.",
            "This is a first browser-safe character pass; future work should replace it with expert-reviewed skeletal character rigs."
        ],
    },
    {
        "id": "street-npc-placeholders",
        "fileName": "street_npc_placeholders.glb",
        "label": "Improved low-poly Memphis inhabitant placeholders",
        "category": "residential-street",
        "evidenceLevel": "speculative",
        "runtimeAssetId": "generated-modular-glb-kit-residential-street",
        "referenceSourceIds": ["met-old-kingdom-cattle-relief", "met-open-access", "tla-earlier-egyptian-hf"],
        "notes": [
            "Project-authored silhouettes for ambience only.",
            "Clothing and poses remain placeholders until a dedicated character pass."
        ],
    },
]


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    bpy.context.scene.render.engine = "BLENDER_EEVEE"
    bpy.context.scene.unit_settings.system = "METRIC"


def make_material(name: str, color: tuple[float, float, float, float], roughness: float = 0.9) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = False
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = 0.0
    return material


def create_materials() -> dict[str, bpy.types.Material]:
    return {
        "mudbrick": make_material("sun baked mudbrick", (0.58, 0.39, 0.22, 1), 0.96),
        "plaster": make_material("chalky white plaster", (0.88, 0.82, 0.66, 1), 0.94),
        "limestone": make_material("worn pale limestone", (0.74, 0.66, 0.49, 1), 0.88),
        "wood": make_material("dark acacia wood", (0.32, 0.18, 0.09, 1), 0.82),
        "reed": make_material("river reed green", (0.32, 0.46, 0.20, 1), 0.92),
        "dry_reed": make_material("dry reed straw", (0.72, 0.58, 0.29, 1), 0.94),
        "linen": make_material("sun bleached linen", (0.92, 0.84, 0.62, 1), 0.9),
        "dark": make_material("deep doorway shadow", (0.08, 0.055, 0.035, 1), 0.98),
        "paint_blue": make_material("mineral blue paint", (0.09, 0.31, 0.52, 1), 0.85),
        "paint_red": make_material("red ochre paint", (0.62, 0.19, 0.10, 1), 0.88),
        "paint_gold": make_material("warm ochre paint", (0.86, 0.58, 0.22, 1), 0.88),
        "skin": make_material("warm figure skin", (0.58, 0.34, 0.18, 1), 0.9),
        "hair": make_material("dark hair", (0.04, 0.028, 0.02, 1), 0.92),
    }


def soften(obj: bpy.types.Object, width: float = 0.025, segments: int = 1) -> bpy.types.Object:
    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True

    if width > 0:
        bevel = obj.modifiers.new("soft edge bevel", "BEVEL")
        bevel.width = width
        bevel.segments = segments
    normals = obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    normals.keep_sharp = True
    return obj


def cube(
    name: str,
    loc: tuple[float, float, float],
    dims: tuple[float, float, float],
    material: bpy.types.Material,
    rot: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0.015,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    return soften(obj, bevel)


def cylinder(
    name: str,
    loc: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    vertices: int = 16,
    rot: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rot)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    if bevel:
        soften(obj, bevel)
    return obj


def cone(
    name: str,
    loc: tuple[float, float, float],
    radius_bottom: float,
    radius_top: float,
    depth: float,
    material: bpy.types.Material,
    vertices: int = 16,
    rot: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0.008,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cone_add(
        vertices=vertices,
        radius1=radius_bottom,
        radius2=radius_top,
        depth=depth,
        location=loc,
        rotation=rot,
    )
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(material)
    return soften(obj, bevel)


def uv_sphere(
    name: str,
    loc: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    scale: tuple[float, float, float] = (1, 1, 1),
    segments: int = 16,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=8, radius=radius, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(material)
    return soften(obj, 0.004)


def cylinder_between(
    name: str,
    start: tuple[float, float, float],
    end: tuple[float, float, float],
    radius: float,
    material: bpy.types.Material,
    vertices: int = 10,
) -> bpy.types.Object:
    start_v = Vector(start)
    end_v = Vector(end)
    direction = end_v - start_v
    midpoint = start_v + direction * 0.5
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=midpoint)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()
    obj.data.materials.append(material)
    return obj


def vertical_panel(
    name: str,
    loc: tuple[float, float, float],
    width: float,
    height: float,
    material: bpy.types.Material,
    rot: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    half_w = width * 0.5
    half_h = height * 0.5
    mesh.from_pydata(
        [(-half_w, 0, -half_h), (half_w, 0, -half_h), (half_w, 0, half_h), (-half_w, 0, half_h)],
        [],
        [(0, 1, 2, 3)],
    )
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    obj.data.materials.append(material)
    return obj


def flat_panel(
    name: str,
    loc: tuple[float, float, float],
    width: float,
    depth: float,
    material: bpy.types.Material,
    rot: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    half_w = width * 0.5
    half_d = depth * 0.5
    mesh.from_pydata(
        [(-half_w, -half_d, 0), (half_w, -half_d, 0), (half_w, half_d, 0), (-half_w, half_d, 0)],
        [],
        [(0, 1, 2, 3)],
    )
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    obj.data.materials.append(material)
    return obj


def make_hull(name: str, material: bpy.types.Material) -> bpy.types.Object:
    stations = [
        (-4.2, 0.30, 0.08),
        (-3.0, 0.82, -0.02),
        (-1.2, 1.08, -0.08),
        (1.2, 1.08, -0.08),
        (3.0, 0.82, -0.02),
        (4.2, 0.30, 0.08),
    ]
    verts = []
    for y, half_width, bottom_z in stations:
        verts.extend(
            [
                (-half_width, y, 0.36),
                (half_width, y, 0.36),
                (-half_width * 0.45, y, bottom_z),
                (half_width * 0.45, y, bottom_z),
            ]
        )

    faces = []
    for index in range(len(stations) - 1):
        offset = index * 4
        nxt = offset + 4
        faces.extend(
            [
                (offset, nxt, nxt + 2, offset + 2),
                (offset + 1, offset + 3, nxt + 3, nxt + 1),
                (offset + 2, nxt + 2, nxt + 3, offset + 3),
                (offset, offset + 1, nxt + 1, nxt),
            ]
        )
    faces.extend([(0, 2, 3, 1), (20, 21, 23, 22)])

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return soften(obj, 0.035, 2)


def make_jar(name: str, loc: tuple[float, float, float], material: bpy.types.Material, scale: float = 1) -> None:
    cone(f"{name}-body", loc, 0.23 * scale, 0.18 * scale, 0.52 * scale, material, 18, bevel=0.006)
    cylinder(f"{name}-neck", (loc[0], loc[1], loc[2] + 0.34 * scale), 0.105 * scale, 0.18 * scale, material, 14)
    cylinder(f"{name}-rim", (loc[0], loc[1], loc[2] + 0.45 * scale), 0.14 * scale, 0.035 * scale, material, 14)


def make_basket(name: str, loc: tuple[float, float, float], materials: dict[str, bpy.types.Material], scale: float = 1) -> None:
    cone(f"{name}-basket", loc, 0.31 * scale, 0.40 * scale, 0.38 * scale, materials["dry_reed"], 18)
    cylinder(f"{name}-rim", (loc[0], loc[1], loc[2] + 0.2 * scale), 0.41 * scale, 0.035 * scale, materials["wood"], 20)
    for offset in (-0.18, 0.18):
        cylinder_between(
            f"{name}-handle-{offset}",
            (loc[0] + offset * scale, loc[1] - 0.34 * scale, loc[2] + 0.18 * scale),
            (loc[0] + offset * scale, loc[1] + 0.34 * scale, loc[2] + 0.18 * scale),
            0.014 * scale,
            materials["wood"],
            8,
        )


def build_nile_boat_large(materials: dict[str, bpy.types.Material]) -> None:
    make_hull("nileBoatHull", materials["wood"])
    cube("boatCenterDeck", (0, 0, 0.42), (1.4, 4.8, 0.08), materials["dry_reed"], bevel=0.01)
    cylinder("boatKeel", (0, 0, -0.04), 0.05, 8.1, materials["wood"], 10, rot=(math.pi / 2, 0, 0))

    for y in [-3.2, -2.2, -1.2, 0, 1.2, 2.2, 3.2]:
        cube(f"boatCrossRib-{y}", (0, y, 0.48), (2.0 - abs(y) * 0.22, 0.07, 0.12), materials["wood"], bevel=0.01)
        cylinder_between(f"boatLeftRailPost-{y}", (-0.92, y, 0.42), (-1.0, y, 0.86), 0.025, materials["wood"], 8)
        cylinder_between(f"boatRightRailPost-{y}", (0.92, y, 0.42), (1.0, y, 0.86), 0.025, materials["wood"], 8)

    cylinder_between("leftHullRail", (-0.82, -3.65, 0.82), (-0.82, 3.65, 0.82), 0.035, materials["wood"], 10)
    cylinder_between("rightHullRail", (0.82, -3.65, 0.82), (0.82, 3.65, 0.82), 0.035, materials["wood"], 10)
    cylinder("boatMast", (0, -0.2, 1.85), 0.055, 2.7, materials["wood"], 12)
    cylinder_between("boatYard", (-1.02, -0.2, 2.72), (1.02, -0.2, 2.72), 0.032, materials["wood"], 10)
    cylinder_between("boatBoom", (-0.82, -0.2, 1.32), (0.82, -0.2, 1.32), 0.026, materials["wood"], 10)
    vertical_panel("linenSail", (0, -0.2, 2.02), 1.72, 1.35, materials["linen"], rot=(0, 0, 0.03))
    cylinder_between("sailLeftRope", (-0.82, -0.2, 1.34), (0, -0.2, 2.96), 0.012, materials["dry_reed"], 8)
    cylinder_between("sailRightRope", (0.82, -0.2, 1.34), (0, -0.2, 2.96), 0.012, materials["dry_reed"], 8)

    for index, x in enumerate([-1.05, 1.05]):
        for y in [-2.8, -1.8, 1.6, 2.6]:
            cylinder_between(f"oar-{index}-{y}", (x * 0.58, y, 0.62), (x * 1.85, y + 0.4, 0.2), 0.025, materials["wood"], 8)
            cube(f"oarBlade-{index}-{y}", (x * 1.97, y + 0.45, 0.15), (0.38, 0.08, 0.16), materials["wood"], bevel=0.01)

    for index, (x, y) in enumerate([(-0.42, -2.55), (0.32, -2.38), (-0.28, 2.48), (0.35, 2.2)]):
        make_jar(f"boatCargoJar-{index}", (x, y, 0.78), materials["mudbrick"], 0.72)

    for index, y in enumerate([-0.9, 0.65]):
        make_basket(f"boatBasket-{index}", (0.42, y, 0.74), materials, 0.72)
    cube("reedCargoBundleA", (-0.42, 0.95, 0.72), (0.45, 1.3, 0.26), materials["dry_reed"], rot=(0, 0, 0.1), bevel=0.02)
    cube("reedCargoBundleB", (0.28, 1.2, 0.88), (0.38, 1.0, 0.18), materials["dry_reed"], rot=(0, 0, -0.08), bevel=0.02)


def make_palm(name: str, loc: tuple[float, float, float], materials: dict[str, bpy.types.Material], scale: float) -> None:
    random.seed(name)
    height = 4.4 * scale
    for segment in range(9):
        z = loc[2] + segment * height / 9
        radius = (0.20 - segment * 0.008) * scale
        cylinder(
            f"{name}-trunk-{segment}",
            (loc[0] + math.sin(segment * 0.7) * 0.05, loc[1], z + height / 18),
            radius,
            height / 8.5,
            materials["wood"],
            9,
            rot=(0.02 * math.sin(segment), 0.03 * math.cos(segment), 0),
        )

    crown_z = loc[2] + height
    for leaf in range(16):
        angle = (math.tau * leaf) / 16
        leaf_len = random.uniform(1.7, 2.35) * scale
        leaf_width = random.uniform(0.22, 0.34) * scale
        x = loc[0] + math.cos(angle) * leaf_len * 0.35
        y = loc[1] + math.sin(angle) * leaf_len * 0.35
        frond = flat_panel(
            f"{name}-frond-{leaf}",
            (x, y, crown_z - 0.08 * scale),
            leaf_width,
            leaf_len,
            materials["reed"],
            rot=(math.radians(65), 0.12 * math.sin(angle), angle),
        )
        frond.scale.y = 1 + random.uniform(-0.08, 0.08)

    for fruit in range(10):
        angle = random.uniform(0, math.tau)
        uv_sphere(
            f"{name}-date-{fruit}",
            (
                loc[0] + math.cos(angle) * 0.25 * scale,
                loc[1] + math.sin(angle) * 0.25 * scale,
                crown_z - random.uniform(0.25, 0.7) * scale,
            ),
            0.055 * scale,
            materials["paint_gold"],
            scale=(1, 1, 1.35),
            segments=8,
        )


def build_date_palm_cluster(materials: dict[str, bpy.types.Material]) -> None:
    make_palm("palmA", (-1.1, -0.8, 0), materials, 1.0)
    make_palm("palmB", (1.2, 0.4, 0), materials, 0.86)
    make_palm("palmC", (0.1, 1.6, 0), materials, 0.72)
    for index in range(12):
        x = random.uniform(-2.1, 2.0)
        y = random.uniform(-1.7, 2.2)
        cylinder(
            f"lowBankPlant-{index}",
            (x, y, 0.22),
            random.uniform(0.025, 0.045),
            random.uniform(0.38, 0.72),
            materials["reed"],
            7,
            rot=(random.uniform(-0.25, 0.25), random.uniform(-0.25, 0.25), 0),
        )


def build_reed_bank_cluster(materials: dict[str, bpy.types.Material]) -> None:
    random.seed("reed-bank")
    for index in range(72):
        x = random.uniform(-1.6, 1.6)
        y = random.uniform(-3.8, 3.8)
        height = random.uniform(0.55, 1.45)
        lean_x = random.uniform(-0.18, 0.18)
        lean_y = random.uniform(-0.18, 0.18)
        cylinder_between(
            f"reedStem-{index}",
            (x, y, 0.02),
            (x + lean_x, y + lean_y, height),
            random.uniform(0.01, 0.018),
            materials["reed"],
            6,
        )
        if index % 3 == 0:
            uv_sphere(
                f"reedSeedHead-{index}",
                (x + lean_x, y + lean_y, height + 0.06),
                0.055,
                materials["dry_reed"],
                scale=(0.65, 0.65, 1.6),
                segments=8,
            )
    for index in range(9):
        flat_panel(
            f"bankGrassBlade-{index}",
            (random.uniform(-1.4, 1.4), random.uniform(-3.5, 3.5), 0.18),
            0.18,
            random.uniform(0.8, 1.4),
            materials["reed"],
            rot=(math.radians(70), random.uniform(-0.25, 0.25), random.uniform(0, math.tau)),
        )


def make_house(
    name: str,
    loc: tuple[float, float, float],
    dims: tuple[float, float, float],
    materials: dict[str, bpy.types.Material],
) -> None:
    x, y, z = loc
    width, depth, height = dims
    cube(f"{name}-body", (x, y, z + height * 0.5), dims, materials["mudbrick"], bevel=0.035)
    cube(f"{name}-plasterFace", (x, y - depth * 0.505, z + height * 0.58), (width * 0.92, 0.035, height * 0.58), materials["plaster"], bevel=0.008)
    cube(f"{name}-roofParapetFront", (x, y - depth * 0.5, z + height + 0.18), (width, 0.2, 0.36), materials["mudbrick"], bevel=0.02)
    cube(f"{name}-roofParapetBack", (x, y + depth * 0.5, z + height + 0.18), (width, 0.2, 0.36), materials["mudbrick"], bevel=0.02)
    cube(f"{name}-roofParapetLeft", (x - width * 0.5, y, z + height + 0.18), (0.2, depth, 0.36), materials["mudbrick"], bevel=0.02)
    cube(f"{name}-roofParapetRight", (x + width * 0.5, y, z + height + 0.18), (0.2, depth, 0.36), materials["mudbrick"], bevel=0.02)
    cube(f"{name}-doorShadow", (x - width * 0.18, y - depth * 0.525, z + 0.62), (0.72, 0.05, 1.24), materials["dark"], bevel=0.008)
    cube(f"{name}-doorLintel", (x - width * 0.18, y - depth * 0.555, z + 1.28), (0.92, 0.08, 0.16), materials["limestone"], bevel=0.008)
    for side in [-1, 1]:
        cube(f"{name}-window-{side}", (x + side * width * 0.27, y - depth * 0.53, z + height * 0.64), (0.36, 0.045, 0.45), materials["dark"], bevel=0.004)
    for stripe in range(3):
        color = [materials["paint_blue"], materials["paint_red"], materials["paint_gold"]][stripe % 3]
        cube(
            f"{name}-paintBand-{stripe}",
            (x + width * 0.24, y - depth * 0.56, z + 0.78 + stripe * 0.22),
            (0.85, 0.025, 0.055),
            color,
            bevel=0,
        )
    for stair in range(4):
        cube(
            f"{name}-stair-{stair}",
            (x + width * 0.36, y - depth * 0.59 - stair * 0.24, z + 0.08 + stair * 0.12),
            (0.9, 0.28, 0.16 + stair * 0.04),
            materials["limestone"],
            bevel=0.01,
        )


def build_mudbrick_house_cluster(materials: dict[str, bpy.types.Material]) -> None:
    make_house("houseA", (-2.1, 0.1, 0), (2.8, 2.4, 2.25), materials)
    make_house("houseB", (1.25, 0.55, 0), (2.4, 2.1, 1.85), materials)
    make_house("houseC", (-0.2, 3.0, 0), (3.4, 2.0, 2.65), materials)
    cube("alleyWallLeft", (-3.85, 1.8, 0.82), (0.26, 4.7, 1.64), materials["mudbrick"], bevel=0.025)
    cube("alleyWallRight", (3.05, 2.2, 0.72), (0.24, 4.2, 1.44), materials["mudbrick"], bevel=0.025)
    flat_panel("linenAwningA", (-0.95, -1.1, 2.32), 2.9, 1.45, materials["linen"], rot=(math.radians(10), 0, 0))
    cylinder_between("awningFrontPoleA", (-2.15, -1.82, 0.0), (-2.15, -1.82, 2.28), 0.035, materials["wood"], 8)
    cylinder_between("awningFrontPoleB", (0.25, -1.82, 0.0), (0.25, -1.82, 2.25), 0.035, materials["wood"], 8)
    cylinder_between("awningRope", (-2.15, -1.82, 2.28), (0.25, -1.82, 2.25), 0.014, materials["dry_reed"], 8)
    for index in range(7):
        make_jar(f"roofJar-{index}", (-2.9 + index * 0.42, 0.18, 2.48), materials["mudbrick"], 0.55)


def make_facade_house(
    name: str,
    center_x: float,
    center_y: float,
    depth: float,
    frontage: float,
    height: float,
    side_dir: int,
    materials: dict[str, bpy.types.Material],
    awning: bool,
) -> None:
    rng = random.Random(name)
    facade_x = center_x + side_dir * depth * 0.5

    cube(f"{name}-mudbrickMass", (center_x, center_y, height * 0.5), (depth, frontage, height), materials["mudbrick"], bevel=0.055)
    cube(
        f"{name}-facadePlaster",
        (facade_x + side_dir * 0.026, center_y, height * 0.54),
        (0.052, frontage * 0.9, height * 0.7),
        materials["plaster"],
        bevel=0.012,
    )
    cube(f"{name}-roofLipFront", (facade_x + side_dir * 0.08, center_y, height + 0.14), (0.28, frontage, 0.28), materials["mudbrick"], bevel=0.02)
    cube(f"{name}-roofLipBack", (center_x - side_dir * depth * 0.47, center_y, height + 0.14), (0.22, frontage, 0.28), materials["mudbrick"], bevel=0.02)
    cube(f"{name}-roofLipA", (center_x, center_y - frontage * 0.5, height + 0.14), (depth, 0.18, 0.28), materials["mudbrick"], bevel=0.02)
    cube(f"{name}-roofLipB", (center_x, center_y + frontage * 0.5, height + 0.14), (depth, 0.18, 0.28), materials["mudbrick"], bevel=0.02)

    door_y = center_y + rng.uniform(-frontage * 0.22, frontage * 0.22)
    cube(f"{name}-doorShadow", (facade_x + side_dir * 0.065, door_y, 0.72), (0.08, 0.78, 1.42), materials["dark"], bevel=0.008)
    cube(f"{name}-doorLintel", (facade_x + side_dir * 0.11, door_y, 1.46), (0.16, 1.02, 0.18), materials["wood"], bevel=0.006)
    cube(f"{name}-leftDoorJamb", (facade_x + side_dir * 0.11, door_y - 0.48, 0.72), (0.14, 0.12, 1.35), materials["wood"], bevel=0.006)
    cube(f"{name}-rightDoorJamb", (facade_x + side_dir * 0.11, door_y + 0.48, 0.72), (0.14, 0.12, 1.35), materials["wood"], bevel=0.006)

    for window_index in range(2):
        wy = center_y + (-0.33 + window_index * 0.66) * frontage
        if abs(wy - door_y) < 0.8:
            wy += 0.7
        cube(f"{name}-smallWindow-{window_index}", (facade_x + side_dir * 0.062, wy, height * 0.62), (0.07, 0.44, 0.42), materials["dark"], bevel=0.005)
        cube(f"{name}-windowFrame-{window_index}", (facade_x + side_dir * 0.105, wy, height * 0.62), (0.08, 0.58, 0.56), materials["wood"], bevel=0.004)

    for patch_index in range(4):
        py = center_y + rng.uniform(-frontage * 0.42, frontage * 0.42)
        pz = rng.uniform(0.45, height * 0.88)
        cube(
            f"{name}-plasterPatch-{patch_index}",
            (facade_x + side_dir * 0.082, py, pz),
            (0.035, rng.uniform(0.28, 0.78), rng.uniform(0.12, 0.38)),
            materials["plaster" if patch_index % 2 else "limestone"],
            bevel=0,
        )

    for crack_index in range(3):
        py = center_y + rng.uniform(-frontage * 0.43, frontage * 0.43)
        pz = rng.uniform(0.55, height * 0.9)
        cube(
            f"{name}-hairlineCrack-{crack_index}",
            (facade_x + side_dir * 0.105, py, pz),
            (0.022, rng.uniform(0.02, 0.045), rng.uniform(0.36, 0.82)),
            materials["dark"],
            rot=(0, 0, rng.uniform(-0.25, 0.25)),
            bevel=0,
        )

    for roof_index in range(2):
        if roof_index % 2 == 0:
            make_jar(
                f"{name}-roofJar-{roof_index}",
                (center_x + rng.uniform(-depth * 0.24, depth * 0.24), center_y + rng.uniform(-frontage * 0.35, frontage * 0.35), height + 0.18),
                materials["mudbrick"],
                rng.uniform(0.45, 0.65),
            )
        else:
            cube(
                f"{name}-roofBundle-{roof_index}",
                (center_x + rng.uniform(-depth * 0.22, depth * 0.22), center_y + rng.uniform(-frontage * 0.36, frontage * 0.36), height + 0.12),
                (0.5, 0.9, 0.14),
                materials["dry_reed"],
                rot=(0, 0, rng.uniform(-0.2, 0.2)),
                bevel=0.015,
            )

    if awning:
        awning_depth = rng.uniform(1.5, 2.25)
        awning_width = frontage * rng.uniform(0.64, 0.82)
        awning_x = facade_x + side_dir * awning_depth * 0.52
        awning_y = center_y + rng.uniform(-frontage * 0.08, frontage * 0.08)
        cube(
            f"{name}-streetAwningCloth",
            (awning_x, awning_y, 2.32),
            (awning_depth, awning_width, 0.055),
            materials["linen"],
            rot=(rng.uniform(-0.04, 0.04), rng.uniform(-0.07, 0.07), 0),
            bevel=0.01,
        )
        post_x = facade_x + side_dir * (awning_depth - 0.14)
        for post_y in [awning_y - awning_width * 0.44, awning_y + awning_width * 0.44]:
            cylinder(f"{name}-awningPost-{post_y}", (post_x, post_y, 1.08), 0.035, 2.16, materials["wood"], 8)
            cylinder_between(
                f"{name}-awningRope-{post_y}",
                (facade_x + side_dir * 0.08, post_y, 2.25),
                (post_x, post_y, 2.18),
                0.012,
                materials["dry_reed"],
                6,
            )

    if rng.random() > 0.35:
        cloth_y = center_y + rng.uniform(-frontage * 0.3, frontage * 0.3)
        cube(
            f"{name}-hangingCloth",
            (facade_x + side_dir * 0.11, cloth_y, 1.65),
            (0.06, 0.92, 0.76),
            materials["linen"],
            bevel=0.008,
        )


def make_edge_props(
    name: str,
    facade_x: float,
    center_y: float,
    side_dir: int,
    materials: dict[str, bpy.types.Material],
    seed: int,
) -> None:
    rng = random.Random(seed)
    edge_x = facade_x + side_dir * rng.uniform(0.45, 1.05)

    for index in range(rng.randint(1, 2)):
        make_jar(
            f"{name}-edgeJar-{index}",
            (edge_x + side_dir * rng.uniform(-0.2, 0.42), center_y + rng.uniform(-1.8, 1.8), 0.28),
            materials["mudbrick"],
            rng.uniform(0.62, 0.95),
        )

    for index in range(rng.randint(1, 2)):
        make_basket(
            f"{name}-edgeBasket-{index}",
            (edge_x + side_dir * rng.uniform(-0.1, 0.36), center_y + rng.uniform(-1.7, 1.7), 0.2),
            materials,
            rng.uniform(0.7, 1.08),
        )

    if rng.random() > 0.42:
        cube(f"{name}-workBench", (edge_x + side_dir * 0.16, center_y, 0.48), (0.72, 2.0, 0.16), materials["wood"], bevel=0.025)
        for offset in [-0.75, 0.75]:
            cube(f"{name}-benchLeg-{offset}", (edge_x + side_dir * 0.16, center_y + offset, 0.24), (0.16, 0.16, 0.48), materials["wood"], bevel=0.012)

    if rng.random() > 0.35:
        cube(
            f"{name}-linenSack",
            (edge_x + side_dir * rng.uniform(0.2, 0.5), center_y + rng.uniform(-1.5, 1.5), 0.18),
            (0.5, 0.72, 0.32),
            materials["linen"],
            rot=(0, 0, rng.uniform(-0.28, 0.28)),
            bevel=0.035,
        )


def add_hero_ground_details(materials: dict[str, bpy.types.Material]) -> None:
    rng = random.Random("hero-ground-details")

    for index in range(28):
        x = rng.uniform(-13.8, -7.2)
        y = rng.uniform(-28, 35)
        cube(
            f"streetFootprint-{index}",
            (x, y, 0.022),
            (rng.uniform(0.18, 0.28), rng.uniform(0.34, 0.52), 0.018),
            materials["dark"],
            rot=(0, 0, rng.uniform(-0.55, 0.55)),
            bevel=0.018,
        )

    for index in range(36):
        uv_sphere(
            f"streetPebble-{index}",
            (rng.uniform(-14.6, -6.4), rng.uniform(-29, 36), 0.04),
            rng.uniform(0.035, 0.11),
            materials["limestone" if index % 3 else "mudbrick"],
            scale=(1.2, 0.8, 0.32),
            segments=8,
        )

    for index in range(24):
        x = rng.uniform(-14.4, -6.6)
        y = rng.uniform(-29, 36)
        cylinder_between(
            f"streetStraw-{index}",
            (x, y, 0.045),
            (x + rng.uniform(-0.35, 0.35), y + rng.uniform(-0.35, 0.35), 0.055),
            rng.uniform(0.006, 0.012),
            materials["dry_reed"],
            5,
        )

    for index in range(8):
        cube(
            f"brokenPotteryShard-{index}",
            (rng.uniform(-14.2, -6.8), rng.uniform(-26, 33), 0.055),
            (rng.uniform(0.16, 0.35), rng.uniform(0.08, 0.22), 0.035),
            materials["mudbrick"],
            rot=(0, 0, rng.uniform(0, math.tau)),
            bevel=0.01,
        )


def build_hero_street_corridor(materials: dict[str, bpy.types.Material]) -> None:
    random.seed("hero-street-corridor")
    left_center_x = -17.55
    right_center_x = -3.25
    depth = 5.2
    cursor = -28.0
    house_specs = [5.4, 6.2, 4.8, 6.8, 5.6, 7.1, 5.2, 6.4]

    for index, frontage in enumerate(house_specs):
        center_y = cursor + frontage * 0.5
        left_height = 2.2 + (index % 4) * 0.28
        right_height = 2.0 + ((index + 2) % 5) * 0.24
        make_facade_house(
            f"heroLeftHouse-{index}",
            left_center_x + math.sin(index * 0.8) * 0.18,
            center_y,
            depth + (index % 3) * 0.28,
            frontage,
            left_height,
            1,
            materials,
            index % 2 == 0,
        )
        make_facade_house(
            f"heroRightHouse-{index}",
            right_center_x + math.cos(index * 0.7) * 0.16,
            center_y + (0.45 if index % 2 else -0.25),
            depth + ((index + 1) % 3) * 0.22,
            frontage * (0.92 + (index % 3) * 0.04),
            right_height,
            -1,
            materials,
            index % 3 != 1,
        )
        make_edge_props(f"heroLeftProps-{index}", left_center_x + depth * 0.5, center_y, 1, materials, index * 17 + 3)
        make_edge_props(f"heroRightProps-{index}", right_center_x - depth * 0.5, center_y, -1, materials, index * 19 + 7)
        cursor += frontage + 0.22

    for index, y in enumerate([-18, -3.5, 15.5]):
        cube(
            f"crossStreetShadeCloth-{index}",
            (-10.45, y, 3.08 + (index % 2) * 0.16),
            (8.35, 5.2 + (index % 2) * 1.1, 0.052),
            materials["linen"],
            rot=(random.uniform(-0.035, 0.035), random.uniform(-0.04, 0.04), 0),
            bevel=0.012,
        )
        cylinder_between(f"crossStreetRopeA-{index}", (-14.45, y - 2.25, 3.18), (-6.35, y - 2.0, 3.05), 0.014, materials["dry_reed"], 6)
        cylinder_between(f"crossStreetRopeB-{index}", (-14.55, y + 2.2, 3.08), (-6.25, y + 2.1, 3.2), 0.014, materials["dry_reed"], 6)

    cube("heroStreetDistantGateLeft", (-15.9, 35.8, 1.5), (3.0, 2.0, 3.0), materials["plaster"], bevel=0.035)
    cube("heroStreetDistantGateRight", (-5.1, 35.8, 1.5), (3.0, 2.0, 3.0), materials["plaster"], bevel=0.035)
    cube("heroStreetDistantLintel", (-10.5, 35.8, 3.0), (8.0, 1.9, 0.44), materials["plaster"], bevel=0.025)

    add_hero_ground_details(materials)


def build_residential_market_details(materials: dict[str, bpy.types.Material]) -> None:
    for index in range(14):
        x = -2.8 + (index % 7) * 0.92
        y = -1.7 + (index // 7) * 1.2
        make_jar(f"marketJar-{index}", (x, y, 0.28), materials["mudbrick"], random.uniform(0.55, 0.9))
    for index in range(8):
        make_basket(
            f"marketBasket-{index}",
            (-2.6 + (index % 4) * 1.25, 1.25 + (index // 4) * 1.0, 0.2),
            materials,
            random.uniform(0.7, 1.05),
        )
    for index in range(5):
        flat_panel(
            f"wovenMat-{index}",
            (-2.2 + index * 1.1, -3.0 + (index % 2) * 0.38, 0.035),
            0.9,
            1.7,
            materials["dry_reed"],
            rot=(0, 0, random.uniform(-0.15, 0.15)),
        )
    cube("marketBenchA", (-0.9, 2.9, 0.42), (2.5, 0.42, 0.22), materials["wood"], bevel=0.025)
    for x in [-1.9, 0.1]:
        cube(f"benchLeg{x}", (x, 2.9, 0.21), (0.18, 0.22, 0.42), materials["wood"], bevel=0.012)
    flat_panel("streetAwningPatchA", (1.35, -1.6, 2.0), 2.4, 1.35, materials["linen"], rot=(math.radians(13), 0, math.radians(-4)))
    flat_panel("streetAwningPatchB", (2.2, 1.7, 2.12), 2.8, 1.15, materials["linen"], rot=(math.radians(9), 0, math.radians(5)))
    for index in range(8):
        cylinder_between(
            f"marketRope-{index}",
            (-3.2 + index * 0.9, -2.25, 1.9 + (index % 2) * 0.14),
            (-2.8 + index * 0.9, -0.85, 2.12),
            0.012,
            materials["dry_reed"],
            6,
        )


def make_npc(name: str, loc: tuple[float, float, float], materials: dict[str, bpy.types.Material], scale: float, pose: float) -> None:
    x, y, z = loc
    cylinder(f"{name}-torso", (x, y, z + 0.78 * scale), 0.20 * scale, 0.8 * scale, materials["skin"], 14)
    cone(f"{name}-linenKilt", (x, y, z + 0.43 * scale), 0.29 * scale, 0.2 * scale, 0.42 * scale, materials["linen"], 14)
    uv_sphere(f"{name}-head", (x, y, z + 1.3 * scale), 0.18 * scale, materials["skin"], scale=(1, 0.95, 1.08), segments=14)
    cube(f"{name}-hair", (x, y - 0.02 * scale, z + 1.42 * scale), (0.32 * scale, 0.25 * scale, 0.18 * scale), materials["hair"], bevel=0.035)
    cylinder_between(f"{name}-leftArm", (x - 0.16 * scale, y, z + 0.94 * scale), (x - 0.46 * scale, y + 0.22 * pose, z + 0.58 * scale), 0.045 * scale, materials["skin"], 8)
    cylinder_between(f"{name}-rightArm", (x + 0.16 * scale, y, z + 0.94 * scale), (x + 0.43 * scale, y - 0.18 * pose, z + 0.63 * scale), 0.045 * scale, materials["skin"], 8)
    cylinder_between(f"{name}-leftLeg", (x - 0.1 * scale, y, z + 0.24 * scale), (x - 0.17 * scale, y + 0.12 * pose, z), 0.05 * scale, materials["skin"], 8)
    cylinder_between(f"{name}-rightLeg", (x + 0.1 * scale, y, z + 0.24 * scale), (x + 0.18 * scale, y - 0.1 * pose, z), 0.05 * scale, materials["skin"], 8)


def empty(name: str, loc: tuple[float, float, float], parent: bpy.types.Object | None = None) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj.empty_display_type = "PLAIN_AXES"
    obj.empty_display_size = 0.18
    obj.location = loc
    if parent:
        obj.parent = parent
        obj.matrix_parent_inverse = parent.matrix_world.inverted()
    return obj


def parent_keep_world(obj: bpy.types.Object, parent: bpy.types.Object) -> None:
    obj.parent = parent
    obj.matrix_parent_inverse = parent.matrix_world.inverted()


def key_rotation(obj: bpy.types.Object, frame: int, rot: tuple[float, float, float]) -> None:
    obj.rotation_euler = rot
    obj.keyframe_insert(data_path="rotation_euler", frame=frame)


def key_location(obj: bpy.types.Object, frame: int, loc: tuple[float, float, float]) -> None:
    obj.location = loc
    obj.keyframe_insert(data_path="location", frame=frame)


def make_articulated_limb(
    name: str,
    root: bpy.types.Object,
    joint: tuple[float, float, float],
    length: float,
    radius: float,
    material: bpy.types.Material,
    vertices: int = 10,
) -> bpy.types.Object:
    pivot = empty(f"{name}-pivot", joint, root)
    limb = cylinder(f"{name}-limb", (joint[0], joint[1], joint[2] - length * 0.5), radius, length, material, vertices, bevel=0.004)
    parent_keep_world(limb, pivot)
    return pivot


def set_linear_animation(objects: list[bpy.types.Object]) -> None:
    for obj in objects:
        if not obj.animation_data or not obj.animation_data.action:
            continue
        for curve in obj.animation_data.action.fcurves:
            for keyframe in curve.keyframe_points:
                keyframe.interpolation = "LINEAR"


def make_articulated_actor(
    name: str,
    loc: tuple[float, float, float],
    materials: dict[str, bpy.types.Material],
    scale: float,
    yaw: float,
    role: str,
    phase: float,
) -> None:
    root = empty(name, loc)
    root.rotation_euler = (0, 0, yaw)

    x, y, z = loc
    body_mat = materials["skin"]
    linen_mat = materials["linen"]
    hair_mat = materials["hair"]

    torso = cylinder(f"{name}-torso", (x, y, z + 0.9 * scale), 0.18 * scale, 0.72 * scale, body_mat, 14, bevel=0.004)
    parent_keep_world(torso, root)

    if role == "carrier":
        dress = cone(f"{name}-linenDress", (x, y, z + 0.55 * scale), 0.28 * scale, 0.22 * scale, 0.76 * scale, linen_mat, 16)
        parent_keep_world(dress, root)
    else:
        kilt = cone(f"{name}-linenKilt", (x, y, z + 0.44 * scale), 0.28 * scale, 0.19 * scale, 0.42 * scale, linen_mat, 16)
        parent_keep_world(kilt, root)

    head = uv_sphere(f"{name}-head", (x, y, z + 1.36 * scale), 0.17 * scale, body_mat, scale=(0.95, 0.9, 1.08), segments=14)
    parent_keep_world(head, root)

    hair = cube(f"{name}-hair", (x, y - 0.025 * scale, z + 1.47 * scale), (0.3 * scale, 0.24 * scale, 0.18 * scale), hair_mat, bevel=0.025)
    parent_keep_world(hair, root)

    left_arm = make_articulated_limb(f"{name}-leftArm", root, (x - 0.22 * scale, y, z + 1.08 * scale), 0.58 * scale, 0.043 * scale, body_mat)
    right_arm = make_articulated_limb(f"{name}-rightArm", root, (x + 0.22 * scale, y, z + 1.08 * scale), 0.58 * scale, 0.043 * scale, body_mat)
    left_leg = make_articulated_limb(f"{name}-leftLeg", root, (x - 0.09 * scale, y, z + 0.38 * scale), 0.48 * scale, 0.052 * scale, body_mat)
    right_leg = make_articulated_limb(f"{name}-rightLeg", root, (x + 0.09 * scale, y, z + 0.38 * scale), 0.48 * scale, 0.052 * scale, body_mat)

    animated_objects = [root, left_arm, right_arm, left_leg, right_leg]

    if role == "carrier":
        jar_root = empty(f"{name}-headJarRoot", (x, y, z + 1.68 * scale), root)
        jar = cone(f"{name}-headJar", (x, y, z + 1.82 * scale), 0.17 * scale, 0.11 * scale, 0.32 * scale, materials["mudbrick"], 16, bevel=0.004)
        parent_keep_world(jar, jar_root)
        animated_objects.append(jar_root)
    else:
        jar_root = None

    if role == "worker":
        block = cube(f"{name}-workBlock", (x + 0.44 * scale, y + 0.36 * scale, z + 0.34 * scale), (0.58 * scale, 0.44 * scale, 0.28 * scale), materials["limestone"], bevel=0.015)
        parent_keep_world(block, root)
        tool = cylinder(f"{name}-woodTool", (x + 0.32 * scale, y + 0.17 * scale, z + 0.82 * scale), 0.025 * scale, 0.46 * scale, materials["wood"], 8, rot=(math.radians(64), 0, 0))
        parent_keep_world(tool, right_arm)

    loop_frames = [1, 17, 33, 49, 65, 81, 97]
    root_base = loc
    for frame in loop_frames:
        t = (frame - 1) / 96 * math.tau + phase
        stride = math.sin(t)
        counter = math.sin(t + math.pi)
        bob = abs(stride) * 0.025 * scale
        key_location(root, frame, (root_base[0], root_base[1], root_base[2] + bob))

        if role == "worker":
            key_rotation(left_arm, frame, (math.radians(18), 0, math.radians(-10)))
            key_rotation(right_arm, frame, (math.radians(-72 + stride * 34), 0, math.radians(12)))
            key_rotation(left_leg, frame, (math.radians(5), 0, 0))
            key_rotation(right_leg, frame, (math.radians(-4), 0, 0))
        elif role == "idle":
            key_rotation(left_arm, frame, (math.radians(8 + stride * 7), 0, math.radians(-4)))
            key_rotation(right_arm, frame, (math.radians(-4 + counter * 7), 0, math.radians(4)))
            key_rotation(left_leg, frame, (math.radians(1), 0, 0))
            key_rotation(right_leg, frame, (math.radians(-1), 0, 0))
        elif role == "carrier":
            key_rotation(left_arm, frame, (math.radians(-78 + stride * 5), 0, math.radians(-19)))
            key_rotation(right_arm, frame, (math.radians(-78 + counter * 5), 0, math.radians(19)))
            key_rotation(left_leg, frame, (stride * 0.34, 0, 0))
            key_rotation(right_leg, frame, (counter * 0.34, 0, 0))
            if jar_root:
                key_rotation(jar_root, frame, (0, 0, math.radians(stride * 1.8)))
        else:
            key_rotation(left_arm, frame, (stride * 0.46, 0, math.radians(-4)))
            key_rotation(right_arm, frame, (counter * 0.46, 0, math.radians(4)))
            key_rotation(left_leg, frame, (counter * 0.44, 0, 0))
            key_rotation(right_leg, frame, (stride * 0.44, 0, 0))

    set_linear_animation(animated_objects)


def build_animated_street_actors(materials: dict[str, bpy.types.Material]) -> None:
    bpy.context.scene.frame_start = 1
    bpy.context.scene.frame_end = 97
    bpy.context.scene.render.fps = 24

    make_articulated_actor("actorCarrierNorth", (-11.75, -16.5, 0.05), materials, 0.98, 0, "carrier", 0.2)
    make_articulated_actor("actorCarrierSouth", (-9.65, -20.5, 0.05), materials, 0.94, 0, "carrier", 2.4)
    make_articulated_actor("actorMarketWalker", (-12.45, 2.4, 0.05), materials, 1.0, math.radians(8), "walker", 1.1)
    make_articulated_actor("actorDoorwayIdle", (-7.45, 10.2, 0.05), materials, 0.96, math.radians(-82), "idle", 3.0)
    make_articulated_actor("actorStoneWorker", (-7.65, -1.5, 0.05), materials, 1.02, math.radians(-72), "worker", 0.6)
    make_articulated_actor("actorStreetWalkerFar", (-11.0, 20.5, 0.05), materials, 0.9, math.radians(-5), "walker", 4.1)


def build_street_npc_placeholders(materials: dict[str, bpy.types.Material]) -> None:
    for index in range(7):
        make_npc(
            f"npc-{index}",
            (-2.6 + (index % 4) * 1.35, -1.8 + (index // 4) * 2.1, 0),
            materials,
            0.9 + (index % 3) * 0.08,
            -1 if index % 2 else 1,
        )
    make_jar("npcCarriedJar", (1.62, 0.1, 1.18), materials["mudbrick"], 0.5)


BUILDERS = {
    "nile-boat-large": build_nile_boat_large,
    "date-palm-cluster": build_date_palm_cluster,
    "reed-bank-cluster": build_reed_bank_cluster,
    "hero-street-corridor": build_hero_street_corridor,
    "mudbrick-house-cluster": build_mudbrick_house_cluster,
    "residential-market-details": build_residential_market_details,
    "animated-street-actors": build_animated_street_actors,
    "street-npc-placeholders": build_street_npc_placeholders,
}


def export_asset(asset: dict[str, object]) -> None:
    reset_scene()
    materials = create_materials()
    asset_id = str(asset["id"])
    BUILDERS[asset_id](materials)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_DIR / str(asset["fileName"])),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
        export_animations=True,
        export_frame_range=True,
        export_force_sampling=True,
    )


def optimize_scene_for_export(asset_id: str) -> None:
    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]

    if not meshes:
        return

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)

    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.convert(target="MESH")

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if len(meshes) <= 1:
        return

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)

    bpy.context.view_layer.objects.active = meshes[0]
    bpy.ops.object.join()
    bpy.context.object.name = f"{asset_id}-merged"


def write_manifest() -> None:
    manifest = {
        "$schema": "./asset-kit.schema.json",
        "id": "memphis-modular-glb-kit-v1",
        "checkedDate": date.today().isoformat(),
        "generatedBy": "tools/blender/generate_memphis_asset_kit.py",
        "generator": "Blender procedural mesh script",
        "blenderVersion": bpy.app.version_string,
        "licenseStatus": "Project-authored procedural meshes; no source media copied or embedded.",
        "policy": [
            "Use restricted Memphis-specific sources as human research context only.",
            "Use open/CC0/public-domain references only for future dataset experiments.",
            "Runtime GLBs in this kit are generated geometry with procedural materials."
        ],
        "assets": [
            {
                **asset,
                "runtimeUrl": f"/assets/generated/glb/{asset['fileName']}",
                "origin": "project-authored procedural Blender mesh",
                "runtimeAllowed": True,
                "licenseStatus": "Project-authored synthetic/procedural model; no source media copied.",
            }
            for asset in ASSETS
        ],
    }
    (OUT_DIR / "asset-kit.manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for asset in ASSETS:
        export_asset(asset)
    write_manifest()
    print(f"Generated {len(ASSETS)} Memphis GLB assets in {OUT_DIR}")


if __name__ == "__main__":
    main()
