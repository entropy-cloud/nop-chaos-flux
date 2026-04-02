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
  const { offsetRef: externalOffsetRef, baseTransform = 'translate(-50%, -50%)' } = options
  const internalOffsetRef = React.useRef<Offset>({ x: 0, y: 0 })
  const internalRef = React.useRef<HTMLDivElement | null>(null)
  const dragStateRef = React.useRef<DragState | null>(null)
  const forwardedOffsetRefRef = React.useRef(externalOffsetRef)
  const forwardedRefRef = React.useRef(forwardedRef)
  const stopDragRef = React.useRef<(e?: PointerEvent) => void>(() => {})

  React.useEffect(() => {
    forwardedOffsetRefRef.current = externalOffsetRef
  }, [externalOffsetRef])

  React.useEffect(() => {
    forwardedRefRef.current = forwardedRef
  }, [forwardedRef])

  const getOffset = React.useCallback((): Offset => {
    return forwardedOffsetRefRef.current?.current ?? internalOffsetRef.current
  }, [])

  const setOffset = React.useCallback((nextOffset: Offset) => {
    internalOffsetRef.current = nextOffset

    if (forwardedOffsetRefRef.current) {
      forwardedOffsetRefRef.current.current = nextOffset
    }
  }, [])

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

    const nextOffset = { x: clampedX, y: clampedY }
    setOffset(nextOffset)
    applyTransform(el, nextOffset)
  }, [applyTransform, baseTransform, setOffset])

  const stopDrag = React.useCallback((e?: PointerEvent) => {
    const el = internalRef.current
    if (el) {
      try { el.releasePointerCapture(e?.pointerId ?? 0); } catch { void 0 }
      el.style.transition = ''
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', stopDragRef.current)
      el.removeEventListener('pointercancel', stopDragRef.current)
      el.removeEventListener('lostpointercapture', stopDragRef.current)
    }
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('-webkit-user-select')
    dragStateRef.current = null
  }, [handlePointerMove])

  React.useEffect(() => {
    stopDragRef.current = stopDrag
  }, [stopDrag])

  const contentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node
      const currentOffset = getOffset()

      if (node && (currentOffset.x !== 0 || currentOffset.y !== 0)) {
        applyTransform(node, currentOffset)
      }

      const currentForwardedRef = forwardedRefRef.current
      if (typeof currentForwardedRef === 'function') {
        currentForwardedRef(node)
      } else if (currentForwardedRef) {
        currentForwardedRef.current = node
      }
    },
    [applyTransform, getOffset]
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
        initialOffset: { ...getOffset() }
      }

      el.addEventListener('pointermove', handlePointerMove)
      el.addEventListener('pointerup', stopDragRef.current)
      el.addEventListener('pointercancel', stopDragRef.current)
      el.addEventListener('lostpointercapture', stopDragRef.current)
    },
    [getOffset, handlePointerMove]
  )

  const resetPosition = React.useCallback(() => {
    setOffset({ x: 0, y: 0 })
    if (internalRef.current) {
      applyTransform(internalRef.current, { x: 0, y: 0 })
    }
  }, [applyTransform, setOffset])

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
