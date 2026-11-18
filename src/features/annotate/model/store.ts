import { reactive } from "vue";
import type { Label, StudioDocument } from "../../../shared/types";

/** 标注模式的交互状态，在画布与标注面板之间共享 */
export const annotateState = reactive({
  mode: false,
  selectedId: null as string | null,
});

let counter = 0;

export function addLabel(doc: StudioDocument, u: number, v: number): Label {
  const label: Label = {
    id: `label-${Date.now().toString(36)}-${counter++}`,
    text: "新标注",
    u,
    v,
    fontSize: 0.034,
    offsetX: 0.09,
    offsetY: -0.11,
    pinned: false,
    scaleWithZoom: false,
    maxAngle: 140,
  };
  doc.labels.push(label);
  annotateState.selectedId = label.id;
  return label;
}

export function removeLabel(doc: StudioDocument, id: string) {
  const at = doc.labels.findIndex((l) => l.id === id);
  if (at >= 0) doc.labels.splice(at, 1);
  if (annotateState.selectedId === id) annotateState.selectedId = null;
}
