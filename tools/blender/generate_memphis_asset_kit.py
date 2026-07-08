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
    "mudbrick-house-cluster": build_mudbrick_house_cluster,
    "residential-market-details": build_residential_market_details,
    "street-npc-placeholders": build_street_npc_placeholders,
}


def export_asset(asset: dict[str, object]) -> None:
    reset_scene()
    materials = create_materials()
    BUILDERS[str(asset["id"])](materials)
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=str(OUT_DIR / str(asset["fileName"])),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_yup=True,
    )


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
