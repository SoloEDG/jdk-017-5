<script setup lang="ts">
import { ref } from "vue";
import {
  Move,
  Maximize,
  MousePointer2,
  Plus,
  Minus,
  ScanLine,
  Tag,
} from "lucide-vue-next";
import type { StudioDocument, Projection } from "../../../shared/types";
import { clamp } from "../../../shared/math";
import { usePreview } from "../model/usePreview";
import { dragView, wheelZoom } from "../lib/gestures";
import { projectPoint } from "../../projection/lib/coordinates";
import { addLabel, annotateState, hitTest } from "../../annotate";
const { doc } = defineProps<{ doc: StudioDocument }>();
const canvas = ref<HTMLCanvasElement>();
const { rendering, boxes } = usePreview(doc, canvas);
const guides = ref(false);
let start: { x: number; y: number; p: Projection } | null = null;
let dragLabel: {
  id: string;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
} | null = null;
function canvasPoint(e: PointerEvent) {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const size = canvas.value!.width;
  return {
    x: ((e.clientX - rect.left) / rect.width) * size,
    y: ((e.clientY - rect.top) / rect.height) * size,
    size,
  };
}
function down(e: PointerEvent) {
  if (e.button !== 0) return;
  if (annotateState.mode && doc.asset && canvas.value) {
    const pt = canvasPoint(e);
    const hit = hitTest(boxes.value, pt.x, pt.y);
    if (hit) {
      annotateState.selectedId = hit.id;
      const label = doc.labels.find((l) => l.id === hit.id)!;
      dragLabel = {
        id: hit.id,
        x: pt.x,
        y: pt.y,
        offsetX: label.offsetX,
        offsetY: label.offsetY,
      };
    } else {
      const uv = projectPoint(pt.x, pt.y, pt.size, pt.size, doc.projection);
      addLabel(doc, uv.u, uv.v);
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    return;
  }
  start = { x: e.clientX, y: e.clientY, p: { ...doc.projection } };
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
}
function move(e: PointerEvent) {
  if (dragLabel && canvas.value) {
    const pt = canvasPoint(e);
    const label = doc.labels.find((l) => l.id === dragLabel!.id);
    if (label) {
      label.offsetX = clamp(
        dragLabel.offsetX + (pt.x - dragLabel.x) / pt.size,
        -0.5,
        0.5,
      );
      label.offsetY = clamp(
        dragLabel.offsetY + (pt.y - dragLabel.y) / pt.size,
        -0.5,
        0.5,
      );
      label.pinned = true;
    }
    return;
  }
  if (!start) return;
  Object.assign(
    doc.projection,
    dragView(
      start.p,
      e.clientX - start.x,
      e.clientY - start.y,
      (e.currentTarget as HTMLElement).clientWidth,
    ),
  );
}
function up() {
  start = null;
  dragLabel = null;
}
function wheel(e: WheelEvent) {
  doc.projection.zoom = wheelZoom(doc.projection.zoom, e.deltaY);
}
</script>
<template>
  <main class="viewport">
    <div class="viewport-heading">
      <div>
        <span class="eyebrow">LIVE CANVAS</span>
        <h1>换个视角，世界很小。</h1>
      </div>
      <span class="live"><i />{{ rendering ? "正在渲染" : "实时预览" }}</span>
    </div>
    <div class="canvas-area">
      <span class="corner-label"
        >{{
          doc.projection.mode === "planet" ? "LITTLE PLANET" : "INFINITE TUNNEL"
        }}
        / 01</span
      >
      <div
        class="canvas-wrap"
        :class="{ guides, annotating: annotateState.mode }"
        @pointerdown="down"
        @pointermove="move"
        @pointerup="up"
        @pointercancel="up"
        @lostpointercapture="up"
        @wheel.prevent="wheel"
      >
        <canvas ref="canvas" aria-label="小行星实时投影画布" />
        <div v-if="!doc.asset" class="empty">导入一张照片，开启你的星球</div>
        <div v-if="guides" class="crosshair" />
      </div>
      <div class="canvas-caption">
        <span>STEREOGRAPHIC PROJECTION</span
        ><span>{{
          annotateState.mode ? "标注模式 · 点击景物放置标签" : "600 × 600 · 预览"
        }}</span>
      </div>
    </div>
    <div class="viewport-toolbar">
      <div class="gesture-hint">
        <template v-if="annotateState.mode">
          <Tag :size="14" /> 点击放置标注 <span>·</span> 拖动标签固定位置
        </template>
        <template v-else>
          <MousePointer2 :size="14" /> 拖动旋转 <span>·</span
          ><Move :size="14" /> 滚轮缩放
        </template>
      </div>
      <div class="tool-buttons">
        <button
          aria-label="标注模式"
          :class="{ selected: annotateState.mode }"
          :disabled="!doc.asset"
          @click="annotateState.mode = !annotateState.mode"
        >
          <Tag :size="16" /></button
        ><b /><button
          aria-label="缩小"
          @click="doc.projection.zoom = wheelZoom(doc.projection.zoom, 100)"
        >
          <Minus :size="16" /></button
        ><span>{{ Math.round(doc.projection.zoom * 100) }}%</span
        ><button
          aria-label="放大"
          @click="doc.projection.zoom = wheelZoom(doc.projection.zoom, -100)"
        >
          <Plus :size="16" /></button
        ><b /><button
          aria-label="切换辅助线"
          :class="{ selected: guides }"
          @click="guides = !guides"
        >
          <ScanLine :size="17" /></button
        ><button aria-label="重置缩放" @click="doc.projection.zoom = 1">
          <Maximize :size="16" />
        </button>
      </div>
    </div>
    <div class="inspiration">
      <span class="spark">✳</span>
      <div>
        <strong>每一片风景，都有另一个宇宙。</strong
        ><span>试试切换隧道模式，或轻轻拖动星球，寻找意想不到的构图。</span>
      </div>
      <span class="inspiration-number">017</span>
    </div>
  </main>
</template>
