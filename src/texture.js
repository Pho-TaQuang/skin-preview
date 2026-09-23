import * as THREE from 'three';

export class TextureManager {
  constructor(onTextureUpdate) {
    this.onTextureUpdate = onTextureUpdate;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    
    // We don't want it to repeat, but rather clamp to edge 
    // so if the image is smaller it doesn't tile, but for skin wrap, 
    // usually we want it to bleed or cover.
    this.texture.wrapS = THREE.ClampToEdgeWrapping;
    this.texture.wrapT = THREE.ClampToEdgeWrapping;
    
    this.image = null;
    this.params = {
      fit: 'cover',
      scale: 1,
      offsetX: 0,
      offsetY: 0
    };
    
    // Load a default grid texture to make it obvious where UVs are before drop
    this.drawPlaceholder();
  }
  
  drawPlaceholder() {
    const physicalW = 95.5;
    const physicalH = 171.5;
    const canvasW = 2048;
    const canvasH = Math.round(canvasW * (physicalH / physicalW));

    this.canvas.width = canvasW;
    this.canvas.height = canvasH;
    this.ctx.fillStyle = '#1a1a24';
    this.ctx.fillRect(0, 0, canvasW, canvasH);
    
    this.ctx.strokeStyle = '#333344';
    this.ctx.lineWidth = 4;
    for (let i = 0; i <= Math.max(canvasW, canvasH); i += 128) {
      this.ctx.beginPath();
      this.ctx.moveTo(i, 0);
      this.ctx.lineTo(i, canvasH);
      this.ctx.stroke();
      this.ctx.beginPath();
      this.ctx.moveTo(0, i);
      this.ctx.lineTo(canvasW, i);
      this.ctx.stroke();
    }
    
    this.ctx.fillStyle = '#555577';
    this.ctx.font = '80px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('DROP IMAGE HERE', canvasW/2, canvasH/2);
    
    this.texture.needsUpdate = true;
    if (this.onTextureUpdate) this.onTextureUpdate(this.texture);
  }

  handleImageDrop(file) {
    console.log("handleImageDrop called with file:", file);
    const reader = new FileReader();
    reader.onload = (e) => {
      console.log("FileReader loaded data, length:", e.target.result.length);
      const img = new Image();
      img.onload = () => {
        console.log("Image loaded:", img.width, "x", img.height);
        this.image = img;
        this.updateTexture();
      };
      img.onerror = (err) => {
        console.error("Image load error:", err);
      }
      img.src = e.target.result;
    };
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
    }
    reader.readAsDataURL(file);
  }

  updateParams(newParams) {
    this.params = { ...this.params, ...newParams };
    if (this.image) {
      this.updateTexture();
    }
  }

  updateTexture() {
    if (!this.image) return;

    const physicalW = 95.5;
    const physicalH = 171.5;
    const canvasW = 2048;
    const canvasH = Math.round(canvasW * (physicalH / physicalW));

    this.canvas.width = canvasW;
    this.canvas.height = canvasH;

    // Fill background with black to ensure we see it
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, canvasW, canvasH);

    let drawWidth, drawHeight, startX, startY;

    const imgAspect = this.image.width / this.image.height;
    const phoneAspect = physicalW / physicalH; 

    if (this.params.fit === 'cover') {
      if (imgAspect > phoneAspect) {
        drawHeight = canvasH;
        drawWidth = drawHeight * imgAspect;
      } else {
        drawWidth = canvasW;
        drawHeight = drawWidth / imgAspect;
      }
    } else { // contain
      if (imgAspect > phoneAspect) {
        drawWidth = canvasW;
        drawHeight = drawWidth / imgAspect;
      } else {
        drawHeight = canvasH;
        drawWidth = drawHeight * imgAspect;
      }
    }

    drawWidth *= this.params.scale;
    drawHeight *= this.params.scale;

    // Center image and apply offset
    startX = (canvasW - drawWidth) / 2 + (this.params.offsetX * canvasW);
    startY = (canvasH - drawHeight) / 2 - (this.params.offsetY * canvasH);

    this.ctx.drawImage(this.image, startX, startY, drawWidth, drawHeight);
    
    this.texture.needsUpdate = true;
    if (this.onTextureUpdate) {
      this.onTextureUpdate(this.texture);
    }
  }
}
