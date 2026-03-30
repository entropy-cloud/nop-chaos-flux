"use client"

import { useEffect, useState, type CSSProperties } from "react"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"

function resolveTheme(): ToasterProps["theme"] {
  if (typeof document === "undefined") {
    return "light"
  }

  const root = document.documentElement
  return root.dataset.mode === "dark" || root.classList.contains("dark")
    ? "dark"
    : "light"
}

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = useState<ToasterProps["theme"]>(resolveTheme)

  useEffect(() => {
    const updateTheme = () => setTheme(resolveTheme())
    const root = document.documentElement
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const observer = new MutationObserver(updateTheme)

    updateTheme()
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-mode"],
    })
    mediaQuery.addEventListener("change", updateTheme)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener("change", updateTheme)
    }
  }, [])

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      closeButton
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <CircleAlertIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius, var(--radius-md, 0.75rem))",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
export { toast } from "sonner"
