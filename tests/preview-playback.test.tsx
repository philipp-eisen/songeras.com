import { StrictMode } from 'react'
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { usePreviewPlayback } from '../src/hooks/use-preview-playback'
import { PreviewPlayer } from '../src/components/preview-player'

class FakeAudio extends EventTarget {
  static instances: Array<FakeAudio> = []
  src = ''
  preload = ''
  duration = 30
  currentTime = 0
  error = null
  play = vi.fn(() => {
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  })
  pause = vi.fn(() => {
    this.dispatchEvent(new Event('pause'))
  })
  load = vi.fn()
  removeAttribute(name: string) {
    if (name === 'src') this.src = ''
  }
  constructor() {
    super()
    FakeAudio.instances.push(this)
  }
}

beforeEach(() => {
  FakeAudio.instances = []
  vi.stubGlobal('Audio', FakeAudio)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('plays the current audio element in Strict Mode and releases it on unmount', () => {
  const view = render(
    <StrictMode>
      <PreviewPlayer previewUrl="https://example.com/a.m4a" autoPlay />
    </StrictMode>,
  )
  const current = FakeAudio.instances.at(-1)
  expect(current?.play).toHaveBeenCalledTimes(1)
  expect(current?.src).toBe('https://example.com/a.m4a')
  expect(screen.getByRole('button', { name: 'Pause preview' })).toBeTruthy()
  view.unmount()
  expect(current?.pause).toHaveBeenCalled()
  expect(current?.src).toBe('')
})

it('stops the old song when the preview URL disappears', () => {
  const view = render(
    <PreviewPlayer previewUrl="https://example.com/a.m4a" autoPlay />,
  )
  const audio = FakeAudio.instances[0]
  view.rerender(<PreviewPlayer autoPlay />)
  expect(audio.src).toBe('')
  expect(audio.pause).toHaveBeenCalled()
  expect(screen.getByText('No preview available')).toBeTruthy()
})

it('clears a blocked autoplay error when the user retries the same song', async () => {
  const { result } = renderHook(() => usePreviewPlayback())
  const audio = FakeAudio.instances[0]
  audio.play.mockRejectedValueOnce(
    new DOMException('Blocked', 'NotAllowedError'),
  )
  await act(() => result.current.play('https://example.com/a.m4a'))
  expect(result.current.state.error).toContain('Tap to play')
  await act(() => result.current.play('https://example.com/a.m4a'))
  expect(result.current.state.error).toBeNull()
  expect(result.current.state.isPlaying).toBe(true)
})

it('ignores a late failure from the previous song', async () => {
  const { result } = renderHook(() => usePreviewPlayback())
  const audio = FakeAudio.instances[0]
  let rejectFirst: (error: Error) => void = () => {}
  audio.play.mockImplementationOnce(
    () =>
      new Promise<void>((_, reject) => {
        rejectFirst = reject
      }),
  )
  let first: Promise<void> | undefined
  act(() => {
    first = result.current.play('https://example.com/a.m4a')
  })
  await act(() => result.current.play('https://example.com/b.m4a'))
  await act(async () => {
    rejectFirst(new DOMException('Interrupted', 'AbortError'))
    await first
  })
  expect(result.current.currentUrl).toBe('https://example.com/b.m4a')
  expect(result.current.state.isPlaying).toBe(true)
  expect(result.current.state.error).toBeNull()
})

it('keeps playback actions stable as the track changes', async () => {
  const { result } = renderHook(() => usePreviewPlayback())
  const play = result.current.play
  await act(() => result.current.play('https://example.com/a.m4a'))
  expect(result.current.play).toBe(play)
})
