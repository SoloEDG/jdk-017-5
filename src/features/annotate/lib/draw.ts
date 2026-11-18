import type { LabelBox } from "./layout";
import { labelFont } from "./measure";

function pill(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = h / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * 把标注绘制到任意 2D 上下文。预览与导出共用同一入口，
 * 直接画在成品画布上（而非截取界面层），因此透明背景下
 * 的引线、不同分辨率下的布局都与预览一一对应。
 */
export function drawLabels(
  ctx: CanvasRenderingContext2D,
  boxes: LabelBox[],
  selectedId: string | null = null,
) {
  for (const b of boxes) {
    if (b.reason) continue;
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const dx = cx - b.anchorX;
    const dy = cy - b.anchorY;

    // 引线：从锚点连到标签盒边缘，白色衬底保证任何画面上都可读
    const tx = dx === 0 ? Infinity : b.w / 2 / Math.abs(dx);
    const ty = dy === 0 ? Infinity : b.h / 2 / Math.abs(dy);
    const t = Math.min(tx, ty);
    const ex = cx - dx * t;
    const ey = cy - dy * t;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(b.anchorX, b.anchorY);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = Math.max(1.5, b.fontPx * 0.16);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.anchorX, b.anchorY);
    ctx.lineTo(ex, ey);
    ctx.strokeStyle = "rgba(78,126,91,0.95)";
    ctx.lineWidth = Math.max(1, b.fontPx * 0.07);
    ctx.stroke();

    // 锚点
    ctx.beginPath();
    ctx.arc(b.anchorX, b.anchorY, Math.max(2.5, b.fontPx * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.95)";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(b.anchorX, b.anchorY, Math.max(1.5, b.fontPx * 0.11), 0, Math.PI * 2);
    ctx.fillStyle = "#4e7e5b";
    ctx.fill();

    // 标签底与文字
    pill(ctx, b.x, b.y, b.w, b.h);
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.fill();
    pill(ctx, b.x, b.y, b.w, b.h);
    ctx.strokeStyle =
      b.id === selectedId ? "rgba(78,126,91,0.95)" : "rgba(78,126,91,0.35)";
    ctx.lineWidth = Math.max(
      1,
      b.fontPx * (b.id === selectedId ? 0.08 : 0.045),
    );
    ctx.stroke();
    ctx.font = labelFont(b.fontPx);
    ctx.fillStyle = "#2f3d34";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.text, cx, cy + b.fontPx * 0.05);
  }
}
