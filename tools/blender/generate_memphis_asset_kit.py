"""Generate the first modular GLB asset kit for the Memphis browser tour.

The meshes in this script are project-authored procedural reconstructions.
They are intentionally modest-poly so the current laptop-browser MVP can load
them while Babylon assembles the world.
"""

from __future__ import annotations

import json
import math
import os
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
            "Hero Street v2 film-set pass: packed procedural PBR texture sets, baked contact/shadow decal geometry, foreground occluders, sculpted close facade chunks, roof clutter, plaster cracks, pottery, baskets, sacks, straw, stones, ruts, and work surfaces.",
            "Old Kingdom visual guardrails: compact mudbrick domestic lane, restrained domestic wall marks, linen shade cloth, plain clothing silhouettes, and no copied source media.",
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
            "Hero Street v2 character pass: fewer, more readable silhouettes with plain linen kilts, simple sheath-like linen garments, bare feet/simple sandals, minimal adornment, and slow street-scale movement.",
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


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float = 0.9,
    alpha: float = 1,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = False
    if alpha < 1:
        material.blend_method = "BLEND"
        material.show_transparent_back = True
    bsdf = material.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = 0.0
        bsdf.inputs["Alpha"].default_value = alpha
    return material


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, value))


def mix(a: float, b: float, t: float) -> float:
    return a + (b - a) * clamp01(t)


def mix_color(
    a: tuple[float, float, float, float],
    b: tuple[float, float, float, float],
    t: float,
) -> tuple[float, float, float, float]:
    return (mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t), mix(a[3], b[3], t))


def tonal_noise(x: int, y: int, seed: int) -> float:
    value = (
        math.sin((x + seed * 13) * 0.071)
        + math.sin((y - seed * 7) * 0.113)
        + math.sin((x * 0.037 + y * 0.053 + seed) * 1.7)
        + math.sin((x - y + seed * 5) * 0.019)
    )
    return value / 4


def packed_image(name: str, size: int, pixel_fn) -> bpy.types.Image:
    image = bpy.data.images.new(name, width=size, height=size)
    pixels: list[float] = []

    for y in range(size):
        for x in range(size):
            pixels.extend(pixel_fn(x, y))

    image.pixels = pixels
    image.pack()
    return image


def make_albedo_image(
    name: str,
    base: tuple[float, float, float, float],
    accent: tuple[float, float, float, float],
    seed: int,
    size: int = 256,
) -> bpy.types.Image:
    def pixel(x: int, y: int) -> tuple[float, float, float, float]:
        n = tonal_noise(x, y, seed)
        broad = math.sin((x + y * 0.35 + seed) * 0.021) * 0.23
        t = 0.48 + n * 0.28 + broad
        return mix_color(base, accent, t)

    return packed_image(name, size, pixel)


def make_normal_image(name: str, seed: int, strength: float = 0.22, size: int = 256) -> bpy.types.Image:
    def height(x: int, y: int) -> float:
        return tonal_noise(x, y, seed) + math.sin((x * 0.043 + y * 0.018 + seed) * 1.4) * 0.22

    def pixel(x: int, y: int) -> tuple[float, float, float, float]:
        dx = height((x + 1) % size, y) - height((x - 1) % size, y)
        dy = height(x, (y + 1) % size) - height(x, (y - 1) % size)
        return (clamp01(0.5 - dx * strength), clamp01(0.5 - dy * strength), 0.88, 1)

    image = packed_image(name, size, pixel)
    image.colorspace_settings.name = "Non-Color"
    return image


def make_roughness_image(name: str, seed: int, base: float = 0.86, size: int = 256) -> bpy.types.Image:
    def pixel(x: int, y: int) -> tuple[float, float, float, float]:
        value = clamp01(base + tonal_noise(x, y, seed) * 0.12)
        return (value, value, value, 1)

    image = packed_image(name, size, pixel)
    image.colorspace_settings.name = "Non-Color"
    return image


def make_packed_dust_albedo_image(name: str, size: int = 512) -> bpy.types.Image:
    def pixel(x: int, y: int) -> tuple[float, float, float, float]:
        nx = x / max(1, size - 1)
        ny = y / max(1, size - 1)
        n = (
            tonal_noise(x, y, 103) * 0.28
            + tonal_noise(x * 2, y // 2, 211) * 0.18
            + math.sin((ny * 8.4 + nx * 1.2) * math.pi) * 0.055
        )
        walking_lane = math.exp(-((nx - 0.5) / 0.34) ** 2) * 0.18
        wall_dirt = (math.exp(-((nx - 0.08) / 0.09) ** 2) + math.exp(-((nx - 0.92) / 0.09) ** 2)) * 0.32
        foot_rut_a = math.exp(-((nx - (0.42 + math.sin(ny * 18) * 0.025)) / 0.028) ** 2) * 0.18
        foot_rut_b = math.exp(-((nx - (0.58 + math.cos(ny * 17) * 0.024)) / 0.03) ** 2) * 0.16
        swept_patch = math.sin((nx * 5.1 + ny * 2.8) * math.pi + tonal_noise(x, y, 307)) * 0.06
        t = clamp01(0.5 + n + walking_lane + swept_patch - wall_dirt - foot_rut_a - foot_rut_b)
        return mix_color((0.34, 0.18, 0.08, 1), (0.78, 0.55, 0.29, 1), t)

    return packed_image(name, size, pixel)


def make_packed_dust_normal_image(name: str, size: int = 512) -> bpy.types.Image:
    def height(x: int, y: int) -> float:
        nx = x / max(1, size - 1)
        ny = y / max(1, size - 1)
        lane = math.exp(-((nx - 0.5) / 0.32) ** 2) * 0.16
        ruts = (
            math.exp(-((nx - (0.42 + math.sin(ny * 18) * 0.025)) / 0.032) ** 2)
            + math.exp(-((nx - (0.58 + math.cos(ny * 17) * 0.024)) / 0.032) ** 2)
        ) * -0.24
        pebble_noise = tonal_noise(x, y, 409) * 0.26 + tonal_noise(x * 3, y * 2, 503) * 0.08
        return lane + ruts + pebble_noise

    def pixel(x: int, y: int) -> tuple[float, float, float, float]:
        dx = height((x + 1) % size, y) - height((x - 1) % size, y)
        dy = height(x, (y + 1) % size) - height(x, (y - 1) % size)
        return (clamp01(0.5 - dx * 0.34), clamp01(0.5 - dy * 0.34), 0.9, 1)

    image = packed_image(name, size, pixel)
    image.colorspace_settings.name = "Non-Color"
    return image


def make_packed_dust_roughness_image(name: str, size: int = 512) -> bpy.types.Image:
    def pixel(x: int, y: int) -> tuple[float, float, float, float]:
        nx = x / max(1, size - 1)
        lane_polish = math.exp(-((nx - 0.5) / 0.28) ** 2) * 0.08
        value = clamp01(0.96 - lane_polish + tonal_noise(x, y, 601) * 0.045)
        return (value, value, value, 1)

    image = packed_image(name, size, pixel)
    image.colorspace_settings.name = "Non-Color"
    return image


def make_pbr_material(
    key: str,
    base: tuple[float, float, float, float],
    accent: tuple[float, float, float, float],
    roughness: float,
    seed: int,
    normal_strength: float = 0.22,
) -> bpy.types.Material:
    material = make_material(key, base, roughness)
    material["textureSet"] = {
        "albedo": f"{key} albedo",
        "normal": f"{key} normal",
        "roughness": f"{key} roughness",
        "ao": "authored contact/decal geometry in this GLB",
        "height": "authored crack/plaster/debris decals in this GLB",
    }

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")

    if not bsdf:
        return material

    albedo = nodes.new("ShaderNodeTexImage")
    albedo.name = f"{key} albedo"
    albedo.image = make_albedo_image(f"{key}_albedo", base, accent, seed)
    links.new(albedo.outputs["Color"], bsdf.inputs["Base Color"])

    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.name = f"{key} normal"
    normal_tex.image = make_normal_image(f"{key}_normal", seed + 100, normal_strength)
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = normal_strength
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

    roughness_tex = nodes.new("ShaderNodeTexImage")
    roughness_tex.name = f"{key} roughness"
    roughness_tex.image = make_roughness_image(f"{key}_roughness", seed + 200, roughness)
    links.new(roughness_tex.outputs["Color"], bsdf.inputs["Roughness"])

    return material


def make_packed_dust_material() -> bpy.types.Material:
    material = make_material("packed sandy street dust", (0.45, 0.27, 0.13, 1), 0.98)
    material["textureSet"] = {
        "albedo": "packed sandy street dust albedo",
        "normal": "packed sandy street dust normal",
        "roughness": "packed sandy street dust roughness",
        "ao": "authored wall-base/contact decals in this GLB",
        "height": "single-span dust atlas plus footprint/rut/debris geometry",
    }

    nodes = material.node_tree.nodes
    links = material.node_tree.links
    bsdf = nodes.get("Principled BSDF")

    if not bsdf:
        return material

    albedo = nodes.new("ShaderNodeTexImage")
    albedo.name = "packed sandy street dust albedo"
    albedo.image = make_packed_dust_albedo_image("packed_sandy_street_dust_albedo")
    links.new(albedo.outputs["Color"], bsdf.inputs["Base Color"])

    normal_tex = nodes.new("ShaderNodeTexImage")
    normal_tex.name = "packed sandy street dust normal"
    normal_tex.image = make_packed_dust_normal_image("packed_sandy_street_dust_normal")
    normal = nodes.new("ShaderNodeNormalMap")
    normal.inputs["Strength"].default_value = 0.26
    links.new(normal_tex.outputs["Color"], normal.inputs["Color"])
    links.new(normal.outputs["Normal"], bsdf.inputs["Normal"])

    roughness_tex = nodes.new("ShaderNodeTexImage")
    roughness_tex.name = "packed sandy street dust roughness"
    roughness_tex.image = make_packed_dust_roughness_image("packed_sandy_street_dust_roughness")
    links.new(roughness_tex.outputs["Color"], bsdf.inputs["Roughness"])

    return material


def create_materials() -> dict[str, bpy.types.Material]:
    return {
        "mudbrick": make_pbr_material("sun baked mudbrick", (0.30, 0.18, 0.10, 1), (0.55, 0.36, 0.20, 1), 0.98, 13, 0.38),
        "plaster": make_pbr_material("chalky cracked plaster", (0.49, 0.42, 0.29, 1), (0.76, 0.68, 0.48, 1), 0.97, 29, 0.26),
        "limestone": make_pbr_material("worn pale limestone", (0.46, 0.41, 0.31, 1), (0.72, 0.64, 0.47, 1), 0.92, 41, 0.18),
        "wood": make_pbr_material("dark acacia wood", (0.20, 0.11, 0.055, 1), (0.52, 0.32, 0.18, 1), 0.82, 53, 0.2),
        "reed": make_pbr_material("river reed green", (0.19, 0.30, 0.13, 1), (0.58, 0.66, 0.33, 1), 0.92, 61, 0.16),
        "dry_reed": make_pbr_material("dry reed straw", (0.50, 0.38, 0.17, 1), (0.86, 0.70, 0.35, 1), 0.94, 67, 0.16),
        "linen": make_pbr_material("sun bleached woven linen", (0.58, 0.49, 0.32, 1), (0.84, 0.74, 0.53, 1), 0.94, 71, 0.16),
        "dark": make_material("deep doorway shadow", (0.08, 0.055, 0.035, 1), 0.98),
        "baked_shadow": make_material("baked warm contact shadow", (0.045, 0.032, 0.02, 0.5), 1, 0.5),
        "dust_dark": make_material("settled dark street dust", (0.11, 0.067, 0.036, 0.38), 0.99, 0.38),
        "plaster_stain": make_material("thin plaster water stain", (0.18, 0.12, 0.065, 0.56), 1, 0.56),
        "warm_haze": make_material("warm suspended street haze", (0.58, 0.38, 0.2, 0.075), 1, 0.075),
        "paint_blue": make_material("mineral blue paint", (0.09, 0.31, 0.52, 1), 0.85),
        "paint_red": make_material("red ochre paint", (0.62, 0.19, 0.10, 1), 0.88),
        "paint_gold": make_material("warm ochre paint", (0.86, 0.58, 0.22, 1), 0.88),
        "skin": make_pbr_material("warm figure skin", (0.36, 0.19, 0.10, 1), (0.68, 0.40, 0.22, 1), 0.84, 83, 0.08),
        "pottery": make_pbr_material("warm Nile clay pottery", (0.32, 0.12, 0.055, 1), (0.62, 0.28, 0.12, 1), 0.93, 97, 0.22),
        "packed_dust": make_packed_dust_material(),
        "hair": make_material("dark hair", (0.04, 0.028, 0.02, 1), 0.92),
    }


def soften(obj: bpy.types.Object, width: float = 0.025, segments: int = 1) -> bpy.types.Object:
    ensure_uv(obj)

    if hasattr(obj.data, "use_auto_smooth"):
        obj.data.use_auto_smooth = True

    if width > 0:
        bevel = obj.modifiers.new("soft edge bevel", "BEVEL")
        bevel.width = width
        bevel.segments = segments
    normals = obj.modifiers.new("weighted normals", "WEIGHTED_NORMAL")
    normals.keep_sharp = True
    return obj


def ensure_uv(obj: bpy.types.Object, scale: float = 0.28) -> None:
    if obj.type != "MESH" or obj.data.uv_layers:
        return

    uv_layer = obj.data.uv_layers.new(name="UVMap")

    for polygon in obj.data.polygons:
        normal = polygon.normal
        for loop_index in polygon.loop_indices:
            vertex = obj.data.vertices[obj.data.loops[loop_index].vertex_index].co

            if abs(normal.z) >= abs(normal.x) and abs(normal.z) >= abs(normal.y):
                uv_layer.data[loop_index].uv = (vertex.x * scale, vertex.y * scale)
            elif abs(normal.x) >= abs(normal.y):
                uv_layer.data[loop_index].uv = (vertex.y * scale, vertex.z * scale)
            else:
                uv_layer.data[loop_index].uv = (vertex.x * scale, vertex.z * scale)


def set_unit_quad_uv(obj: bpy.types.Object) -> None:
    if obj.type != "MESH":
        return

    while obj.data.uv_layers:
        obj.data.uv_layers.remove(obj.data.uv_layers[0])
    uv_layer = obj.data.uv_layers.new(name="UVMap")
    uvs = [(0, 0), (1, 0), (1, 1), (0, 1)]

    for polygon in obj.data.polygons:
        for index, loop_index in enumerate(polygon.loop_indices):
            uv_layer.data[loop_index].uv = uvs[index % len(uvs)]


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
    ensure_uv(obj)
    return obj


def flat_panel(
    name: str,
    loc: tuple[float, float, float],
    width: float,
    depth: float,
    material: bpy.types.Material,
    rot: tuple[float, float, float] = (0, 0, 0),
    unit_uv: bool = False,
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
    if unit_uv:
        set_unit_quad_uv(obj)
    else:
        ensure_uv(obj)
    return obj


def sagging_cloth_panel(
    name: str,
    loc: tuple[float, float, float],
    width: float,
    depth: float,
    material: bpy.types.Material,
    sag: float = 0.18,
    rot: tuple[float, float, float] = (0, 0, 0),
) -> bpy.types.Object:
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    verts = []
    faces = []
    columns = 4
    rows = 3

    for row in range(rows + 1):
        for column in range(columns + 1):
            u = column / columns
            v = row / rows
            x = (u - 0.5) * width
            y = (v - 0.5) * depth
            center_falloff = math.sin(math.pi * u) * math.sin(math.pi * v)
            z = -sag * center_falloff + math.sin((u * 3.0 + v * 2.0) * math.pi) * sag * 0.08
            verts.append((x, y, z))

    for row in range(rows):
        for column in range(columns):
            a = row * (columns + 1) + column
            faces.append((a, a + 1, a + columns + 2, a + columns + 1))

    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    obj.data.materials.append(material)
    ensure_uv(obj)
    return soften(obj, 0.002)


def ground_decal(
    name: str,
    loc: tuple[float, float, float],
    width: float,
    depth: float,
    material: bpy.types.Material,
    rot_z: float = 0,
    unit_uv: bool = False,
) -> bpy.types.Object:
    return flat_panel(name, loc, width, depth, material, rot=(0, 0, rot_z), unit_uv=unit_uv)


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


def add_sculpted_facade_details(
    name: str,
    facade_x: float,
    center_y: float,
    frontage: float,
    height: float,
    side_dir: int,
    door_y: float,
    materials: dict[str, bpy.types.Material],
    rng: random.Random,
) -> None:
    for chip_index in range(9):
        edge_y = center_y - frontage * 0.48 + frontage * chip_index / 8 + rng.uniform(-0.12, 0.12)
        cube(
            f"{name}-handRoundedParapetChip-{chip_index}",
            (facade_x + side_dir * 0.18, edge_y, height + rng.uniform(0.06, 0.24)),
            (0.16, rng.uniform(0.16, 0.44), rng.uniform(0.09, 0.21)),
            materials["mudbrick" if chip_index % 3 else "plaster"],
            rot=(0, 0, rng.uniform(-0.18, 0.18)),
            bevel=0.035,
        )

    for lip_index, y in enumerate([center_y - frontage * 0.48, center_y + frontage * 0.48]):
        for z_index in range(4):
            cube(
                f"{name}-erodedCornerLip-{lip_index}-{z_index}",
                (facade_x + side_dir * 0.17, y + rng.uniform(-0.06, 0.06), 0.52 + z_index * height * 0.22),
                (0.18, rng.uniform(0.16, 0.32), rng.uniform(0.14, 0.36)),
                materials["mudbrick"],
                rot=(0, 0, rng.uniform(-0.14, 0.14)),
                bevel=0.03,
            )

    cube(
        f"{name}-doorRevealLeft",
        (facade_x + side_dir * 0.18, door_y - 0.54, 0.74),
        (0.22, 0.12, 1.34),
        materials["mudbrick"],
        bevel=0.022,
    )
    cube(
        f"{name}-doorRevealRight",
        (facade_x + side_dir * 0.18, door_y + 0.54, 0.74),
        (0.22, 0.12, 1.34),
        materials["mudbrick"],
        bevel=0.022,
    )
    cube(
        f"{name}-doorThresholdWornStone",
        (facade_x + side_dir * 0.34, door_y, 0.08),
        (0.48, 1.08, 0.12),
        materials["limestone"],
        rot=(0, 0, rng.uniform(-0.025, 0.025)),
        bevel=0.018,
    )
    ground_decal(
        f"{name}-doorwayBakedDarkness",
        (facade_x + side_dir * 0.58, door_y, 0.073),
        1.24,
        1.32,
        materials["baked_shadow"],
        rot_z=rng.uniform(-0.05, 0.05),
    )

    peg_points: list[tuple[float, float]] = []
    for peg_index in range(4):
        peg_y = center_y + rng.uniform(-frontage * 0.42, frontage * 0.42)
        peg_z = rng.uniform(1.22, max(1.32, height * 0.88))
        peg_points.append((peg_y, peg_z))
        cylinder_between(
            f"{name}-wallPeg-{peg_index}",
            (facade_x + side_dir * 0.12, peg_y, peg_z),
            (facade_x + side_dir * 0.42, peg_y, peg_z + rng.uniform(-0.02, 0.03)),
            0.026,
            materials["wood"],
            8,
        )
        uv_sphere(
            f"{name}-mudPegSocket-{peg_index}",
            (facade_x + side_dir * 0.105, peg_y, peg_z),
            0.058,
            materials["mudbrick"],
            scale=(0.45, 1.0, 0.7),
            segments=8,
        )

    for cord_index in range(0, len(peg_points) - 1, 2):
        y1, z1 = peg_points[cord_index]
        y2, z2 = peg_points[cord_index + 1]
        cylinder_between(
            f"{name}-saggingCord-{cord_index}",
            (facade_x + side_dir * 0.36, y1, z1 - 0.04),
            (facade_x + side_dir * 0.36, y2, z2 - 0.08),
            0.012,
            materials["dry_reed"],
            6,
        )

    for stain_index in range(3):
        cube(
            f"{name}-baseDirtLip-{stain_index}",
            (
                facade_x + side_dir * 0.12,
                center_y + rng.uniform(-frontage * 0.43, frontage * 0.43),
                rng.uniform(0.18, 0.34),
            ),
            (0.038, rng.uniform(0.8, 1.7), rng.uniform(0.10, 0.22)),
            materials["dust_dark"],
            rot=(0, 0, rng.uniform(-0.06, 0.06)),
            bevel=0,
        )


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

    add_sculpted_facade_details(name, facade_x, center_y, frontage, height, side_dir, door_y, materials, rng)

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
            materials["pottery"],
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

    for index, y in enumerate([-25, -18, -11, -4, 4, 12, 20, 29]):
        ground_decal(
            f"streetSweptDustPile-{index}",
            (-10.45 + rng.uniform(-1.6, 1.6), y + rng.uniform(-0.8, 0.8), 0.074),
            rng.uniform(1.2, 2.4),
            rng.uniform(0.42, 0.88),
            materials["dust_dark"],
            rot_z=rng.uniform(-0.32, 0.32),
        )

    for index, x in enumerate([-11.5, -9.35]):
        ground_decal(
            f"streetSoftFootRut-{index}",
            (x, 3.5 + rng.uniform(-1.0, 1.0), 0.071),
            0.42,
            57,
            materials["dust_dark"],
            rot_z=rng.uniform(-0.018, 0.018),
        )

    for side_index, x in enumerate([-14.7, -6.2]):
        for index, y in enumerate([-25, -17, -8, 1, 10, 19, 28]):
            ground_decal(
                f"streetWallBaseDirt-{side_index}-{index}",
                (x + rng.uniform(-0.08, 0.08), y + rng.uniform(-0.7, 0.7), 0.075),
                rng.uniform(0.78, 1.24),
                rng.uniform(2.4, 4.2),
                materials["baked_shadow"],
                rot_z=rng.uniform(-0.05, 0.05),
            )

    for pair_index in range(20):
        y = -25 + pair_index * 2.85 + rng.uniform(-0.35, 0.35)
        x = -10.45 + math.sin(pair_index * 0.7) * 0.64 + rng.uniform(-0.18, 0.18)
        yaw = rng.uniform(-0.28, 0.28)
        for side in [-1, 1]:
            cube(
                f"heroWalkingFootprintPair-{pair_index}-{side}",
                (x + side * 0.18, y + side * 0.38, 0.023),
                (rng.uniform(0.16, 0.23), rng.uniform(0.34, 0.48), 0.014),
                materials["dust_dark"],
                rot=(0, 0, yaw + side * 0.08),
                bevel=0.02,
            )

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
            materials["pottery"],
            rot=(0, 0, rng.uniform(0, math.tau)),
            bevel=0.01,
        )

    for index in range(14):
        uv_sphere(
            f"streetRaisedDustClod-{index}",
            (rng.uniform(-14.0, -6.8), rng.uniform(-27, 34), 0.052),
            rng.uniform(0.06, 0.16),
            materials["packed_dust" if index % 2 else "mudbrick"],
            scale=(1.6, 0.9, 0.24),
            segments=8,
        )


def add_baked_street_lighting(materials: dict[str, bpy.types.Material]) -> None:
    street_center_x = -10.45

    for index, y in enumerate([-24, -16, -7, 4, 16, 28]):
        ground_decal(
            f"heroV2-wallFootContactLeft-{index}",
            (-14.65, y, 0.064),
            0.72,
            7.2,
            materials["baked_shadow"],
            rot_z=0.02 * math.sin(index),
        )
        ground_decal(
            f"heroV2-wallFootContactRight-{index}",
            (-6.24, y + 0.5, 0.065),
            0.78,
            7.0,
            materials["baked_shadow"],
            rot_z=-0.02 * math.cos(index),
        )

    for index, y in enumerate([-24.5, -18.2, -12.1, -5.7, 1.6, 7.8, 15.2, 22.7, 30.4]):
        for side_name, x in [("left", -14.25), ("right", -6.65)]:
            ground_decal(
                f"heroV2-doorwayPool-{side_name}-{index}",
                (x, y + math.sin(index) * 0.45, 0.076),
                1.05,
                1.45,
                materials["baked_shadow"],
                rot_z=math.radians((3 if side_name == "left" else -3) + math.sin(index) * 2),
            )

    for index, (x, y, width, depth) in enumerate([
        (-13.95, -22.8, 2.6, 1.1),
        (-6.35, -13.9, 1.6, 1.4),
        (-13.7, -25.8, 1.8, 1.0),
        (-6.75, -20.1, 1.7, 1.0),
    ]):
        ground_decal(
            f"heroV2-foregroundPropGrounding-{index}",
            (x, y, 0.078),
            width,
            depth,
            materials["baked_shadow"],
            rot_z=math.radians(4 - index * 3),
        )


def add_wall_surface_decals(materials: dict[str, bpy.types.Material]) -> None:
    rng = random.Random("hero-v2-wall-decals")

    for side_name, facade_x, side_dir in [("left", -14.9, 1), ("right", -5.92, -1)]:
        for index in range(18):
            y = rng.uniform(-27.5, 34)
            z = rng.uniform(0.55, 2.2)
            cube(
                f"heroV2-{side_name}-thinStain-{index}",
                (facade_x + side_dir * 0.13, y, z),
                (0.018, rng.uniform(0.34, 1.1), rng.uniform(0.18, 0.64)),
                materials["plaster_stain"],
                rot=(0, 0, rng.uniform(-0.08, 0.08)),
                bevel=0,
            )

        for index in range(20):
            y = rng.uniform(-27.5, 34)
            z = rng.uniform(0.45, 2.65)
            cube(
                f"heroV2-{side_name}-raisedMudChip-{index}",
                (facade_x + side_dir * 0.15, y, z),
                (0.055, rng.uniform(0.12, 0.38), rng.uniform(0.08, 0.22)),
                materials["mudbrick" if index % 2 else "plaster"],
                rot=(0, 0, rng.uniform(-0.4, 0.4)),
                bevel=0.006,
            )

        for index in range(12):
            y = rng.uniform(-27.5, 34)
            z = rng.uniform(0.8, 2.6)
            cube(
                f"heroV2-{side_name}-deepHairlineCrack-{index}",
                (facade_x + side_dir * 0.17, y, z),
                (0.028, rng.uniform(0.018, 0.035), rng.uniform(0.42, 1.15)),
                materials["dark"],
                rot=(0, 0, rng.uniform(-0.22, 0.22)),
                bevel=0,
            )


def make_tool_bundle(name: str, loc: tuple[float, float, float], materials: dict[str, bpy.types.Material]) -> None:
    x, y, z = loc
    for index in range(5):
        cylinder_between(
            f"{name}-woodHandle-{index}",
            (x + index * 0.12, y - 0.42 + index * 0.13, z),
            (x + index * 0.12 + 0.15, y + 0.36 + index * 0.06, z + 0.08),
            0.018,
            materials["wood"],
            7,
        )
        cube(
            f"{name}-toolHead-{index}",
            (x + index * 0.12 + 0.18, y + 0.42 + index * 0.06, z + 0.1),
            (0.16, 0.06, 0.05),
            materials["limestone" if index % 2 else "paint_gold"],
            rot=(0, 0, index * 0.28),
            bevel=0.006,
        )


def add_foreground_film_set(materials: dict[str, bpy.types.Material]) -> None:
    cube(
        "heroV2LeftEyeHeightWallOccluder",
        (-14.72, -28.4, 1.2),
        (0.55, 4.8, 2.4),
        materials["mudbrick"],
        rot=(0, 0, -0.018),
        bevel=0.065,
    )
    cube(
        "heroV2LeftEyeHeightPlasterLip",
        (-14.39, -28.1, 1.34),
        (0.055, 3.7, 1.76),
        materials["plaster"],
        rot=(0, 0, -0.02),
        bevel=0.014,
    )
    cube(
        "heroV2RightEyeHeightWallOccluder",
        (-6.12, -26.7, 1.05),
        (0.48, 3.25, 2.1),
        materials["mudbrick"],
        rot=(0, 0, 0.02),
        bevel=0.055,
    )
    cube(
        "heroV2RightEyeHeightDoorDark",
        (-6.42, -26.2, 0.78),
        (0.08, 0.95, 1.45),
        materials["dark"],
        bevel=0.008,
    )
    sagging_cloth_panel(
        "heroV2LowForegroundCanopy",
        (-10.45, -23.9, 2.78),
        8.8,
        5.6,
        materials["linen"],
        sag=0.34,
        rot=(math.radians(4), 0, math.radians(-0.8)),
    )
    cylinder_between("heroV2LowCanopyFrontRope", (-14.68, -26.62, 2.76), (-6.25, -26.25, 2.66), 0.017, materials["dry_reed"], 7)
    cylinder_between("heroV2LowCanopyBackRope", (-14.32, -21.35, 2.86), (-6.35, -21.25, 2.78), 0.016, materials["dry_reed"], 7)
    ground_decal(
        "heroV2LowForegroundCanopyShadow",
        (-10.4, -23.7, 0.079),
        8.9,
        5.65,
        materials["dust_dark"],
        rot_z=math.radians(1.2),
    )

    for index, (x, y, scale) in enumerate([
        (-14.2, -27.0, 1.28),
        (-13.35, -25.8, 0.92),
        (-6.82, -24.8, 1.05),
        (-5.88, -22.8, 0.86),
    ]):
        make_basket(f"heroV2ForegroundBasket-{index}", (x, y, 0.23), materials, scale)

    for index, (x, y, scale) in enumerate([
        (-13.15, -24.5, 1.05),
        (-12.55, -23.7, 0.78),
        (-6.55, -20.6, 1.12),
        (-7.35, -19.8, 0.82),
        (-5.85, -12.2, 0.92),
    ]):
        make_jar(f"heroV2ForegroundJar-{index}", (x, y, 0.32), materials["pottery"], scale)

    cube("heroV2LeftForegroundBench", (-14.0, -22.8, 0.42), (0.56, 2.2, 0.20), materials["wood"], rot=(0, 0, 0.08), bevel=0.025)
    cube("heroV2RightWorkStone", (-6.15, -13.8, 0.42), (1.05, 0.92, 0.46), materials["limestone"], rot=(0, 0, -0.06), bevel=0.025)
    cube("heroV2FoldedLinenPile", (-13.85, -21.6, 0.66), (0.64, 0.82, 0.18), materials["linen"], rot=(0, 0, -0.08), bevel=0.045)
    make_tool_bundle("heroV2ForegroundTools", (-6.5, -14.55, 0.78), materials)

    for index in range(18):
        make_jar(
            f"heroV2EdgeTinyVessel-{index}",
            (-14.0 + (index % 3) * 0.5 if index < 9 else -6.6 + (index % 3) * 0.42, -18 + (index // 3) * 2.2, 0.22),
            materials["pottery"],
            0.32 + (index % 3) * 0.06,
        )


def add_cinematic_depth_layers(materials: dict[str, bpy.types.Material]) -> None:
    for index, y in enumerate([7.5, 18.5, 31.5]):
        vertical_panel(
            f"heroV2WarmHazePlane-{index}",
            (-10.45, y, 1.55 + index * 0.08),
            9.4 - index * 0.8,
            2.8 + index * 0.25,
            materials["warm_haze"],
            rot=(0, 0, math.radians(index - 1)),
        )

    for index, y in enumerate([25, 30, 35]):
        sagging_cloth_panel(
            f"heroV2DistantClothLayer-{index}",
            (-10.45, y, 2.85 + index * 0.08),
            7.2 - index * 0.55,
            3.2,
            materials["linen"],
            sag=0.16,
            rot=(math.radians(4), 0, math.radians(index - 1)),
        )
        cylinder_between(f"heroV2DistantClothRopeA-{index}", (-13.95, y - 1.45, 2.95), (-6.95, y - 1.25, 2.85), 0.012, materials["dry_reed"], 6)
        cylinder_between(f"heroV2DistantClothRopeB-{index}", (-13.8, y + 1.45, 2.82), (-7.0, y + 1.3, 2.95), 0.012, materials["dry_reed"], 6)


def build_hero_street_corridor(materials: dict[str, bpy.types.Material]) -> None:
    random.seed("hero-street-corridor")
    left_center_x = -17.55
    right_center_x = -3.25
    street_center_x = -10.45
    depth = 5.2
    cursor = -28.0
    house_specs = [5.4, 6.2, 4.8, 6.8, 5.6, 7.1, 5.2, 6.4]

    ground_decal(
        "heroV2ContinuousPackedDustGround",
        (street_center_x + 0.08, 3.9, 0.052),
        9.15,
        67.8,
        materials["packed_dust"],
        rot_z=0,
        unit_uv=True,
    )

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
        sagging_cloth_panel(
            f"crossStreetShadeCloth-{index}",
            (-10.45, y, 3.08 + (index % 2) * 0.16),
            8.35,
            5.2 + (index % 2) * 1.1,
            materials["linen"],
            sag=0.18 + index * 0.03,
            rot=(random.uniform(-0.035, 0.035), random.uniform(-0.04, 0.04), math.radians(index - 1)),
        )
        cylinder_between(f"crossStreetRopeA-{index}", (-14.45, y - 2.25, 3.18), (-6.35, y - 2.0, 3.05), 0.014, materials["dry_reed"], 6)
        cylinder_between(f"crossStreetRopeB-{index}", (-14.55, y + 2.2, 3.08), (-6.25, y + 2.1, 3.2), 0.014, materials["dry_reed"], 6)

    add_baked_street_lighting(materials)
    add_wall_surface_decals(materials)
    add_foreground_film_set(materials)
    add_cinematic_depth_layers(materials)
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
        action = obj.animation_data.action
        curves = getattr(action, "fcurves", None)

        if curves is None:
            curves = []
            for layer in getattr(action, "layers", []):
                for strip in getattr(layer, "strips", []):
                    for channelbag in getattr(strip, "channelbags", []):
                        curves.extend(getattr(channelbag, "fcurves", []))

        for curve in curves:
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
    walk_distance: float = 0,
    walk_side_offset: float = 0,
) -> None:
    root = empty(name, loc)
    root.rotation_euler = (0, 0, yaw)

    x, y, z = loc
    body_mat = materials["skin"]
    linen_mat = materials["linen"]
    hair_mat = materials["hair"]

    torso = cylinder(f"{name}-torso", (x, y, z + 0.9 * scale), 0.18 * scale, 0.72 * scale, body_mat, 14, bevel=0.004)
    parent_keep_world(torso, root)
    shoulders = cylinder_between(
        f"{name}-shoulderLine",
        (x - 0.26 * scale, y, z + 1.16 * scale),
        (x + 0.26 * scale, y, z + 1.16 * scale),
        0.045 * scale,
        body_mat,
        10,
    )
    parent_keep_world(shoulders, root)
    neck = cylinder(f"{name}-neck", (x, y, z + 1.23 * scale), 0.065 * scale, 0.16 * scale, body_mat, 10, bevel=0.003)
    parent_keep_world(neck, root)

    if role == "carrier":
        sheath_top = cylinder(f"{name}-linenSheathUpper", (x, y, z + 0.86 * scale), 0.19 * scale, 0.42 * scale, linen_mat, 16, bevel=0.004)
        parent_keep_world(sheath_top, root)
        dress = cone(f"{name}-linenDress", (x, y, z + 0.55 * scale), 0.28 * scale, 0.22 * scale, 0.76 * scale, linen_mat, 16)
        parent_keep_world(dress, root)
    else:
        kilt = cone(f"{name}-linenKilt", (x, y, z + 0.44 * scale), 0.28 * scale, 0.19 * scale, 0.42 * scale, linen_mat, 16)
        parent_keep_world(kilt, root)
        belt = cylinder(f"{name}-plainLinenBelt", (x, y, z + 0.67 * scale), 0.22 * scale, 0.045 * scale, linen_mat, 16, bevel=0.002)
        parent_keep_world(belt, root)

    head = uv_sphere(f"{name}-head", (x, y, z + 1.36 * scale), 0.17 * scale, body_mat, scale=(0.95, 0.9, 1.08), segments=14)
    parent_keep_world(head, root)

    hair = cube(f"{name}-hair", (x, y - 0.025 * scale, z + 1.47 * scale), (0.3 * scale, 0.24 * scale, 0.18 * scale), hair_mat, bevel=0.025)
    parent_keep_world(hair, root)
    nose = uv_sphere(f"{name}-nose", (x, y - 0.16 * scale, z + 1.36 * scale), 0.035 * scale, body_mat, scale=(0.75, 1.25, 0.75), segments=8)
    parent_keep_world(nose, root)

    left_arm = make_articulated_limb(f"{name}-leftArm", root, (x - 0.22 * scale, y, z + 1.08 * scale), 0.58 * scale, 0.043 * scale, body_mat)
    right_arm = make_articulated_limb(f"{name}-rightArm", root, (x + 0.22 * scale, y, z + 1.08 * scale), 0.58 * scale, 0.043 * scale, body_mat)
    left_leg = make_articulated_limb(f"{name}-leftLeg", root, (x - 0.09 * scale, y, z + 0.38 * scale), 0.48 * scale, 0.052 * scale, body_mat)
    right_leg = make_articulated_limb(f"{name}-rightLeg", root, (x + 0.09 * scale, y, z + 0.38 * scale), 0.48 * scale, 0.052 * scale, body_mat)
    left_hand = uv_sphere(f"{name}-leftHand", (x - 0.22 * scale, y, z + 0.52 * scale), 0.055 * scale, body_mat, scale=(0.85, 0.85, 1.05), segments=8)
    right_hand = uv_sphere(f"{name}-rightHand", (x + 0.22 * scale, y, z + 0.52 * scale), 0.055 * scale, body_mat, scale=(0.85, 0.85, 1.05), segments=8)
    parent_keep_world(left_hand, left_arm)
    parent_keep_world(right_hand, right_arm)
    left_foot = cube(f"{name}-leftFoot", (x - 0.1 * scale, y - 0.08 * scale, z + 0.035 * scale), (0.13 * scale, 0.28 * scale, 0.07 * scale), body_mat, bevel=0.008)
    right_foot = cube(f"{name}-rightFoot", (x + 0.1 * scale, y - 0.08 * scale, z + 0.035 * scale), (0.13 * scale, 0.28 * scale, 0.07 * scale), body_mat, bevel=0.008)
    parent_keep_world(left_foot, root)
    parent_keep_world(right_foot, root)
    left_sandal = cube(f"{name}-leftSimpleSandal", (x - 0.1 * scale, y - 0.1 * scale, z + 0.01 * scale), (0.17 * scale, 0.32 * scale, 0.022 * scale), materials["dry_reed"], bevel=0.004)
    right_sandal = cube(f"{name}-rightSimpleSandal", (x + 0.1 * scale, y - 0.1 * scale, z + 0.01 * scale), (0.17 * scale, 0.32 * scale, 0.022 * scale), materials["dry_reed"], bevel=0.004)
    parent_keep_world(left_sandal, left_foot)
    parent_keep_world(right_sandal, right_foot)

    animated_objects = [root, left_arm, right_arm, left_leg, right_leg, left_foot, right_foot]

    if role == "carrier":
        jar_root = empty(f"{name}-headJarRoot", (x, y, z + 1.68 * scale), root)
        head_pad = cylinder(f"{name}-headPad", (x, y, z + 1.58 * scale), 0.16 * scale, 0.035 * scale, materials["linen"], 14, bevel=0.004)
        parent_keep_world(head_pad, root)
        jar = cone(f"{name}-headJar", (x, y, z + 1.82 * scale), 0.17 * scale, 0.11 * scale, 0.32 * scale, materials["pottery"], 16, bevel=0.004)
        parent_keep_world(jar, jar_root)
        animated_objects.append(jar_root)
    else:
        jar_root = None

    if role == "worker":
        block = cube(f"{name}-workBlock", (x + 0.44 * scale, y + 0.36 * scale, z + 0.34 * scale), (0.58 * scale, 0.44 * scale, 0.28 * scale), materials["limestone"], bevel=0.015)
        parent_keep_world(block, root)
        tool = cylinder(f"{name}-woodTool", (x + 0.32 * scale, y + 0.17 * scale, z + 0.82 * scale), 0.025 * scale, 0.46 * scale, materials["wood"], 8, rot=(math.radians(64), 0, 0))
        parent_keep_world(tool, right_arm)

    if role == "idle":
        stool = cube(f"{name}-doorwayLowStool", (x + 0.42 * scale, y + 0.22 * scale, z + 0.18 * scale), (0.38 * scale, 0.42 * scale, 0.2 * scale), materials["wood"], bevel=0.018)
        parent_keep_world(stool, root)

    loop_frames = [1, 33, 65, 97, 129, 161, 193]
    root_base = loc
    loop_start = loop_frames[0]
    loop_end = loop_frames[-1]

    for frame in loop_frames:
        progress = (frame - loop_start) / (loop_end - loop_start)
        t = progress * math.tau + phase
        stride = math.sin(t)
        counter = math.sin(t + math.pi)
        bob = abs(stride) * 0.025 * scale

        if walk_distance:
            if progress <= 0.5:
                travel = progress / 0.5
                root_x = root_base[0] + math.sin(travel * math.pi) * walk_side_offset
                root_y = root_base[1] + walk_distance * travel
                root_yaw = yaw
            else:
                travel = (progress - 0.5) / 0.5
                root_x = root_base[0] + math.sin((1 - travel) * math.pi) * walk_side_offset
                root_y = root_base[1] + walk_distance * (1 - travel)
                root_yaw = yaw + math.pi

            key_location(root, frame, (root_x, root_y, root_base[2] + bob))
            key_rotation(root, frame, (0, 0, root_yaw))
        else:
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
    bpy.context.scene.frame_end = 193
    bpy.context.scene.render.fps = 24

    make_articulated_actor("actorHeroCarrier", (-10.7, -22.5, 0.05), materials, 1.02, math.radians(1), "carrier", 0.2, 11.8, 0.34)
    make_articulated_actor("actorHeroStoneWorker", (-7.45, -8.7, 0.05), materials, 1.04, math.radians(-76), "worker", 0.6)
    make_articulated_actor("actorHeroStreetWalker", (-13.2, -3.4, 0.05), materials, 0.98, math.radians(178), "walker", 3.0, -8.6, -0.28)


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
    export_options = {
        "filepath": str(OUT_DIR / str(asset["fileName"])),
        "export_format": "GLB",
        "use_selection": True,
        "export_apply": True,
        "export_yup": True,
        "export_animations": True,
        "export_frame_range": True,
        "export_force_sampling": True,
    }

    if os.environ.get("EGYPTVR_ENABLE_DRACO") == "1":
        export_options.update(
            {
                "export_draco_mesh_compression_enable": True,
                "export_draco_mesh_compression_level": 6,
                "export_draco_position_quantization": 14,
                "export_draco_normal_quantization": 10,
                "export_draco_texcoord_quantization": 12,
            }
        )

    bpy.ops.export_scene.gltf(
        **export_options
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
        "meshCompression": "Draco export is supported by setting EGYPTVR_ENABLE_DRACO=1; disabled by default until browser decoder wiring is verified.",
        "licenseStatus": "Project-authored procedural meshes; no source media copied or embedded.",
        "materialAtlasStatus": {
            "currentPass": "Procedural albedo/normal/roughness texture sets are packed in the generated GLBs.",
            "aoAndHeight": "AO, doorway darkness, wall-base dirt, cloth shade, cracks, chips, and height-like surface breakup are authored as visible decal/contact geometry for this pass.",
            "nextPass": "After the look is approved, split near/mid/far chunks and bake true lightmap/AO/height/KTX2 atlases."
        },
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
