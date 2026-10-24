"""Encode compositor captures on the deterministic simulation timeline."""
from pathlib import Path
import json
import sys
from PIL import Image

metadata_file = Path(sys.argv[1])
metadata = json.loads(metadata_file.read_text())
samples = metadata['state']['samples']
frames = []
for frame in metadata['frames']:
    if frame['timestamp'] < samples[0]['timestamp']:
        continue
    sample = min(samples, key=lambda item: abs(item['timestamp'] - frame['timestamp']))
    index = sample['frame']
    if frames and index <= frames[-1]['frame']:
        continue
    frames.append({**frame, 'frame': index})
if len(frames) < 20:
    raise RuntimeError('Too few rendered frames for a useful route review')
images = [Image.open(metadata_file.parent / frame['file']).convert('RGB') for frame in frames]
positions = [0] + [round(frame['frame'] / 300 * 10000) for frame in frames[1:]] + [10000]
durations = [max(1, end-start) for start, end in zip(positions, positions[1:])]
durations[0] += 10000 - sum(durations)
output = Path(metadata['output'])
images[0].save(output, 'WEBP', save_all=True, append_images=images[1:], duration=durations, loop=0, quality=82, method=4)
midpoint = min(range(len(frames)), key=lambda index: abs(frames[index]['frame'] - 150))
images[midpoint].save(output.with_name(output.stem + '-midpoint.png'))
metadata['encodedFrames'] = len(frames)
metadata['simulationMilliseconds'] = sum(durations)
metadata['frameNumbers'] = [frame['frame'] for frame in frames]
metadata_file.write_text(json.dumps(metadata, indent=2)+'\n')
print(f'Route preview: {len(frames)} captured frames, {sum(durations)} ms, {output.stat().st_size} bytes', flush=True)
