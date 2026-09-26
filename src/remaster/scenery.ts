// scenery - builds the Three.js world around the road: sky, Mt. Fuji backdrop, striped terrain,
// trees, posts, sponsor billboards, grandstands and the start/finish gantry.
import * as THREE from 'three';
import type { Track } from '../sim/Track';
import { buildSceneryLayout, groundHeight, seededRandom, type SceneryItem } from '../sim/scenery';
import { buildTerrainArrays } from './terrainGeometry';
import type { Theme } from './themes';
import { drawCustomSign } from './signArt';

export interface Scenery {
  group: THREE.Group;
  /** Moves camera-relative layers (sky, mountains, far ground) with the camera. */
  update(camera: THREE.Vector3): void;
  /** Height of the flat ground plane. */
  planeY: number;
  /** Horizon colour and fog distance for this course. */
  haze: number;
  fogFar: number;
}

function canvasTexture(
  width: number,
  height: number,
  draw: (ctx: CanvasRenderingContext2D) => void
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d') as CanvasRenderingContext2D);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const BRAND_COLORS: Record<string, [string, string]> = {
  TURBO: ['#d81f26', '#ffffff'],
  VELOX: ['#0b4fa8', '#ffd400'],
  'NOVA OIL': ['#ffd400', '#1a1a1a'],
  KINETIC: ['#111111', '#ff6a00'],
  APEX: ['#ffffff', '#c8102e'],
  ZENITH: ['#0a7d4b', '#ffffff'],
  HALCYON: ['#5b2a86', '#ffffff'],
};

function billboardTexture(brand: string): THREE.CanvasTexture {
  const [bg, fg] = BRAND_COLORS[brand] ?? ['#333333', '#ffffff'];
  return canvasTexture(512, 192, (ctx) => {
    if (drawCustomSign(ctx, brand)) return;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 512, 192);
    ctx.fillStyle = fg;
    ctx.fillRect(0, 0, 512, 14);
    ctx.fillRect(0, 178, 512, 14);
    ctx.font = 'bold 96px Arial Black, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(brand, 256, 98);
  });
}

function crowdTexture(): THREE.CanvasTexture {
  const rand = seededRandom(77);
  const tex = canvasTexture(256, 64, (ctx) => {
    ctx.fillStyle = '#7d7f86';
    ctx.fillRect(0, 0, 256, 64);
    const palette = ['#d22', '#fc2', '#28c', '#eee', '#3a4', '#e7a', '#333'];
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = palette[Math.floor(rand() * palette.length)];
      ctx.fillRect(rand() * 256, rand() * 64, 3, 3);
    }
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(4, 1);
  return tex;
}

function checkerTexture(cols: number, rows: number): THREE.CanvasTexture {
  const tex = canvasTexture(cols * 16, rows * 16, (ctx) => {
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? '#ffffff' : '#111111';
        ctx.fillRect(x * 16, y * 16, 16, 16);
      }
    }
  });
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function gantryBanner(): THREE.CanvasTexture {
  return canvasTexture(1024, 96, (ctx) => {
    ctx.fillStyle = '#1b1b22';
    ctx.fillRect(0, 0, 1024, 96);
    for (let x = 0; x < 1024; x += 32) {
      ctx.fillStyle = (x / 32) % 2 === 0 ? '#fff' : '#111';
      ctx.fillRect(x, 0, 32, 12);
      ctx.fillRect(x, 84, 32, 12);
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 60px Arial Black, Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START / FINISH', 512, 50);
  });
}

function createSky(theme: Theme): THREE.Mesh {
  const zenith = new THREE.Color(theme.skyZenith);
  const horizon = new THREE.Color(theme.haze);
  const geo = new THREE.SphereGeometry(25000, 24, 16);
  const pos = geo.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = Math.max(0, Math.min(1, pos.getY(i) / 25000));
    c.copy(horizon).lerp(zenith, Math.pow(t, 0.6));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    })
  );
  mesh.renderOrder = -2;
  return mesh;
}

/** Cone-ish mountain with a wavy snowline and faux side lighting, blended into haze at its foot. */
function createMountain(
  radius: number,
  topRadius: number,
  height: number,
  snowLine: number,
  seed: number,
  theme: Theme
): THREE.Mesh {
  const horizon = new THREE.Color(theme.haze);
  const geo = new THREE.CylinderGeometry(topRadius, radius, height, 48, 14, true);
  const pos = geo.getAttribute('position');
  const rand = seededRandom(seed);
  const phase = rand() * 6;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color();
  const [forestHex, rockHex, snowHex] = theme.hills;
  const rock = new THREE.Color(rockHex);
  const forest = new THREE.Color(forestHex);
  const snow = new THREE.Color(snowHex);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const t = (y + height / 2) / height;
    const angle = Math.atan2(x, z);
    const wave = 0.05 * Math.sin(angle * 7 + phase) + 0.03 * Math.sin(angle * 17 + phase * 2);
    const snowMix = THREE.MathUtils.smoothstep(t, snowLine + wave - 0.03, snowLine + wave + 0.03);
    c.copy(forest)
      .lerp(rock, THREE.MathUtils.smoothstep(t, 0.1, 0.5))
      .lerp(snow, snowMix);
    const shade = 0.8 + 0.2 * Math.cos(angle - 0.8);
    c.multiplyScalar(shade);
    c.lerp(horizon, 1 - THREE.MathUtils.smoothstep(t, 0, 0.35));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return new THREE.Mesh(
    geo,
    new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, side: THREE.DoubleSide })
  );
}

function createBackdrop(theme: Theme): THREE.Group {
  const group = new THREE.Group();
  if (theme.backdrop === 'fuji') {
    const fuji = createMountain(3800, 220, 1800, 0.55, 3, theme);
    fuji.position.set(-6500, 900, 7200);
    group.add(fuji);
  }
  const rand = seededRandom(9);
  for (let i = 0; i < 16; i++) {
    const angle = (i / 16) * Math.PI * 2 + rand() * 0.3;
    const dist = 9000 + rand() * 3000;
    const h = 500 + rand() * 700;
    const m = createMountain(1200 + rand() * 1400, 60, h, 0.98, 20 + i, theme);
    m.position.set(Math.sin(angle) * dist, h / 2, Math.cos(angle) * dist);
    group.add(m);
  }
  group.add(createClouds());
  return group;
}

/** Soft puffy clouds as camera-facing sprites, part of the camera-relative backdrop. */
function createClouds(): THREE.Group {
  const group = new THREE.Group();
  const rand = seededRandom(31);
  const texture = canvasTexture(256, 128, (ctx) => {
    for (let i = 0; i < 9; i++) {
      const x = 40 + rand() * 176;
      const y = 50 + rand() * 40;
      const r = 24 + rand() * 30;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(255,255,255,0.9)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  const material = new THREE.SpriteMaterial({
    map: texture,
    fog: false,
    transparent: true,
    depthWrite: false,
    opacity: 0.85,
  });
  for (let i = 0; i < 16; i++) {
    const sprite = new THREE.Sprite(material);
    const angle = rand() * Math.PI * 2;
    const dist = 9000 + rand() * 6000;
    sprite.position.set(Math.sin(angle) * dist, 1400 + rand() * 1800, Math.cos(angle) * dist);
    const w = 2800 + rand() * 2600;
    sprite.scale.set(w, w * 0.4, 1);
    sprite.renderOrder = -1;
    group.add(sprite);
  }
  return group;
}

function facingRoad(heading: number, lateral: number): number {
  // Right of heading h is (-cos h, 0, -sin h); a board on the right faces left, and vice versa.
  return lateral > 0
    ? Math.atan2(Math.cos(heading), Math.sin(heading))
    : Math.atan2(-Math.cos(heading), -Math.sin(heading));
}

export function createScenery(track: Track, theme: Theme): Scenery {
  const group = new THREE.Group();
  const width = track.def.roadWidth;
  const centre = track.buildCenterline(4);
  const planeY = Math.min(...centre.map((p) => p.y)) - 6;

  // Terrain ribbon and the flat ground beyond it.
  const { positions, colors, indices } = buildTerrainArrays(centre, width, planeY, theme);
  const terrainGeo = new THREE.BufferGeometry();
  terrainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  terrainGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  terrainGeo.setIndex(new THREE.BufferAttribute(indices, 1));
  terrainGeo.computeVertexNormals();
  group.add(new THREE.Mesh(terrainGeo, new THREE.MeshLambertMaterial({ vertexColors: true })));

  const farGround = new THREE.Mesh(
    new THREE.PlaneGeometry(60000, 60000),
    new THREE.MeshLambertMaterial({ color: theme.farGround })
  );
  farGround.rotation.x = -Math.PI / 2;
  group.add(farGround);

  const sky = createSky(theme);
  const backdrop = createBackdrop(theme);
  group.add(sky, backdrop);

  const items = buildSceneryLayout(track);
  const place = (item: SceneryItem) => {
    const pose = track.poseAt(item.s, item.lateral);
    const roadY = track.poseAt(item.s).y;
    return { pose, y: groundHeight(roadY, planeY, item.lateral, width) };
  };

  // Trees (instanced).
  // Thin the layout to this theme's density with a stable hash, so a course always looks the same.
  const keep = Math.min(1, theme.treeDensity / 0.65);
  const trees = items
    .filter((i) => i.kind === 'tree')
    .filter((_, idx) => (Math.imul(idx + 1, 2654435761) >>> 0) / 4294967296 < keep);
  const treeShape = {
    pine: {
      crown: new THREE.ConeGeometry(2.2, 7, 8).translate(0, 5.5, 0),
      trunk: new THREE.CylinderGeometry(0.3, 0.4, 2.5, 6).translate(0, 1.25, 0),
      hue: 0.3,
    },
    round: {
      crown: new THREE.IcosahedronGeometry(2.6, 1).scale(1, 0.85, 1).translate(0, 5.2, 0),
      trunk: new THREE.CylinderGeometry(0.3, 0.42, 3.4, 6).translate(0, 1.7, 0),
      hue: 0.27,
    },
    palm: {
      crown: new THREE.ConeGeometry(3.4, 1.1, 7).translate(0, 8.6, 0),
      trunk: new THREE.CylinderGeometry(0.2, 0.32, 8.2, 6).translate(0, 4.1, 0),
      hue: 0.2,
    },
  }[theme.trees];
  const foliage = new THREE.InstancedMesh(
    treeShape.crown,
    new THREE.MeshLambertMaterial({ color: 0xffffff }),
    trees.length
  );
  const trunks = new THREE.InstancedMesh(
    treeShape.trunk,
    new THREE.MeshLambertMaterial({ color: 0x5b3a1e }),
    trees.length
  );
  const m = new THREE.Matrix4();
  const tint = new THREE.Color();
  trees.forEach((t, i) => {
    const { pose, y } = place(t);
    m.makeScale(t.scale ?? 1, t.scale ?? 1, t.scale ?? 1).setPosition(pose.x, y, pose.z);
    foliage.setMatrixAt(i, m);
    trunks.setMatrixAt(i, m);
    tint.setHSL(treeShape.hue + ((i * 37) % 10) * 0.005, 0.5, 0.2 + ((i * 13) % 10) * 0.012);
    foliage.setColorAt(i, tint);
  });
  group.add(foliage, trunks);

  // Roadside marker posts (instanced).
  const posts = items.filter((i) => i.kind === 'post');
  const postMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.25, 1.1, 0.25).translate(0, 0.55, 0),
    new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }),
    posts.length
  );
  posts.forEach((p, i) => {
    const { pose, y } = place(p);
    m.makeTranslation(pose.x, y, pose.z);
    postMesh.setMatrixAt(i, m);
  });
  group.add(postMesh);

  // Sponsor billboards.
  const postMat = new THREE.MeshLambertMaterial({ color: 0x9a9aa3 });
  const textures = new Map<string, THREE.CanvasTexture>();
  for (const b of items.filter((i) => i.kind === 'billboard')) {
    const brand = b.brand ?? '';
    if (!textures.has(brand)) textures.set(brand, billboardTexture(brand));
    const { pose, y } = place(b);
    const w = b.width ?? 8;
    const board = new THREE.Group();
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w, 3),
      new THREE.MeshBasicMaterial({ map: textures.get(brand) })
    );
    face.position.y = 3.4;
    const back = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 3.2, 0.15), postMat);
    back.position.set(0, 3.4, -0.1);
    board.add(back, face);
    for (const dx of [-w / 2 + 0.6, w / 2 - 0.6]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2, 0.2), postMat);
      leg.position.set(dx, 1, -0.1);
      board.add(leg);
    }
    board.position.set(pose.x, y, pose.z);
    board.rotation.y = facingRoad(pose.heading, b.lateral);
    group.add(board);
  }

  // Grandstands.
  const crowd = crowdTexture();
  for (const g of items.filter((i) => i.kind === 'grandstand')) {
    const { pose, y } = place(g);
    const stand = new THREE.Group();
    const len = g.width ?? 100;
    const mat = new THREE.MeshLambertMaterial({ map: crowd });
    for (let k = 0; k < 3; k++) {
      const tier = new THREE.Mesh(new THREE.BoxGeometry(3, 2 + k * 2, len), mat);
      tier.position.set(1.5 + k * 3, (2 + k * 2) / 2, 0);
      stand.add(tier);
    }
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(11, 0.3, len + 2),
      new THREE.MeshLambertMaterial({ color: 0xe8e8ee })
    );
    roof.position.set(5, 8.5, 0);
    stand.add(roof);
    stand.position.set(pose.x, y, pose.z);
    stand.rotation.y = -pose.heading;
    // Local +x is the driver's left; mirror the stand when it sits on the right.
    stand.scale.x = g.lateral > 0 ? -1 : 1;
    group.add(stand);
  }

  // Start line and gantry.
  const start = items.find((i) => i.kind === 'startline');
  if (start) {
    const { pose, y } = place(start);
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(width, 1.6),
      new THREE.MeshBasicMaterial({ map: checkerTexture(14, 2) })
    );
    line.rotation.set(-Math.PI / 2, 0, 0);
    const holder = new THREE.Group();
    holder.add(line);
    holder.position.set(pose.x, y + 0.03, pose.z);
    holder.rotation.y = -pose.heading;
    group.add(holder);

    const gantry = new THREE.Group();
    const steel = new THREE.MeshLambertMaterial({ color: 0xd9dbe2 });
    for (const dx of [-(width / 2 + 2), width / 2 + 2]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 7, 0.8), steel);
      pillar.position.set(dx, 3.5, 0);
      gantry.add(pillar);
    }
    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(width + 4.8, 1.6, 0.6),
      new THREE.MeshBasicMaterial({ map: gantryBanner() })
    );
    banner.position.set(0, 7, 0);
    banner.rotation.y = Math.PI; // text reads correctly from the approaching driver's side
    gantry.add(banner);
    gantry.position.set(pose.x, y, pose.z);
    gantry.rotation.y = -pose.heading;
    group.add(gantry);
  }

  return {
    group,
    planeY,
    haze: theme.haze,
    fogFar: theme.fogFar,
    update(camera) {
      sky.position.copy(camera);
      backdrop.position.set(camera.x, planeY - 40, camera.z);
      farGround.position.set(camera.x, planeY - 0.05, camera.z);
    },
  };
}
