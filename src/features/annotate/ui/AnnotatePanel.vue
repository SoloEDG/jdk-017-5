<script setup lang="ts">
import { computed } from "vue";
import { Tag, Trash2, Pin, PinOff } from "lucide-vue-next";
import type { StudioDocument } from "../../../shared/types";
import { annotateState, removeLabel } from "../model/store";
import { layoutLabels, type HiddenReason } from "../lib/layout";

const { doc } = defineProps<{ doc: StudioDocument }>();

const selected = computed(
  () => doc.labels.find((l) => l.id === annotateState.selectedId) ?? null,
);

// 与画布共用同一布局函数，状态判定结果一致
const status = computed(() => {
  const map = new Map<string, HiddenReason>();
  if (doc.asset)
    for (const b of layoutLabels(doc.labels, { ...doc.projection }, 600))
      map.set(b.id, b.reason);
  return map;
});

const reasonText: Record<string, string> = {
  range: "超出显示范围",
  outside: "锚点在画面外",
};
function statusText(id: string) {
  return reasonText[status.value.get(id) ?? ""] ?? "可见";
}
function previewPx() {
  if (!selected.value) return 0;
  return Math.round(
    selected.value.fontSize *
      600 *
      (selected.value.scaleWithZoom ? doc.projection.zoom : 1),
  );
}
</script>

<template>
  <section class="panel">
    <div class="section-label"><span>05 / 文字标注</span><Tag :size="16" /></div>
    <button
      class="annotate-toggle"
      :class="{ active: annotateState.mode }"
      :disabled="!doc.asset"
      @click="annotateState.mode = !annotateState.mode"
    >
      <Tag :size="13" />
      {{ annotateState.mode ? "标注模式已开启 · 点击画布放置" : "开启标注模式" }}
    </button>
    <p v-if="!doc.labels.length" class="mini">
      开启标注模式后，点击星球上的建筑或山峰即可放置标签、引线与锚点。
    </p>
    <div v-if="doc.labels.length" class="label-list">
      <button
        v-for="l in doc.labels"
        :key="l.id"
        class="label-item"
        :class="{ active: l.id === annotateState.selectedId }"
        @click="annotateState.selectedId = l.id"
      >
        <span class="grow">{{ l.text || "（未命名）" }}</span>
        <span
          class="chip"
          :class="{ warn: status.get(l.id) }"
          >{{ statusText(l.id) }}</span
        >
      </button>
    </div>
    <template v-if="selected">
      <label class="field-label" for="label-text">文字内容</label>
      <input
        id="label-text"
        v-model="selected.text"
        class="text-input"
        type="text"
        maxlength="24"
        placeholder="为这处景物起个名字"
      />
      <label class="control"
        >字号 <output>预览约 {{ previewPx() }} px</output
        ><input
          aria-label="字号"
          type="range"
          min="0.015"
          max="0.08"
          step="0.001"
          v-model.number="selected.fontSize"
      /></label>
      <label class="control"
        >水平偏移 <output>{{ Math.round(selected.offsetX * 100) }}%</output
        ><input
          aria-label="水平偏移"
          type="range"
          min="-0.3"
          max="0.3"
          step="0.005"
          v-model.number="selected.offsetX"
          @input="selected.pinned = true"
      /></label>
      <label class="control"
        >垂直偏移 <output>{{ Math.round(selected.offsetY * 100) }}%</output
        ><input
          aria-label="垂直偏移"
          type="range"
          min="-0.3"
          max="0.3"
          step="0.005"
          v-model.number="selected.offsetY"
          @input="selected.pinned = true"
      /></label>
      <label class="control"
        >显示范围 <output>{{ Math.round(selected.maxAngle) }}°</output
        ><input
          aria-label="显示范围"
          type="range"
          min="30"
          max="178"
          step="1"
          v-model.number="selected.maxAngle"
      /></label>
      <div class="range-labels"><span>转开即隐藏</span><span>几乎始终显示</span></div>
      <label class="check-row">
        <input type="checkbox" v-model="selected.pinned" />
        固定标签位置（优先于自动避让）
      </label>
      <label class="check-row">
        <input type="checkbox" v-model="selected.scaleWithZoom" />
        字号随星球缩放（否则在成品中保持相对字号）
      </label>
      <div class="label-actions">
        <button
          class="text-button"
          :disabled="!selected.pinned"
          @click="selected.pinned = false"
        >
          <PinOff :size="13" /> 恢复自动避让
        </button>
        <button class="text-button danger" @click="removeLabel(doc, selected.id)">
          <Trash2 :size="13" /> 删除标注
        </button>
      </div>
      <p class="mini">
        <Pin :size="10" /> 固定标签不会被自动避让移动；其余标签按引线长度与遮挡代价让位。
      </p>
    </template>
  </section>
</template>
