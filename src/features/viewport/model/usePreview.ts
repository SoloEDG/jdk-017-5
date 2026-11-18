import { watch, onBeforeUnmount, type Ref, ref } from "vue";
import type { StudioDocument } from "../../../shared/types";
import { renderPreview } from "../../projection";
import { layoutLabels, drawLabels, annotateState } from "../../annotate";
import type { LabelBox } from "../../annotate";
export function usePreview(
  doc: StudioDocument,
  canvas: Ref<HTMLCanvasElement | undefined>,
) {
  const rendering = ref(false);
  const boxes = ref<LabelBox[]>([]);
  const fontsReady = ref(false);
  // 字体就绪后重绘一次，保证预览与导出的文字度量一致
  document.fonts?.ready.then(() => (fontsReady.value = true));
  let frame = 0;
  watch(
    () => [
      canvas.value,
      doc.asset,
      JSON.stringify(doc.projection),
      JSON.stringify(doc.edge),
      JSON.stringify(doc.labels),
      annotateState.selectedId,
      fontsReady.value,
    ],
    () => {
      cancelAnimationFrame(frame);
      rendering.value = true;
      frame = requestAnimationFrame(() => {
        if (canvas.value && doc.asset) {
          const snapshot = {
            asset: doc.asset,
            projection: { ...doc.projection },
            edge: { ...doc.edge },
            labels: doc.labels,
          };
          renderPreview(canvas.value, snapshot, 600);
          const ctx = canvas.value.getContext("2d")!;
          boxes.value = layoutLabels(doc.labels, snapshot.projection, 600);
          drawLabels(ctx, boxes.value, annotateState.selectedId);
        } else {
          boxes.value = [];
        }
        rendering.value = false;
      });
    },
    { immediate: true, flush: "post" },
  );
  onBeforeUnmount(() => cancelAnimationFrame(frame));
  return { rendering, boxes };
}
