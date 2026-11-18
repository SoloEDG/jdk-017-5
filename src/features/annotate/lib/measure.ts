/** 标注文字的字族，与界面字体保持一致 */
export const LABEL_FONT = `"DM Sans", "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif`;

export function labelFont(fontPx: number) {
  return `500 ${fontPx}px ${LABEL_FONT}`;
}

let shared: CanvasRenderingContext2D | null = null;

/** 测量文字宽度。canvas measureText 随字号线性缩放，保证高低分辨率布局一致 */
export function textWidth(text: string, fontPx: number) {
  shared ??= document.createElement("canvas").getContext("2d")!;
  shared.font = labelFont(fontPx);
  return shared.measureText(text).width;
}
