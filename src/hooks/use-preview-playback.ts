import { useCallback, useEffect, useRef, useState } from 'react'

// ===========================================
// Types
// ===========================================

export interface PreviewPlaybackState {
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  error: string | null
}

export interface UsePreviewPlaybackReturn {
  state: PreviewPlaybackState
  play: (url: string) => Promise<void>
  pause: () => void
  stop: () => void
  seek: (time: number) => void
  togglePlayPause: (url: string) => Promise<void>
  currentUrl: string | null
}

// ===========================================
// Hook
// ===========================================

/**
 * Hook for playing Apple Music preview URLs using HTML5 Audio
 * Works universally without SDK authentication
 */
export function usePreviewPlayback(): UsePreviewPlaybackReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [currentUrl, setCurrentUrl] = useState<string | null>(null)
  const [state, setState] = useState<PreviewPlaybackState>({
    isPlaying: false,
    isLoading: false,
    currentTime: 0,
    duration: 0,
    error: null,
  })

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio()
    audio.preload = 'metadata'
    audioRef.current = audio

    // Event handlers
    const handleLoadStart = () => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))
    }

    const handleCanPlay = () => {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        duration: audio.duration || 0,
      }))
    }

    const handlePlay = () => {
      setState((prev) => ({ ...prev, isPlaying: true }))
    }

    const handlePause = () => {
      setState((prev) => ({ ...prev, isPlaying: false }))
    }

    const handleEnded = () => {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
      }))
      setCurrentUrl(null)
    }

    const handleTimeUpdate = () => {
      setState((prev) => ({
        ...prev,
        currentTime: audio.currentTime || 0,
      }))
    }

    const handleDurationChange = () => {
      setState((prev) => ({
        ...prev,
        duration: audio.duration || 0,
      }))
    }

    const handleError = () => {
      const error = audio.error
      let message = 'An error occurred during playback'

      if (error) {
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            message = 'Playback was aborted'
            break
          case MediaError.MEDIA_ERR_NETWORK:
            message = 'A network error occurred'
            break
          case MediaError.MEDIA_ERR_DECODE:
            message = 'Audio decoding failed'
            break
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            message = 'Audio format not supported'
            break
        }
      }

      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        error: message,
      }))
    }

    // Attach event listeners
    audio.addEventListener('loadstart', handleLoadStart)
    audio.addEventListener('canplay', handleCanPlay)
    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('durationchange', handleDurationChange)
    audio.addEventListener('error', handleError)

    // Cleanup
    return () => {
      audio.removeEventListener('loadstart', handleLoadStart)
      audio.removeEventListener('canplay', handleCanPlay)
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('durationchange', handleDurationChange)
      audio.removeEventListener('error', handleError)

      // Stop and clean up
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [])

  /**
   * Play a preview URL
   */
  const play = useCallback(async (url: string) => {
    const audio = audioRef.current
    if (!audio) return

    // If it's a different URL, load the new track
    if (url !== currentUrl) {
      audio.src = url
      setCurrentUrl(url)
      setState((prev) => ({
        ...prev,
        currentTime: 0,
        duration: 0,
        error: null,
      }))
    }

    try {
      await audio.play()
    } catch (error) {
      // Handle autoplay restrictions
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        setState((prev) => ({
          ...prev,
          error: 'Playback blocked. Please click to play.',
        }))
      } else {
        console.error('[PreviewPlayback] Play error:', error)
        setState((prev) => ({
          ...prev,
          error: 'Failed to start playback',
        }))
      }
    }
  }, [currentUrl])

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
    }
  }, [])

  /**
   * Stop playback and reset
   */
  const stop = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.pause()
      audio.currentTime = 0
      audio.src = ''
      setCurrentUrl(null)
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        isLoading: false,
        currentTime: 0,
        duration: 0,
      }))
    }
  }, [])

  /**
   * Seek to a specific time
   */
  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = Math.max(0, Math.min(time, audio.duration || 0))
    }
  }, [])

  /**
   * Toggle play/pause for a URL
   */
  const togglePlayPause = useCallback(
    async (url: string) => {
      const audio = audioRef.current
      if (!audio) return

      // If it's the same URL and playing, pause
      if (url === currentUrl && state.isPlaying) {
        pause()
      } else {
        // Otherwise, play the URL
        await play(url)
      }
    },
    [currentUrl, state.isPlaying, pause, play],
  )

  return {
    state,
    play,
    pause,
    stop,
    seek,
    togglePlayPause,
    currentUrl,
  }
}

// ===========================================
// Utility
// ===========================================

/**
 * Format seconds as MM:SS
 */
export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

