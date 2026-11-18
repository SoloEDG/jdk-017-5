import type { Projection } from "../../../shared/types";
import { clamp, radians } from "../../../shared/math";

export interface AnchorPoint {
  /** 画布像素坐标（画布为 size × size） */
  x: number;
  y: number;
  /** 锚点与画面中心轴的角距离（度），用于显示范围判定 */
  theta: number;
}

/**
 * 将源全景图中的锚点 (u, v) 投影到输出画布。
 * 与 projectPoint（屏幕 → 全景）严格互逆，因此锚点会随星球旋转、
 * 跨越经线与靠近极点时和底层像素走完全相同的路径。
 */
export function anchorToScreen(
  u: number,
  v: number,
  size: number,
  p: Projection,
): AnchorPoint {
  const lambda = (u - p.yaw / 360) * Math.PI * 2;
  const ring = Math.sin(v * Math.PI);
  const vx = ring * Math.cos(lambda);
  let vy = Math.cos(v * Math.PI);
  let vz = ring * Math.sin(lambda);
  // 撤销 projectPoint 中的俯仰旋转（正变换的逆）
  const tilt = radians(p.pitch);
  const rotatedY = vy * Math.cos(tilt) + vz * Math.sin(tilt);
  vz = -vy * Math.sin(tilt) + vz * Math.cos(tilt);
  vy = rotatedY;
  const toward = p.mode === "planet" ? -vy : vy;
  const theta = Math.acos(clamp(toward, -1, 1));
  const angle = Math.atan2(vz, vx) - radians(p.roll);
  const radius = Math.tan(theta / 2) * p.zoom * (size / 2);
  return {
    x: size / 2 + radius * Math.cos(angle),
    y: size / 2 + radius * Math.sin(angle),
    theta: (theta * 180) / Math.PI,
  };
}
