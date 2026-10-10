import * as THREE from 'three';

export interface LabelSpriteOptions {
  color?: string;
  backgroundColor?: string;
  fontSize?: number;
  padding?: number;
}

/**
 * 模型标注 Sprite（559 Phase 2，数字孪生设备标签）：
 * Canvas 2D 文字 → CanvasTexture → THREE.Sprite。缺省白字 + 半透明深底圆角。
 * 挂为模型子节点后随模型 visible/缩放联动；dispose 由 SceneManager 统一回收（map + material）。
 */
export function createLabelSprite(text: string, options: LabelSpriteOptions = {}): THREE.Sprite {
  const fontSize = options.fontSize ?? 42;
  const padding = options.padding ?? 18;
  const color = options.color ?? '#ffffff';
  const backgroundColor = options.backgroundColor ?? 'rgba(12, 20, 36, 0.72)';

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  let sprite: THREE.Sprite;
  if (!context) {
    // 无 2D 上下文（极端 headless）：退化为空白 Sprite，保持场景装配不中断
    sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true }));
    sprite.name = 'label';
    return sprite;
  }
  /* v8 ignore start -- 真实 2D 画布绘制路径：单测环境（happy-dom/node）无 2D 上下文恒走上方空白降级，
     真实路径仅浏览器可达（gallery e2e 像素探测覆盖）。覆盖率豁免（plan 465 Phase 5 政策：显式列名，不降阈值）。 */
  const font = `${fontSize}px sans-serif`;
  context.font = font;
  const metrics = context.measureText(text);
  canvas.width = Math.ceil(metrics.width + padding * 2);
  canvas.height = Math.ceil(fontSize + padding * 2);
  context.font = font;
  context.fillStyle = backgroundColor;
  const radius = Math.min(12, canvas.height / 2);
  context.beginPath();
  context.roundRect(0, 0, canvas.width, canvas.height, radius);
  context.fill();
  context.fillStyle = color;
  context.textBaseline = 'middle';
  context.fillText(text, padding, canvas.height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.name = 'label';
  // 归一化纵横比：高度约 0.5 世界单位，宽度按画布比例
  sprite.scale.set(0.5 * (canvas.width / canvas.height), 0.5, 1);
  sprite.renderOrder = 10;
  return sprite;
}
/* v8 ignore stop */
export const __labelSpriteCanvasPathIgnored = true;

/** Sprite 资源回收（texture + material；Sprite 共享几何体不 dispose）。 */
export function disposeLabelSprite(sprite: THREE.Sprite): void {
  const material = sprite.material as THREE.SpriteMaterial;
  material.map?.dispose();
  material.dispose();
}
