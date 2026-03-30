import * as React from 'react'

interface Offset {
  x: number
  y: number
}

interface DragState {
  startX: number
  startY: number
  initialOffset: Offset
}

interface UseDialogDragOptions {
  enabled?: boolean
  offsetRef?: React.MutableRefObject<Offset>
  baseTransform?: string
}

export function useDialogDrag(
  options: UseDialogDragOptions = {},
  forwardedRef?: React.ForwardedRef<HTMLDivElement>
) {
  const { enabled = false, offsetRef: externalOffsetRef, baseTransform = 'translate(-50%, -50%)' } = options
  const internalOffsetRef = React.useRef<Offset>({ x: 0, y: 0 })
  const offsetRef = externalOffsetRef ?? internalOffsetRef
  const internalRef = React.useRef<HTMLDivElement | null>(null)
  const dragStateRef = React.useRef<DragState | null>(null)

  const applyTransform = React.useCallback((el: HTMLElement, offset: Offset) => {
    if (offset.x === 0 && offset.y === 0) {
      el.style.transform = baseTransform
    } else {
      el.style.transform = `${baseTransform} translate(${offset.x}px, ${offset.y}px)`
    }
  }, [baseTransform])

  const handlePointerMove = React.useCallback((e: PointerEvent) => {
    const dragState = dragStateRef.current
    const el = internalRef.current
    if (!dragState || !el) {
      return
    }

    const rawOffset: Offset = {
      x: dragState.initialOffset.x + (e.clientX - dragState.startX),
      y: dragState.initialOffset.y + (e.clientY - dragState.startY)
    }

    el.style.transform = `${baseTransform} translate(${rawOffset.x}px, ${rawOffset.y}px)`
    const rect = el.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const minVisible = 30

    let clampedX = rawOffset.x
    let clampedY = rawOffset.y

    if (rect.left < minVisible) {
      clampedX = rawOffset.x + (minVisible - rect.left)
    } else if (rect.right > vw - minVisible) {
      clampedX = rawOffset.x - (rect.right - (vw - minVisible))
    }

    if (rect.top < minVisible) {
      clampedY = rawOffset.y + (minVisible - rect.top)
    } else if (rect.bottom > vh - minVisible) {
      clampedY = rawOffset.y - (rect.bottom - (vh - minVisible))
    }

    offsetRef.current = { x: clampedX, y: clampedY }
    applyTransform(el, offsetRef.current)
  }, [offsetRef, applyTransform, baseTransform])

  const stopDrag = React.useCallback((e?: PointerEvent) => {
    const el = internalRef.current
    if (el) {
      try { el.releasePointerCapture(e?.pointerId ?? 0); } catch {}
      el.style.transition = ''
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', stopDrag)
      el.removeEventListener('pointercancel', stopDrag)
      el.removeEventListener('lostpointercapture', stopDrag)
    }
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('-webkit-user-select')
    dragStateRef.current = null
  }, [handlePointerMove])

  const contentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node
      if (node && (offsetRef.current.x !== 0 || offsetRef.current.y !== 0)) {
        applyTransform(node, offsetRef.current)
      }
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    },
    [forwardedRef, offsetRef, applyTransform]
  )

  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-slot="dialog-header"]')) {
        return
      }

      const el = internalRef.current
      if (!el) {
        return
      }

      e.preventDefault()
      el.style.transition = 'none'
      document.body.style.userSelect = 'none'
      document.body.style.webkitUserSelect = 'none'
      if (typeof el.setPointerCapture === 'function') {
        el.setPointerCapture(e.pointerId)
      }

      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialOffset: { ...offsetRef.current }
      }

      el.addEventListener('pointermove', handlePointerMove)
      el.addEventListener('pointerup', stopDrag)
      el.addEventListener('pointercancel', stopDrag)
      el.addEventListener('lostpointercapture', stopDrag)
    },
    [handlePointerMove, stopDrag, offsetRef]
  )

  const resetPosition = React.useCallback(() => {
    offsetRef.current = { x: 0, y: 0 }
    if (internalRef.current) {
      applyTransform(internalRef.current, { x: 0, y: 0 })
    }
  }, [offsetRef, applyTransform])

  React.useEffect(() => {
    return () => {
      const el = internalRef.current
      if (el) {
        el.removeEventListener('pointermove', handlePointerMove)
        el.removeEventListener('pointerup', stopDrag)
        el.removeEventListener('pointercancel', stopDrag)
        el.removeEventListener('lostpointercapture', stopDrag)
      }
    }
  }, [handlePointerMove, stopDrag])

  return { contentRef, handlePointerDown, resetPosition }
}
