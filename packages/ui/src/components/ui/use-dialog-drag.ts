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
}

export function useDialogDrag(
  options: UseDialogDragOptions = {},
  forwardedRef?: React.ForwardedRef<HTMLDivElement>
) {
  const { enabled = false } = options
  const offsetRef = React.useRef<Offset>({ x: 0, y: 0 })
  const internalRef = React.useRef<HTMLDivElement | null>(null)
  const dragStateRef = React.useRef<DragState | null>(null)

  const handlePointerMove = React.useCallback((e: PointerEvent) => {
    const dragState = dragStateRef.current
    const el = internalRef.current
    if (!dragState || !el) {
      return
    }

    const newOffset: Offset = {
      x: dragState.initialOffset.x + (e.clientX - dragState.startX),
      y: dragState.initialOffset.y + (e.clientY - dragState.startY)
    }

    const vw = window.innerWidth
    const vh = window.innerHeight
    const rect = el.getBoundingClientRect()
    const minVisible = 30

    newOffset.x = Math.max(
      -(rect.width - minVisible),
      Math.min(vw - minVisible, newOffset.x)
    )
    newOffset.y = Math.max(
      -(rect.height - minVisible),
      Math.min(vh - minVisible, newOffset.y)
    )

    offsetRef.current = newOffset
    el.style.transform = `translate(-50%, -50%) translate(${newOffset.x}px, ${newOffset.y}px)`
  }, [])

  const stopDrag = React.useCallback(() => {
    const el = internalRef.current
    if (el) {
      el.style.transition = ''
      el.removeEventListener('pointermove', handlePointerMove)
      el.removeEventListener('pointerup', stopDrag)
      el.removeEventListener('pointercancel', stopDrag)
    }
    document.body.style.removeProperty('user-select')
    document.body.style.removeProperty('-webkit-user-select')
    dragStateRef.current = null
  }, [handlePointerMove])

  const contentRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      internalRef.current = node
      if (typeof forwardedRef === 'function') {
        forwardedRef(node)
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node
      }
    },
    [forwardedRef]
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

      dragStateRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initialOffset: { ...offsetRef.current }
      }

      el.addEventListener('pointermove', handlePointerMove)
      el.addEventListener('pointerup', stopDrag)
      el.addEventListener('pointercancel', stopDrag)
    },
    [handlePointerMove, stopDrag]
  )

  const resetPosition = React.useCallback(() => {
    offsetRef.current = { x: 0, y: 0 }
    if (internalRef.current) {
      internalRef.current.style.transform = 'translate(-50%, -50%)'
    }
  }, [])

  React.useEffect(() => {
    return () => {
      const el = internalRef.current
      if (el) {
        el.removeEventListener('pointermove', handlePointerMove)
        el.removeEventListener('pointerup', stopDrag)
        el.removeEventListener('pointercancel', stopDrag)
      }
    }
  }, [handlePointerMove, stopDrag])

  return { contentRef, handlePointerDown, resetPosition }
}
