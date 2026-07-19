import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import jpeg from "jpeg-js";

const rootDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const textureDir = path.join(rootDir, "apps", "web-tour", "public", "assets", "generated", "textures");
const audioDir = path.join(rootDir, "apps", "web-tour", "public", "assets", "generated", "audio");
const manifestPath = path.join(rootDir, "apps", "web-tour", "public", "assets", "generated", "provenance.json");

const textureSize = 1024;
const sampleRate = 22050;
const checkedDate = "2026-07-10";

await Promise.all([mkdir(textureDir, { recursive: true }), mkdir(audioDir, { recursive: true })]);

const textureAssets = [
  writeJpeg("sand-grain.jpg", createSandTexture(textureSize, textureSize), 84),
  writeJpeg("mudbrick-pbr.jpg", createMudbrickTexture(textureSize, textureSize), 88),
  writeJpeg("plaster-aged.jpg", createPlasterTexture(textureSize, textureSize), 88),
  writeJpeg("limestone-cut.jpg", createLimestoneTexture(textureSize, textureSize), 88),
  writeJpeg("painted-relief-wall.jpg", createPaintedReliefTexture(1024, 512), 90),
  writeJpeg("reed-bundle.jpg", createReedTexture(textureSize, textureSize), 86),
  writeJpeg("woven-linen.jpg", createLinenTexture(textureSize, textureSize), 88),
  writeJpeg("nile-water.jpg", createWaterTexture(textureSize, textureSize), 86),
  writeJpeg("acacia-wood.jpg", createWoodTexture(textureSize, textureSize), 86),
  writeJpeg("worn-copper.jpg", createCopperTexture(textureSize, textureSize), 88),
  writeJpeg("hero-street-ground.jpg", createHeroStreetGroundTexture(textureSize, textureSize), 88),
  writeJpeg("hero-street-normal.jpg", createHeroStreetNormalTexture(textureSize, textureSize), 90),
  writeJpeg("hero-street-roughness.jpg", createHeroStreetRoughnessTexture(textureSize, textureSize), 88),
  writeJpeg("hero-street-ao.jpg", createHeroStreetAoTexture(textureSize, textureSize), 88)
];

const audioAssets = [
  writeWav("nile-water-boats.wav", synthesizeNileWater(8)),
  writeWav("birds-wind-insects.wav", synthesizeBirdsWindInsects(9)),
  writeWav("market-craft-murmur.wav", synthesizeMarketCraft(8)),
  writeWav("temple-incense-chant.wav", synthesizeTempleChant(10)),
  writeWav("dust-footsteps.wav", synthesizeDustFootsteps(6))
];

await Promise.all([...textureAssets, ...audioAssets]);
await writeFile(manifestPath, `${JSON.stringify(createProvenanceManifest(), null, 2)}\n`, "utf8");

console.log("Generated Step 4 runtime texture and soundscape assets.");

async function writeJpeg(fileName, image, quality) {
  const encoded = jpeg.encode(image, quality);
  await writeFile(path.join(textureDir, fileName), encoded.data);
}

async function writeWav(fileName, samples) {
  await writeFile(path.join(audioDir, fileName), encodeWav(samples, sampleRate));
}

function createImage(width, height, baseColor) {
  const data = Buffer.alloc(width * height * 4);
  const color = parseHex(baseColor);

  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = color.r;
    data[index * 4 + 1] = color.g;
    data[index * 4 + 2] = color.b;
    data[index * 4 + 3] = 255;
  }

  return { data, width, height };
}

function createSandTexture(width, height) {
  const image = createImage(width, height, "#caa66b");

  forEachPixel(image, (x, y) => {
    const n = layeredNoise(x, y, 17, [
      [0.008, 24],
      [0.035, 14],
      [0.11, 7]
    ]);
    const ripple = Math.sin((x * 0.025 + y * 0.008) + n * 0.08) * 7;
    return mixHex("#b88d55", "#ead29a", clamp01((n + ripple) / 62 + 0.48));
  });

  addSpeckles(image, 2400, "#7c5c35", 0.22, 17);
  addSpeckles(image, 1800, "#fff0bd", 0.16, 31);
  return image;
}

function createHeroStreetGroundTexture(width, height) {
  const image = createImage(width, height, "#9a6338");
  const random = seededRandom(1203);

  forEachPixel(image, (x, y) => {
    const n = layeredNoise(x, y, 1203, [
      [0.0025, 42],
      [0.011, 24],
      [0.047, 11],
      [0.18, 4]
    ]);
    const normalizedX = x / width;
    const normalizedY = y / height;
    const wornCenter = Math.exp(-1 * (((normalizedX - 0.5) / 0.34) ** 2));
    const wallGrime = Math.exp(-1 * (((normalizedX - 0.08) / 0.1) ** 2)) * 28
      + Math.exp(-1 * (((normalizedX - 0.92) / 0.1) ** 2)) * 28;
    const leftRut = Math.exp(-1 * (((normalizedX - (0.42 + Math.sin(normalizedY * 18) * 0.025)) / 0.035) ** 2)) * 18;
    const rightRut = Math.exp(-1 * (((normalizedX - (0.58 + Math.cos(normalizedY * 17) * 0.025)) / 0.035) ** 2)) * 16;
    const slowRidge = Math.sin(normalizedY * Math.PI * 7.6 + normalizedX * 4 + n * 0.035) * 6;
    const centerLight = wornCenter * 16;
    const value = clamp01(0.44 + (n + slowRidge + centerLight - wallGrime - leftRut - rightRut) / 126);
    return mixHex("#62371d", "#d2a05d", value);
  });

  for (let index = 0; index < 72; index += 1) {
    drawSoftEllipse(
      image,
      random() * width,
      random() * height,
      18 + random() * 34,
      36 + random() * 72,
      index % 3 === 0 ? "#5f351e" : "#7b4725",
      0.14,
      random() * Math.PI
    );
  }

  for (let index = 0; index < 34; index += 1) {
    const side = index % 2 === 0 ? 0.15 : 0.85;
    drawSoftEllipse(
      image,
      width * side + (random() - 0.5) * width * 0.16,
      random() * height,
      22 + random() * 32,
      88 + random() * 122,
      "#4c2b19",
      0.24,
      random() * 0.18
    );
  }

  for (let pairIndex = 0; pairIndex < 34; pairIndex += 1) {
    const y = (pairIndex / 34) * height + (random() - 0.5) * 24;
    const x = width * (0.45 + Math.sin(pairIndex * 0.73) * 0.08 + (random() - 0.5) * 0.04);
    const rotation = (random() - 0.5) * 0.5;
    drawSoftEllipse(image, x - 11, y, 7 + random() * 3, 18 + random() * 5, "#4d2c1b", 0.24, rotation);
    drawSoftEllipse(image, x + 15, y + 26, 7 + random() * 3, 18 + random() * 5, "#4d2c1b", 0.22, rotation);
  }

  for (let index = 0; index < 70; index += 1) {
    const x = random() * width;
    const y = random() * height;
    drawLine(image, x, y, x + (random() - 0.5) * 76, y + (random() - 0.5) * 28, index % 4 === 0 ? "#d2a866" : "#b8894c");
  }

  addSpeckles(image, 5400, "#4d2e1b", 0.17, 1207);
  addSpeckles(image, 2300, "#d2ad6e", 0.08, 1209);
  addHairlineCracks(image, 28, "#3f2618", 0.2, 1211);
  return image;
}

function createHeroStreetNormalTexture(width, height) {
  const image = createImage(width, height, "#8080ff");

  forEachPixel(image, (x, y) => {
    const dx = layeredNoise(x + 3, y, 1301, [
      [0.012, 22],
      [0.07, 10],
      [0.18, 4]
    ]) - layeredNoise(x - 3, y, 1301, [
      [0.012, 22],
      [0.07, 10],
      [0.18, 4]
    ]);
    const dy = layeredNoise(x, y + 3, 1301, [
      [0.012, 22],
      [0.07, 10],
      [0.18, 4]
    ]) - layeredNoise(x, y - 3, 1301, [
      [0.012, 22],
      [0.07, 10],
      [0.18, 4]
    ]);

    return {
      r: Math.round(clamp01(0.5 + dx / 78) * 255),
      g: Math.round(clamp01(0.5 + dy / 78) * 255),
      b: 232,
      a: 255
    };
  });

  return image;
}

function createHeroStreetRoughnessTexture(width, height) {
  const image = createImage(width, height, "#d8d8d8");

  forEachPixel(image, (x, y) => {
    const n = layeredNoise(x, y, 1401, [
      [0.01, 22],
      [0.06, 9],
      [0.18, 4]
    ]);
    const value = Math.round(clamp01(0.78 + n / 120) * 255);
    return { r: value, g: value, b: value, a: 255 };
  });

  return image;
}

function createHeroStreetAoTexture(width, height) {
  const image = createImage(width, height, "#d0d0d0");

  forEachPixel(image, (x, y) => {
    const normalizedX = x / width;
    const edgeShade = Math.abs(normalizedX - 0.5) * 0.58;
    const rutShade = Math.max(0, 0.08 - Math.abs(normalizedX - 0.43)) * 1.5;
    const n = layeredNoise(x, y, 1501, [
      [0.009, 18],
      [0.04, 8]
    ]);
    const value = Math.round(clamp01(0.78 - edgeShade - rutShade + n / 150) * 255);
    return { r: value, g: value, b: value, a: 255 };
  });

  return image;
}

function createMudbrickTexture(width, height) {
  const image = createImage(width, height, "#74482d");
  const brickW = 156;
  const brickH = 72;
  const mortar = 7;

  forEachPixel(image, (x, y) => {
    const row = Math.floor(y / brickH);
    const offsetX = row % 2 === 0 ? 0 : brickW / 2;
    const localX = positiveModulo(x + offsetX, brickW);
    const localY = positiveModulo(y, brickH);
    const inMortar = localX < mortar || localY < mortar;
    const n = layeredNoise(x, y, 43, [
      [0.011, 20],
      [0.052, 12],
      [0.17, 5]
    ]);

    if (inMortar) {
      return mixHex("#55402f", "#8c6849", clamp01(0.42 + n / 92));
    }

    const sun = Math.sin((x + row * 13) * 0.013) * 7;
    return mixHex("#5f381f", "#a06a3f", clamp01(0.43 + (n + sun) / 88));
  });

  for (let index = 0; index < 34; index += 1) {
    const random = seededRandom(820 + index);
    drawSoftEllipse(
      image,
      random() * width,
      random() * height,
      12 + random() * 18,
      22 + random() * 38,
      "#3f2719",
      0.12,
      random() * Math.PI
    );
  }

  addHairlineCracks(image, 44, "#3f281c", 0.44, 84);
  addSpeckles(image, 4200, "#c08957", 0.12, 91);
  addSpeckles(image, 2800, "#3d2719", 0.12, 92);
  return image;
}

function createPlasterTexture(width, height) {
  const image = createImage(width, height, "#c9bb99");

  forEachPixel(image, (x, y) => {
    const n = layeredNoise(x, y, 61, [
      [0.007, 20],
      [0.034, 12],
      [0.21, 4]
    ]);
    const stain = Math.sin((x + y * 0.7) * 0.006) * 12;
    const drip = Math.max(0, Math.sin(x * 0.017 + n * 0.05)) * 6;
    return mixHex("#8d7a5a", "#d6c8a7", clamp01(0.58 + (n + stain - drip) / 96));
  });

  for (let index = 0; index < 42; index += 1) {
    const random = seededRandom(910 + index);
    drawSoftEllipse(
      image,
      random() * width,
      random() * height,
      18 + random() * 24,
      36 + random() * 80,
      "#6f5f48",
      0.1,
      random() * Math.PI
    );
  }

  addHairlineCracks(image, 36, "#6f6049", 0.42, 118);
  addSpeckles(image, 2400, "#eadab8", 0.08, 127);
  addSpeckles(image, 2600, "#755f43", 0.09, 128);
  return image;
}

function createLimestoneTexture(width, height) {
  const image = createImage(width, height, "#ccc2aa");

  forEachPixel(image, (x, y) => {
    const blockX = Math.floor(x / 220);
    const blockY = Math.floor(y / 136);
    const seam = positiveModulo(x, 220) < 5 || positiveModulo(y + blockX * 18, 136) < 5;
    const n = layeredNoise(x, y, 73, [
      [0.006, 20],
      [0.045, 13],
      [0.16, 5]
    ]);

    if (seam) {
      return mixHex("#827763", "#b6aa92", clamp01(0.4 + n / 95));
    }

    const warm = Math.sin((blockX * 2.9 + blockY * 1.7)) * 8;
    return mixHex("#a99f89", "#eee4ca", clamp01(0.55 + (n + warm) / 94));
  });

  addHairlineCracks(image, 18, "#7d725e", 0.28, 141);
  return image;
}

function createPaintedReliefTexture(width, height) {
  const image = createImage(width, height, "#ead9ad");

  forEachPixel(image, (x, y) => {
    const n = layeredNoise(x, y, 79, [
      [0.015, 12],
      [0.07, 7],
      [0.24, 3]
    ]);
    return mixHex("#d8bd84", "#f5e8c5", clamp01(0.58 + n / 86));
  });

  const palette = ["#1f6d78", "#b54e37", "#d8a741", "#174b3c", "#2a3544"];
  fillRect(image, 0, 32, width, 18, palette[0]);
  fillRect(image, 0, 68, width, 10, palette[2]);
  fillRect(image, 0, 92, width, 14, palette[1]);
  fillRect(image, 0, height - 74, width, 14, palette[3]);
  fillRect(image, 0, height - 42, width, 16, palette[0]);

  for (let x = 24; x < width; x += 48) {
    fillRect(image, x, 34, 22, 14, x % 96 === 0 ? palette[2] : palette[1]);
    fillRect(image, x + 12, height - 70, 22, 14, x % 96 === 0 ? palette[1] : palette[2]);
  }

  for (let index = 0; index < 7; index += 1) {
    const x = 62 + index * 138;
    const y = 180 + Math.sin(index * 1.4) * 8;
    drawStylizedFigure(image, x, y, palette[index % palette.length], palette[(index + 2) % palette.length]);
  }

  for (let x = 32; x < width; x += 76) {
    drawGlyphCluster(image, x, 384 + Math.sin(x * 0.05) * 8, palette[(x / 76) % palette.length | 0]);
  }

  addSpeckles(image, 1400, "#5c432b", 0.12, 212);
  addHairlineCracks(image, 12, "#8d7454", 0.18, 225);
  return image;
}

function createReedTexture(width, height) {
  const image = createImage(width, height, "#5f7f4d");

  forEachPixel(image, (x, y) => {
    const stalk = Math.floor(x / 18);
    const center = Math.abs(positiveModulo(x, 18) - 9) / 9;
    const n = layeredNoise(x, y, 93, [
      [0.018, 16],
      [0.12, 6]
    ]);
    const stripe = (1 - center) * 0.23 + Math.sin(y * 0.025 + stalk) * 0.08;
    return mixHex("#324c2d", "#a7b771", clamp01(0.42 + stripe + n / 100));
  });

  return image;
}

function createLinenTexture(width, height) {
  const image = createImage(width, height, "#e9dfc7");

  forEachPixel(image, (x, y) => {
    const weave = (Math.sin(x * 0.72) + Math.sin(y * 0.68)) * 8;
    const n = layeredNoise(x, y, 101, [
      [0.04, 9],
      [0.19, 4]
    ]);
    return mixHex("#c8b991", "#fff4d5", clamp01(0.58 + (weave + n) / 86));
  });

  return image;
}

function createWaterTexture(width, height) {
  const image = createImage(width, height, "#2f7c8e");

  forEachPixel(image, (x, y) => {
    const waveA = Math.sin(x * 0.026 + y * 0.014) * 20;
    const waveB = Math.sin(x * 0.011 - y * 0.032) * 12;
    const n = layeredNoise(x, y, 119, [
      [0.018, 10],
      [0.12, 5]
    ]);
    return mixHex("#18556a", "#86c9c5", clamp01(0.38 + (waveA + waveB + n) / 110));
  });

  addThinHighlights(image, "#d4fff3", 180, 133);
  return image;
}

function createWoodTexture(width, height) {
  const image = createImage(width, height, "#5b3727");

  forEachPixel(image, (x, y) => {
    const grain = Math.sin(y * 0.04 + Math.sin(x * 0.017) * 2.8) * 19;
    const n = layeredNoise(x, y, 157, [
      [0.012, 12],
      [0.084, 6]
    ]);
    return mixHex("#352015", "#8d6040", clamp01(0.45 + (grain + n) / 102));
  });

  return image;
}

function createCopperTexture(width, height) {
  const image = createImage(width, height, "#9b6543");

  forEachPixel(image, (x, y) => {
    const n = layeredNoise(x, y, 181, [
      [0.015, 20],
      [0.09, 9],
      [0.25, 4]
    ]);
    const tarnish = Math.sin((x - y) * 0.016) * 10;
    return mixHex("#5c7b64", "#c48450", clamp01(0.62 + (n + tarnish) / 105));
  });

  addSpeckles(image, 1100, "#d49b61", 0.18, 191);
  return image;
}

function synthesizeNileWater(durationSeconds) {
  return makeSamples(durationSeconds, (t, random, bandNoise) => {
    const low = Math.sin(Math.PI * 2 * 0.38 * t) * 0.08 + Math.sin(Math.PI * 2 * 0.71 * t + 1.4) * 0.05;
    const ripple = bandNoise(random, 0.17) * 0.22;
    const creak = Math.sin(Math.PI * 2 * 84 * t) * envelopePulse(t, 2.7, 0.18) * 0.035;
    return clampAudio(low + ripple + creak);
  }, 401);
}

function synthesizeBirdsWindInsects(durationSeconds) {
  return makeSamples(durationSeconds, (t, random, bandNoise) => {
    const wind = bandNoise(random, 0.06) * 0.12;
    const insects = Math.sin(Math.PI * 2 * (1900 + Math.sin(t * 8) * 90) * t) * 0.018;
    let chirp = 0;

    for (let beat = 0.6; beat < durationSeconds; beat += 1.35) {
      const local = t - beat;
      if (local >= 0 && local < 0.16) {
        chirp += Math.sin(Math.PI * 2 * (2100 + local * 2800) * t) * Math.sin(local / 0.16 * Math.PI) * 0.18;
      }
    }

    return clampAudio(wind + insects + chirp);
  }, 503);
}

function synthesizeMarketCraft(durationSeconds) {
  return makeSamples(durationSeconds, (t, random, bandNoise) => {
    const murmur = Math.sin(Math.PI * 2 * 125 * t + Math.sin(t * 3) * 2) * 0.035
      + Math.sin(Math.PI * 2 * 182 * t + Math.sin(t * 2.2) * 1.3) * 0.028
      + bandNoise(random, 0.1) * 0.08;
    const hammer = envelopePulse(t, 1.15, 0.045) * Math.sin(Math.PI * 2 * 620 * t) * 0.22;
    const vessel = envelopePulse(t + 0.43, 2.1, 0.08) * Math.sin(Math.PI * 2 * 330 * t) * 0.08;
    return clampAudio(murmur + hammer + vessel);
  }, 607);
}

function synthesizeTempleChant(durationSeconds) {
  return makeSamples(durationSeconds, (t, random, bandNoise) => {
    const drone = Math.sin(Math.PI * 2 * 92 * t) * 0.09
      + Math.sin(Math.PI * 2 * 138 * t + 0.7) * 0.06
      + Math.sin(Math.PI * 2 * 184 * t + 1.8) * 0.035;
    const breath = bandNoise(random, 0.045) * 0.045 * (0.65 + Math.sin(t * 1.4) * 0.35);
    const vessel = envelopePulse(t, 3.8, 0.42) * Math.sin(Math.PI * 2 * 236 * t) * 0.055;
    return clampAudio(drone + breath + vessel);
  }, 701);
}

function synthesizeDustFootsteps(durationSeconds) {
  return makeSamples(durationSeconds, (t, random, bandNoise) => {
    let foot = 0;

    for (let beat = 0.28; beat < durationSeconds; beat += 0.62) {
      const local = t - beat;
      if (local >= 0 && local < 0.13) {
        foot += Math.sin(Math.PI * 2 * 78 * t) * Math.exp(-local * 24) * 0.18;
        foot += bandNoise(random, 0.4) * Math.exp(-local * 18) * 0.08;
      }
    }

    return clampAudio(foot);
  }, 809);
}

function makeSamples(durationSeconds, fn, seed) {
  const count = Math.floor(sampleRate * durationSeconds);
  const samples = new Float32Array(count);
  const random = seededRandom(seed);
  let filteredNoise = 0;

  const bandNoise = (rng, smoothing) => {
    filteredNoise = filteredNoise * (1 - smoothing) + (rng() * 2 - 1) * smoothing;
    return filteredNoise;
  };

  for (let index = 0; index < count; index += 1) {
    samples[index] = fn(index / sampleRate, random, bandNoise);
  }

  return samples;
}

function encodeWav(samples, rate) {
  const buffer = Buffer.alloc(44 + samples.length * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples.length * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples.length * 2, 40);

  for (let index = 0; index < samples.length; index += 1) {
    buffer.writeInt16LE(Math.round(clampAudio(samples[index]) * 32767), 44 + index * 2);
  }

  return buffer;
}

function createProvenanceManifest() {
  const textureNames = [
    "sand-grain.jpg",
    "mudbrick-pbr.jpg",
    "plaster-aged.jpg",
    "limestone-cut.jpg",
    "painted-relief-wall.jpg",
    "reed-bundle.jpg",
    "woven-linen.jpg",
    "nile-water.jpg",
    "acacia-wood.jpg",
    "worn-copper.jpg",
    "hero-street-ground.jpg",
    "hero-street-normal.jpg",
    "hero-street-roughness.jpg",
    "hero-street-ao.jpg"
  ];
  const audioNames = [
    "nile-water-boats.wav",
    "birds-wind-insects.wav",
    "market-craft-murmur.wav",
    "temple-incense-chant.wav",
    "dust-footsteps.wav"
  ];

  return {
    checkedDate,
    generator: "tools/generate-runtime-assets.mjs",
    policy: "Synthetic procedural assets generated by this project. No external media pixels, video frames, scans, or recordings are copied into these files.",
    referencePack: "content/reference-datasets/memphis-beauty-pass-reference-pack.json",
    textures: textureNames.map((fileName) => ({
      file: `/assets/generated/textures/${fileName}`,
      origin: "generated",
      sourceIds: [],
      referenceSourceIds: ["met-open-access", "met-old-kingdom-cattle-relief", "cleveland-open-access", "smithsonian-open-access"],
      licenseStatus: "Project-generated synthetic texture; safe for runtime use by this project."
    })),
    audio: audioNames.map((fileName) => ({
      file: `/assets/generated/audio/${fileName}`,
      origin: "generated",
      sourceIds: [],
      referenceSourceIds: ["natural-earth", "unesco-memphis-necropolis", "tla-earlier-egyptian-hf"],
      licenseStatus: "Project-generated synthetic sound loop; no copied recordings; speech-like layers are non-semantic ambience."
    }))
  };
}

function forEachPixel(image, colorFn) {
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      setPixel(image, x, y, colorFn(x, y));
    }
  }
}

function setPixel(image, x, y, color) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return;
  }

  const parsed = typeof color === "string" ? parseHex(color) : color;
  const index = (Math.floor(y) * image.width + Math.floor(x)) * 4;
  image.data[index] = parsed.r;
  image.data[index + 1] = parsed.g;
  image.data[index + 2] = parsed.b;
  image.data[index + 3] = parsed.a ?? 255;
}

function fillRect(image, x, y, width, height, color) {
  for (let yy = Math.floor(y); yy < y + height; yy += 1) {
    for (let xx = Math.floor(x); xx < x + width; xx += 1) {
      setPixel(image, xx, yy, color);
    }
  }
}

function drawLine(image, x0, y0, x1, y1, color) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));

  for (let step = 0; step <= steps; step += 1) {
    const t = step / Math.max(1, steps);
    setPixel(image, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, color);
  }
}

function drawSoftEllipse(image, centerX, centerY, radiusX, radiusY, color, opacity, rotation) {
  const parsed = parseHex(color);
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const extent = Math.ceil(Math.max(radiusX, radiusY));

  for (let y = Math.floor(centerY - extent); y <= centerY + extent; y += 1) {
    for (let x = Math.floor(centerX - extent); x <= centerX + extent; x += 1) {
      const dx = x - centerX;
      const dy = y - centerY;
      const rx = dx * cos - dy * sin;
      const ry = dx * sin + dy * cos;
      const distance = (rx / radiusX) ** 2 + (ry / radiusY) ** 2;

      if (distance <= 1) {
        const edge = 1 - Math.min(1, distance);
        setPixel(image, x, y, mixColor(getPixel(image, x, y), parsed, opacity * edge));
      }
    }
  }
}

function drawCircle(image, centerX, centerY, radius, color) {
  const minX = Math.floor(centerX - radius);
  const maxX = Math.ceil(centerX + radius);
  const minY = Math.floor(centerY - radius);
  const maxY = Math.ceil(centerY + radius);

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if ((x - centerX) ** 2 + (y - centerY) ** 2 <= radius ** 2) {
        setPixel(image, x, y, color);
      }
    }
  }
}

function drawStylizedFigure(image, x, y, bodyColor, accentColor) {
  drawCircle(image, x, y - 44, 16, "#6b3e2d");
  fillRect(image, x - 10, y - 28, 20, 76, bodyColor);
  fillRect(image, x - 22, y - 3, 12, 56, accentColor);
  drawLine(image, x + 11, y - 12, x + 48, y - 42, "#6b3e2d");
  drawLine(image, x + 11, y + 4, x + 42, y + 22, "#6b3e2d");
  drawLine(image, x - 6, y + 48, x - 24, y + 94, "#6b3e2d");
  drawLine(image, x + 6, y + 48, x + 26, y + 94, "#6b3e2d");
  fillRect(image, x - 28, y + 96, 62, 8, "#2a3544");
}

function drawGlyphCluster(image, x, y, color) {
  fillRect(image, x, y, 11, 42, color);
  drawCircle(image, x + 28, y + 12, 13, color);
  fillRect(image, x + 48, y + 3, 28, 9, color);
  fillRect(image, x + 56, y + 3, 9, 34, color);
  drawLine(image, x + 84, y + 38, x + 116, y + 2, color);
  drawLine(image, x + 116, y + 2, x + 124, y + 42, color);
}

function addSpeckles(image, count, color, opacity, seed) {
  const random = seededRandom(seed);

  for (let index = 0; index < count; index += 1) {
    const x = Math.floor(random() * image.width);
    const y = Math.floor(random() * image.height);
    const base = getPixel(image, x, y);
    setPixel(image, x, y, mixColor(base, parseHex(color), opacity * random()));
  }
}

function addHairlineCracks(image, count, color, opacity, seed) {
  const random = seededRandom(seed);

  for (let index = 0; index < count; index += 1) {
    let x = random() * image.width;
    let y = random() * image.height;
    const segments = 3 + Math.floor(random() * 5);

    for (let segment = 0; segment < segments; segment += 1) {
      const nextX = x + (random() - 0.5) * 110;
      const nextY = y + (random() - 0.5) * 60;
      const crackColor = mixColor(parseHex(color), getPixel(image, Math.floor(x), Math.floor(y)), 1 - opacity);
      drawLine(image, x, y, nextX, nextY, crackColor);
      x = nextX;
      y = nextY;
    }
  }
}

function addThinHighlights(image, color, count, seed) {
  const random = seededRandom(seed);

  for (let index = 0; index < count; index += 1) {
    const x = random() * image.width;
    const y = random() * image.height;
    drawLine(image, x, y, x + 30 + random() * 80, y + (random() - 0.5) * 8, color);
  }
}

function getPixel(image, x, y) {
  const clampedX = Math.min(image.width - 1, Math.max(0, x));
  const clampedY = Math.min(image.height - 1, Math.max(0, y));
  const index = (clampedY * image.width + clampedX) * 4;
  return {
    r: image.data[index],
    g: image.data[index + 1],
    b: image.data[index + 2],
    a: image.data[index + 3]
  };
}

function parseHex(hex) {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
    a: 255
  };
}

function mixHex(from, to, amount) {
  return mixColor(parseHex(from), parseHex(to), amount);
}

function mixColor(from, to, amount) {
  const t = clamp01(amount);
  return {
    r: Math.round(from.r + (to.r - from.r) * t),
    g: Math.round(from.g + (to.g - from.g) * t),
    b: Math.round(from.b + (to.b - from.b) * t),
    a: 255
  };
}

function layeredNoise(x, y, seed, layers) {
  return layers.reduce((total, [scale, strength], index) => {
    return total + valueNoise(x * scale, y * scale, seed + index * 97) * strength;
  }, 0);
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothstep(x - x0);
  const ty = smoothstep(y - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return lerp(lerp(a, b, tx), lerp(c, d, tx), ty) * 2 - 1;
}

function hash2(x, y, seed) {
  let n = x * 374761393 + y * 668265263 + seed * 2246822519;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}

function seededRandom(seed) {
  let value = seed >>> 0;

  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

function clampAudio(value) {
  return Math.min(0.98, Math.max(-0.98, value));
}

function envelopePulse(t, interval, width) {
  const local = positiveModulo(t, interval);
  if (local > width) {
    return 0;
  }

  return Math.sin((local / width) * Math.PI) ** 2;
}
