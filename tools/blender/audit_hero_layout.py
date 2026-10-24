"""Record/verify source-level anchors without exporting or moving any asset."""
import bpy
import importlib.util
import json
import sys
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('memphis_generator', Path(__file__).with_name('generate_memphis_asset_kit.py'))
generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(generator)
bpy.ops.wm.read_factory_settings(use_empty=True)
generator.build_hero_street_corridor(generator.create_materials())
bpy.context.view_layer.update()
anchors = []
for obj in sorted(bpy.context.scene.objects, key=lambda item: item.name):
    if obj.type != 'MESH':
        continue
    # Keep every mesh origin, plus full extents for masses and door markers.
    # Surface geometry may be refined later without moving its construction.
    entry = {'name': obj.name, 'matrix': [round(value, 6) for row in obj.matrix_world for value in row]}
    if any(key in obj.name for key in ('mudPlasteredWallMass', 'doorReveal', 'doorThreshold', 'doorShadow')):
        corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
        entry['bounds'] = [[round(operation(corner[axis] for corner in corners), 6) for axis in range(3)] for operation in (min, max)]
    anchors.append(entry)
lock = root / 'content/scene-data/hero-street.anchors-lock.json'
state = {'coordinateSpace': 'Blender source metres; runtime x=-source.x-16.5, y=source.z, z=-source.y', 'anchors': anchors}
if '--record' in sys.argv:
    if lock.exists():
        raise RuntimeError('Refusing to overwrite an existing layout lock')
    lock.write_text(json.dumps(state, indent=2) + '\n')
else:
    baseline = json.loads(lock.read_text())
    expected = {entry['name']: entry for entry in baseline['anchors']}
    actual = {entry['name']: entry for entry in anchors}
    changed = [name for name in expected.keys() | actual.keys() if expected.get(name) != actual.get(name)]
    if changed:
        raise RuntimeError('Street construction anchors changed: ' + ', '.join(sorted(changed)[:20]))
print(f'Hero layout: {len(anchors)} object anchors and protected door/building extents verified', flush=True)
