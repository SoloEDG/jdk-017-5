export interface Projection {
  mode: "planet" | "tunnel";
  zoom: number;
  yaw: number;
  pitch: number;
  roll: number;
}
export interface Edge {
  seam: number;
  feather: number;
  background: string;
  transparent: boolean;
}
export interface Asset {
  id: string;
  name: string;
  width: number;
  height: number;
  data: ImageData;
  thumbnail: string;
}
export interface Label {
  id: string;
  text: string;
  /** 锚点在源全景图中的位置（0..1），随景物一起旋转 */
  u: number;
  v: number;
  /** 字号，相对输出画布边长的比例（分辨率无关） */
  fontSize: number;
  /** 标签相对锚点的偏移，相对画布边长的比例 */
  offsetX: number;
  offsetY: number;
  /** 用户固定位置：自动避让不得移动，优先于其他标签 */
  pinned: boolean;
  /** 字号是否随星球缩放；否则在成品中保持相对字号 */
  scaleWithZoom: boolean;
  /** 显示范围：锚点离画面中心轴的最大角距离（度），超出即隐藏 */
  maxAngle: number;
}
export interface StudioDocument {
  asset: Asset | null;
  projection: Projection;
  edge: Edge;
  labels: Label[];
}
export interface ExportSettings {
  size: number;
  format: "png" | "jpeg";
  quality: number;
}
export interface RenderSnapshot {
  asset: Asset;
  projection: Projection;
  edge: Edge;
  labels: Label[];
}
