import { computed, ref, type Ref } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import { playDone, playRestEnd, playWorkEnd, unlockAudio } from './useSounds'

export type Phase = 'idle' | 'countdown' | 'work' | 'rest' | 'done'

const COUNTDOWN_SECS = 10

export function useWorkoutTimer(workSecs: Ref<number>, restSecs: Ref<number>, repeats: Ref<number>) {
  const phase = ref<Phase>('idle')
  const running = ref(false)
  const round = ref(1)
  const remainingMs = ref(0)
  const phaseTotalMs = ref(1)
  let phaseEndsAt = 0

  const { pause: stopTick, resume: startTick } = useIntervalFn(tick, 100, { immediate: false })

  function tick() {
    remainingMs.value = Math.max(0, phaseEndsAt - Date.now())
    if (remainingMs.value <= 0) advance()
  }

  function beginPhase(secs: number) {
    phaseTotalMs.value = secs * 1000
    remainingMs.value = secs * 1000
    phaseEndsAt = Date.now() + secs * 1000
  }

  function advance() {
    if (phase.value === 'countdown') {
      playRestEnd()
      phase.value = 'work'
      beginPhase(workSecs.value)
    } else if (phase.value === 'work') {
      if (round.value < repeats.value) {
        playWorkEnd()
        phase.value = 'rest'
        beginPhase(restSecs.value)
      } else {
        playDone()
        phase.value = 'done'
        running.value = false
        stopTick()
      }
    } else if (phase.value === 'rest') {
      playRestEnd()
      round.value += 1
      phase.value = 'work'
      beginPhase(workSecs.value)
    }
  }

  function start() {
    unlockAudio()
    round.value = 1
    phase.value = 'countdown'
    beginPhase(COUNTDOWN_SECS)
    running.value = true
    startTick()
  }

  function pauseTimer() {
    running.value = false
    stopTick()
  }

  function resumeTimer() {
    phaseEndsAt = Date.now() + remainingMs.value
    running.value = true
    startTick()
  }

  function reset() {
    stopTick()
    running.value = false
    phase.value = 'idle'
    round.value = 1
    remainingMs.value = 0
  }

  const remainingSecs = computed(() => Math.ceil(remainingMs.value / 1000))
  // Fraction of the current phase that has elapsed, 0..1.
  const phaseProgress = computed(() =>
    phase.value === 'idle' || phase.value === 'done'
      ? 0
      : 1 - remainingMs.value / phaseTotalMs.value,
  )

  return {
    phase,
    running,
    round,
    remainingSecs,
    phaseProgress,
    start,
    pause: pauseTimer,
    resume: resumeTimer,
    reset,
  }
}
