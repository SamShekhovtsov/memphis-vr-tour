"""Standard normalized RGBA8 glTF colour storage; other attributes stay exact."""
import json
import struct
import time
from pathlib import Path


def pack_colours(path):
    path = Path(path)
    raw = path.read_bytes()
    size = struct.unpack_from('<I',raw,12)[0]
    doc = json.loads(raw[20:20+size])
    binary = raw[28+size:]
    indices = {p['attributes']['COLOR_0'] for mesh in doc['meshes']
               for p in mesh['primitives'] if 'COLOR_0' in p['attributes']}
    replacements = {}
    for index in indices:
        accessor = doc['accessors'][index]
        if accessor['componentType'] == 5121:
            continue
        assert accessor['componentType'] == 5126 and accessor['type'] == 'VEC4'
        view_index = accessor['bufferView']
        assert sum(a.get('bufferView') == view_index for a in doc['accessors']) == 1
        view = doc['bufferViews'][view_index]
        assert not view.get('byteStride') and not accessor.get('byteOffset')
        start = view.get('byteOffset',0)
        values = struct.unpack_from('<'+'f'*accessor['count']*4,binary,start)
        # Clamp the finish's tiny highlight variation to glTF colour bounds.
        replacements[view_index] = bytes(round(max(0,min(1,v))*255) for v in values)
        accessor['componentType'], accessor['normalized'] = 5121, True
    if not replacements:
        return
    blocks, offset = [], 0
    for index, view in enumerate(doc['bufferViews']):
        start = view.get('byteOffset',0)
        data = replacements.get(index, binary[start:start+view['byteLength']])
        view['byteOffset'], view['byteLength'] = offset, len(data)
        data += b'\0' * (-len(data)%4)
        blocks.append(data)
        offset += len(data)
    doc['buffers'][0]['byteLength'] = offset
    encoded = json.dumps(doc,separators=(',',':')).encode()
    encoded += b' ' * (-len(encoded)%4)
    binary = b''.join(blocks)
    result = struct.pack('<III',0x46546C67,2,28+len(encoded)+len(binary))
    result += struct.pack('<II',len(encoded),0x4E4F534A)+encoded
    result += struct.pack('<II',len(binary),0x004E4942)+binary
    temporary = path.with_suffix('.packing.tmp')
    temporary.write_bytes(result)
    for attempt in range(12):
        try:
            temporary.replace(path)
            break
        except OSError:
            if attempt == 11:
                # Some Windows readers allow writes but keep a handle without
                # FILE_SHARE_DELETE. Offline build only: no capture runs here.
                path.write_bytes(result)
                temporary.unlink()
                break
            time.sleep(.25)


if __name__ == '__main__':
    root = Path(__file__).resolve().parents[2]/'apps/web-tour/public/assets/authored/hero-street'
    for file in sorted(root.glob('*.glb')):
        pack_colours(file)
        print('Packed finish colours:',file.name)
