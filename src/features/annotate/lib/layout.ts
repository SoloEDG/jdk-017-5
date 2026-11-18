import type { Label, Projection } from "../../../shared/types";
import { clamp } from "../../../shared/math";
import { anchorToScreen } from "./sphere";
import { textWidth } from "./measure";

/** 隐藏原因：超出显示范围 / 锚点移出画面 */
export type HiddenReason = "range" | "outside" | null;

export interface LabelBox {
  id: string;
  text: string;
  pinned: boolean;
  anchorX: number;
  anchorY: number;
  theta: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fontPx: number;
  reason: HiddenReason;
}

/** 球面背面硬上限：接近对跖点时投影半径发散，一律隐藏 */
const HARD_LIMIT = 178;

function overlapArea(a: LabelBox, b: LabelBox) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function clampBox(b: LabelBox, size: number, margin: number) {
  b.x = clamp(b.x, margin, Math.max(margin, size - margin - b.w));
  b.y = clamp(b.y, margin, Math.max(margin, size - margin - b.h));
}

/**
 * 计算所有标签的布局。纯函数：同一组输入永远得到同一结果，
 * 不依赖上一帧状态，也不含任何随机量，重绘不会抖动。
 */
export function layoutLabels(
  labels: Label[],
  p: Projection,
  size: number,
): LabelBox[] {
  const margin = Math.max(4, size * 0.012);
  const byId = new Map(labels.map((l) => [l.id, l]));
  const sorted = [...labels].sort((a, b) => (a.id < b.id ? -1 : 1));

  // 1. 投影锚点、量测盒体、显隐判定
  const boxes = sorted.map((l): LabelBox => {
    const a = anchorToScreen(l.u, l.v, size, p);
    const fontPx =
      l.fontSize * size * (l.scaleWithZoom ? p.zoom : 1);
    const text = l.text.trim() || "…";
    const w = textWidth(text, fontPx) + fontPx * 1.3;
    const h = fontPx * 1.9;
    let reason: HiddenReason = null;
    const slack = size * 0.06;
    if (a.theta > Math.min(l.maxAngle, HARD_LIMIT)) reason = "range";
    else if (
      a.x < -slack ||
      a.x > size + slack ||
      a.y < -slack ||
      a.y > size + slack
    )
      reason = "outside";
    return {
      id: l.id,
      text,
      pinned: l.pinned,
      anchorX: a.x,
      anchorY: a.y,
      theta: a.theta,
      x: 0,
      y: 0,
      w,
      h,
      fontPx,
      reason,
    };
  });

  const visible = boxes.filter((b) => !b.reason);
  const anchors = visible.map((b) => ({ x: b.anchorX, y: b.anchorY }));
  const placed: LabelBox[] = [];

  // 候选落点：用户存储的偏移优先，其余为围绕锚点的 8 个方向
  function candidates(b: LabelBox) {
    const l = byId.get(b.id)!;
    const list: [number, number][] = [
      [l.offsetX * size, l.offsetY * size],
    ];
    const gap = Math.max(b.w, b.h) / 2 + size * 0.035;
    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + (i * Math.PI) / 4;
      list.push([gap * Math.cos(angle), gap * Math.sin(angle)]);
    }
    return list;
  }

  // 代价 = 引线长度² + 遮挡代价（与其他标签重叠、越界、盖住他人锚点）
  function cost(b: LabelBox, cx: number, cy: number) {
    const trial: LabelBox = { ...b, x: cx - b.w / 2, y: cy - b.h / 2 };
    const leader = Math.hypot(cx - b.anchorX, cy - b.anchorY);
    let score = (leader * leader) / size;
    for (const other of placed)
      score += (overlapArea(trial, other) / size) * 24;
    const outX =
      Math.max(0, margin - trial.x) +
      Math.max(0, trial.x + b.w - (size - margin));
    const outY =
      Math.max(0, margin - trial.y) +
      Math.max(0, trial.y + b.h - (size - margin));
    score += (outX + outY) * 40;
    for (const a of anchors) {
      if (a.x === b.anchorX && a.y === b.anchorY) continue;
      const pad = b.fontPx * 0.4;
      if (
        a.x > trial.x - pad &&
        a.x < trial.x + b.w + pad &&
        a.y > trial.y - pad &&
        a.y < trial.y + b.h + pad
      )
        score += b.fontPx * 12;
    }
    return score;
  }

  function place(b: LabelBox) {
    let best: [number, number] | null = null;
    let bestScore = Infinity;
    for (const [dx, dy] of candidates(b)) {
      const score = cost(b, b.anchorX + dx, b.anchorY + dy);
      if (score < bestScore - 1e-9) {
        bestScore = score;
        best = [dx, dy];
      }
    }
    b.x = b.anchorX + best![0] - b.w / 2;
    b.y = b.anchorY + best![1] - b.h / 2;
    clampBox(b, size, margin);
  }

  // 2. 固定标签优先落位，自动避让不得移动它们
  for (const b of visible.filter((b) => b.pinned)) {
    const l = byId.get(b.id)!;
    b.x = b.anchorX + l.offsetX * size - b.w / 2;
    b.y = b.anchorY + l.offsetY * size - b.h / 2;
    clampBox(b, size, margin);
    placed.push(b);
  }
  // 3. 其余标签按 id 顺序贪心落位，再做固定轮数的松弛
  const free = visible.filter((b) => !b.pinned);
  for (const b of free) {
    place(b);
    placed.push(b);
  }
  for (let pass = 0; pass < 3; pass++)
    for (const b of free) {
      placed.splice(placed.indexOf(b), 1);
      place(b);
      placed.push(b);
    }

  return boxes;
}

/** 命中检测：标签盒与锚点圆点，后绘制者优先 */
export function hitTest(boxes: LabelBox[], x: number, y: number) {
  for (let i = boxes.length - 1; i >= 0; i--) {
    const b = boxes[i];
    if (b.reason) continue;
    const r = Math.max(8, b.fontPx * 0.5);
    if (Math.hypot(x - b.anchorX, y - b.anchorY) <= r) return b;
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
  }
  return null;
}
