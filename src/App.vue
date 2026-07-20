<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDark, useLocalStorage, useToggle } from '@vueuse/core'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  Label,
  NumberFieldDecrement,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldRoot,
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
} from 'radix-vue'
import {
  ChevronLeft,
  Dumbbell,
  ListChecks,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Save,
  Sun,
  Trash2,
} from '@lucide/vue'
import { useWorkoutTimer } from './useWorkoutTimer'

const isDark = useDark()
const toggleDark = useToggle(isDark)

const workSecs = ref(40)
const restSecs = ref(20)
const repeats = ref(5)

// Radix sliders model number[]; bridge them to the plain number refs.
function asSlider(source: typeof workSecs) {
  return computed({
    get: () => [source.value],
    set: (v) => (source.value = v[0]),
  })
}
const workSlider = asSlider(workSecs)
const restSlider = asSlider(restSecs)
const repsSlider = asSlider(repeats)

const timer = useWorkoutTimer(workSecs, restSecs, repeats)
const { phase, running, round, remainingSecs, phaseProgress } = timer

const configurable = computed(() => phase.value === 'idle' || phase.value === 'done')

const clockText = computed(() => {
  const s =
    phase.value === 'idle' ? workSecs.value : phase.value === 'done' ? 0 : remainingSecs.value
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
})

const phaseLabel = computed(
  () =>
    ({ idle: 'Ready', countdown: 'Get Ready', work: 'Work', rest: 'Rest', done: 'Done!' })[
      phase.value
    ],
)

// SVG countdown ring
const R = 130
const CIRC = 2 * Math.PI * R
const dashOffset = computed(() => CIRC * phaseProgress.value)

// Presets, persisted in localStorage
interface Preset {
  name: string
  work: number
  rest: number
  reps: number
}

const presets = useLocalStorage<Preset[]>('workout-timer:presets', [])
const activePresetName = ref<string | null>(null)
const presetName = ref('')
const saveOpen = ref(false)
const selectOpen = ref(false)

// The clock shows the active preset's name; drop it once settings diverge.
watch([workSecs, restSecs, repeats], () => {
  const p = presets.value.find((p) => p.name === activePresetName.value)
  if (!p || p.work !== workSecs.value || p.rest !== restSecs.value || p.reps !== repeats.value) {
    activePresetName.value = null
  }
})

function openSaveModal() {
  presetName.value = activePresetName.value ?? ''
  saveOpen.value = true
}

function savePreset() {
  const name = presetName.value.trim()
  if (!name) return
  const preset: Preset = { name, work: workSecs.value, rest: restSecs.value, reps: repeats.value }
  const existing = presets.value.findIndex((p) => p.name === name)
  if (existing >= 0) presets.value.splice(existing, 1, preset)
  else presets.value.push(preset)
  activePresetName.value = name
  saveOpen.value = false
}

function selectPreset(p: Preset) {
  workSecs.value = p.work
  restSecs.value = p.rest
  repeats.value = p.reps
  activePresetName.value = p.name
  selectOpen.value = false
}

function deletePreset(name: string) {
  presets.value = presets.value.filter((p) => p.name !== name)
  if (activePresetName.value === name) activePresetName.value = null
}
</script>

<template>
  <main class="app" :data-phase="phase">
    <header class="top">
      <h1 class="title"><Dumbbell class="title-icon" :size="18" /> Workout Timer</h1>
      <button
        class="theme-toggle"
        @click="toggleDark()"
        :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
      >
        <Sun v-if="isDark" :size="18" />
        <Moon v-else :size="18" />
      </button>
    </header>

    <section class="clock-area">
      <div class="clock-wrap">
        <svg class="ring" viewBox="0 0 300 300">
          <circle class="ring-bg" cx="150" cy="150" :r="R" />
          <circle
            class="ring-fg"
            cx="150"
            cy="150"
            :r="R"
            :stroke-dasharray="CIRC"
            :stroke-dashoffset="dashOffset"
          />
        </svg>
        <div class="clock">
          <div class="phase-label">{{ phaseLabel }}</div>
          <div class="time">{{ clockText }}</div>
          <div class="round" v-if="phase === 'work' || phase === 'rest'">
            Round {{ round }} / {{ repeats }}
          </div>
          <div class="preset-name" v-if="activePresetName">{{ activePresetName }}</div>
        </div>
      </div>
    </section>

    <section class="settings" :class="{ disabled: !configurable }">
      <div class="setting">
        <Label class="label" for="work">Workout (seconds)</Label>
        <div class="setting-row">
          <SliderRoot
            id="work"
            v-model="workSlider"
            class="slider"
            :min="5"
            :max="300"
            :step="5"
            :disabled="!configurable"
          >
            <SliderTrack class="slider-track">
              <SliderRange class="slider-range range-work" />
            </SliderTrack>
            <SliderThumb class="slider-thumb" aria-label="Workout seconds" />
          </SliderRoot>
          <NumberFieldRoot
            v-model="workSecs"
            class="numfield"
            :min="1"
            :max="3600"
            :disabled="!configurable"
          >
            <NumberFieldDecrement class="num-btn"><Minus :size="14" /></NumberFieldDecrement>
            <NumberFieldInput class="num-input" aria-label="Workout seconds" />
            <NumberFieldIncrement class="num-btn"><Plus :size="14" /></NumberFieldIncrement>
          </NumberFieldRoot>
        </div>
      </div>

      <div class="setting">
        <Label class="label" for="rest">Rest (seconds)</Label>
        <div class="setting-row">
          <SliderRoot
            id="rest"
            v-model="restSlider"
            class="slider"
            :min="5"
            :max="180"
            :step="5"
            :disabled="!configurable"
          >
            <SliderTrack class="slider-track">
              <SliderRange class="slider-range range-rest" />
            </SliderTrack>
            <SliderThumb class="slider-thumb" aria-label="Rest seconds" />
          </SliderRoot>
          <NumberFieldRoot
            v-model="restSecs"
            class="numfield"
            :min="1"
            :max="3600"
            :disabled="!configurable"
          >
            <NumberFieldDecrement class="num-btn"><Minus :size="14" /></NumberFieldDecrement>
            <NumberFieldInput class="num-input" aria-label="Rest seconds" />
            <NumberFieldIncrement class="num-btn"><Plus :size="14" /></NumberFieldIncrement>
          </NumberFieldRoot>
        </div>
      </div>

      <div class="setting">
        <Label class="label" for="reps">Repeat</Label>
        <div class="setting-row">
          <SliderRoot
            id="reps"
            v-model="repsSlider"
            class="slider"
            :min="1"
            :max="20"
            :step="1"
            :disabled="!configurable"
          >
            <SliderTrack class="slider-track">
              <SliderRange class="slider-range range-reps" />
            </SliderTrack>
            <SliderThumb class="slider-thumb" aria-label="Repeat count" />
          </SliderRoot>
          <NumberFieldRoot
            v-model="repeats"
            class="numfield"
            :min="1"
            :max="99"
            :disabled="!configurable"
          >
            <NumberFieldDecrement class="num-btn"><Minus :size="14" /></NumberFieldDecrement>
            <NumberFieldInput class="num-input" aria-label="Repeat count" />
            <NumberFieldIncrement class="num-btn"><Plus :size="14" /></NumberFieldIncrement>
          </NumberFieldRoot>
        </div>
      </div>
    </section>

    <footer class="bottom">
      <div class="secondary-row">
        <button class="btn small" :disabled="!configurable" @click="openSaveModal">
          <Save :size="16" /> Save Workout
        </button>
        <button class="btn small" :disabled="!configurable" @click="selectOpen = true">
          <ListChecks :size="16" /> Select Workout
        </button>
      </div>
      <div class="primary-row">
        <button v-if="configurable" class="btn primary wide" @click="timer.start">
          <Play :size="18" /> Start
        </button>
        <template v-else>
          <button v-if="running" class="btn wide" @click="timer.pause">
            <Pause :size="18" /> Pause
          </button>
          <button v-else class="btn primary wide" @click="timer.resume">
            <Play :size="18" /> Resume
          </button>
          <button class="btn ghost" @click="timer.reset"><RotateCcw :size="18" /> Reset</button>
        </template>
      </div>
    </footer>

    <!-- Save Workout modal -->
    <DialogRoot v-model:open="saveOpen">
      <DialogPortal>
        <DialogOverlay class="dialog-overlay" />
        <DialogContent class="modal">
          <DialogTitle class="modal-title">Save Workout</DialogTitle>
          <DialogDescription class="modal-desc">
            {{ workSecs }}s work · {{ restSecs }}s rest · ×{{ repeats }}
          </DialogDescription>
          <input
            v-model="presetName"
            class="text-input"
            type="text"
            placeholder="Workout name"
            maxlength="32"
            @keyup.enter="savePreset"
          />
          <div class="modal-actions">
            <DialogClose as-child>
              <button class="btn ghost small">Cancel</button>
            </DialogClose>
            <button class="btn primary small" :disabled="!presetName.trim()" @click="savePreset">
              Save
            </button>
          </div>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>

    <!-- Select Workout overlay page -->
    <DialogRoot v-model:open="selectOpen">
      <DialogPortal>
        <DialogContent class="sheet">
          <header class="sheet-header">
            <DialogClose as-child>
              <button class="back-btn"><ChevronLeft :size="20" /> Back</button>
            </DialogClose>
            <DialogTitle class="sheet-title">Select Workout</DialogTitle>
            <span class="sheet-spacer" aria-hidden="true" />
          </header>
          <DialogDescription class="sr-only">
            Choose a saved workout preset or delete one.
          </DialogDescription>
          <ul v-if="presets.length" class="preset-list">
            <li v-for="p in presets" :key="p.name" class="preset">
              <button class="preset-load" @click="selectPreset(p)">
                <strong>{{ p.name }}</strong>
                <span>{{ p.work }}s work · {{ p.rest }}s rest · ×{{ p.reps }}</span>
              </button>
              <button
                class="preset-delete"
                :aria-label="`Delete preset ${p.name}`"
                @click="deletePreset(p.name)"
              >
                <Trash2 :size="17" />
              </button>
            </li>
          </ul>
          <p v-else class="preset-empty">No saved workouts yet — go back and hit “Save Workout”.</p>
        </DialogContent>
      </DialogPortal>
    </DialogRoot>
  </main>
</template>
