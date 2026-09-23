import * as THREE from 'three';

function createRoundedRectShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x, y + radius);
  shape.lineTo(x, y + height - radius);
  shape.quadraticCurveTo(x, y + height, x + radius, y + height);
  shape.lineTo(x + width - radius, y + height);
  shape.quadraticCurveTo(x + width, y + height, x + width, y + height - radius);
  shape.lineTo(x + width, y + radius);
  shape.quadraticCurveTo(x + width, y, x + width - radius, y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x, y, x, y + radius);
  return shape;
}

function applySkinUVs(geometry, skinW, skinH, backZ) {
  geometry.computeBoundingBox();
  const pos = geometry.attributes.position;
  const uvs = new Float32Array(pos.count * 2);
  
  const wrapSize = 12; // distance texture goes into sides
  const totalW = skinW + wrapSize * 2;
  const totalH = skinH + wrapSize * 2;
  const R = 12;

  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i);
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Distance from the very back of the phone
    // Assuming back of phone faces +Z
    let z_dist = backZ - z; 
    if (z_dist < 0) z_dist = 0; 
    if (z_dist > 15) z_dist = 15; // Cap the wrap stretch

    let ax = Math.abs(x);
    let ay = Math.abs(y);
    let coreX = skinW/2 - R; 
    let coreY = skinH/2 - R;

    let u_pos = x;
    let v_pos = y;

    // Push coordinates to map sides continuously
    if (ax > coreX && ay > coreY) {
      // Corner
      let cx = Math.sign(x) * coreX;
      let cy = Math.sign(y) * coreY;
      let dx = x - cx;
      let dy = y - cy;
      let len = Math.sqrt(dx*dx + dy*dy);
      if (len > 0) {
         u_pos = x + (dx/len) * z_dist;
         v_pos = y + (dy/len) * z_dist;
      }
    } else if (ax > coreX) {
      // Side edge
      u_pos = x + Math.sign(x) * z_dist;
    } else if (ay > coreY) {
      // Top/bottom edge
      v_pos = y + Math.sign(y) * z_dist;
    }

    let u = (u_pos / totalW) + 0.5;
    let v = (v_pos / totalH) + 0.5;
    uvs[i * 2] = u;
    uvs[i * 2 + 1] = v;
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
}

export function createPhoneModel() {
  const group = new THREE.Group();

  const W = 71.5;
  const H = 147.5;
  const D = 7.85;
  const R = 12;

  const extrudeSettings = {
    depth: D,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.5,
    bevelThickness: 0.5
  };

  // --- 1. iPhone BODY ---
  const bodyShape = createRoundedRectShape(W, H, R);
  const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, extrudeSettings);
  bodyGeo.center(); // centers around Z=0, so back is at +D/2
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x222222,
    metalness: 0.8,
    roughness: 0.3
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  group.add(body);

  // --- 2. CAMERA BUMP & LENSES ---
  const bumpW = 36;
  const bumpH = 38;
  const bumpD = 1.5; // less depth since it sits on back
  const bumpShape = createRoundedRectShape(bumpW, bumpH, 8);
  
  // Lenses holes in the bump shape
  const l1 = new THREE.Path(); l1.absarc(-8, 9, 6.5, 0, Math.PI * 2, false);
  const l2 = new THREE.Path(); l2.absarc(-8, -9, 6.5, 0, Math.PI * 2, false);
  const l3 = new THREE.Path(); l3.absarc(8, 0, 6.5, 0, Math.PI * 2, false);
  bumpShape.holes.push(l1, l2, l3);

  const bumpExtrude = {
    depth: bumpD,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.2,
    bevelThickness: 0.2
  };
  const bumpGeo = new THREE.ExtrudeGeometry(bumpShape, bumpExtrude);
  bumpGeo.center();
  
  const bumpMat = new THREE.MeshStandardMaterial({
    color: 0x111111,
    metalness: 0.8,
    roughness: 0.3
  });
  const cameraBump = new THREE.Mesh(bumpGeo, bumpMat);
  
  // Position bump on the back (+Z)
  const bumpX = -W/2 + 18 + 4;
  const bumpY = H/2 - 19 - 4;
  const bumpZ = D/2 + bumpD/2 - 0.2;
  cameraBump.position.set(bumpX, bumpY, bumpZ);
  group.add(cameraBump);

  // Lenses meshes (Glass)
  const lensGeo = new THREE.CylinderGeometry(6, 6, bumpD + 1, 32);
  lensGeo.rotateX(Math.PI / 2);
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x050505,
    metalness: 0.9,
    roughness: 0.1,
    clearcoat: 1.0
  });
  const p1 = new THREE.Mesh(lensGeo, lensMat); p1.position.set(bumpX - 8, bumpY + 9, bumpZ);
  const p2 = new THREE.Mesh(lensGeo, lensMat); p2.position.set(bumpX - 8, bumpY - 9, bumpZ);
  const p3 = new THREE.Mesh(lensGeo, lensMat); p3.position.set(bumpX + 8, bumpY, bumpZ);
  group.add(p1, p2, p3);


  // --- 3. SKIN SHELL ---
  // Shared Skin Material
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.6,
    metalness: 0.1,
    transparent: true,
    opacity: 0.9,
    side: THREE.DoubleSide
  });

  // Body Skin
  const skinW = W + 0.2;
  const skinH = H + 0.2;
  const skinD = D + 0.2;
  const bodySkinShape = createRoundedRectShape(skinW, skinH, R + 0.1);
  const skinExtrude = {
    depth: skinD,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.5,
    bevelThickness: 0.5
  };
  const bodySkinGeo = new THREE.ExtrudeGeometry(bodySkinShape, skinExtrude);
  bodySkinGeo.center();
  
  // Camera Bump Skin
  const bumpSkinW = bumpW + 0.3;
  const bumpSkinH = bumpH + 0.3;
  const bumpSkinD = bumpD + 0.3;
  const bumpSkinShape = createRoundedRectShape(bumpSkinW, bumpSkinH, 8.1);
  bumpSkinShape.holes.push(l1, l2, l3); // same holes so lenses show
  
  const bumpSkinExtrude = {
    depth: bumpSkinD,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.2,
    bevelThickness: 0.2
  };
  const bumpSkinGeo = new THREE.ExtrudeGeometry(bumpSkinShape, bumpSkinExtrude);
  bumpSkinGeo.center();
  bumpSkinGeo.translate(bumpX, bumpY, bumpZ); // translate geo so it shares world space for UV mapping

  // Base Z for the back face of the skin is approx D/2 + 0.1 + 0.5 (bevel)
  const backZ = D/2 + 0.6;
  
  applySkinUVs(bodySkinGeo, skinW, skinH, backZ);
  applySkinUVs(bumpSkinGeo, skinW, skinH, backZ); // use skinW, skinH to map seamlessly!

  const bodySkin = new THREE.Mesh(bodySkinGeo, skinMat);
  const bumpSkin = new THREE.Mesh(bumpSkinGeo, skinMat);
  
  // --- 4. FRONT SCREEN (GLASS) ---
  // Prevents the skin from covering the actual phone screen
  const screenW = W - 1.0;
  const screenH = H - 1.0;
  const screenR = R - 0.5;
  const screenShape = createRoundedRectShape(screenW, screenH, screenR);
  const screenGeo = new THREE.ShapeGeometry(screenShape);
  const screenMat = new THREE.MeshPhysicalMaterial({
    color: 0x020202,
    metalness: 0.2,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.02
  });
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  
  // bodySkinGeo has depth = (D + 0.2) and bevelThickness = 0.6
  // Total skin depth = D + 0.2 + 1.2 = D + 1.4
  // The front of the skin after centering is at -(D + 1.4) / 2
  const skinFrontZ = -(D + 1.4) / 2;
  screenMesh.position.set(0, 0, skinFrontZ - 0.05);
  screenMesh.rotation.y = Math.PI; // Make normal face outward (-Z)
  
  group.add(bodySkin, bumpSkin, screenMesh);

  return { phoneGroup: group, skinMaterial: skinMat };
}
