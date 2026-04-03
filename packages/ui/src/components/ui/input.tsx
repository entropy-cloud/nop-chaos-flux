import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from '../../lib/utils'

type InputProps = Omit<React.ComponentProps<"input">, "size"> & {
  size?: "default" | "sm"
}

function Input({ className, type, size = "default", ...props }: InputProps) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      data-size={size}
      className={cn(
        "w-full min-w-0 rounded-md border border-input bg-transparent py-1 text-base shadow-xs transition-[color,background-color,border-color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        "data-[size=default]:h-9 data-[size=default]:px-3",
        "data-[size=sm]:h-8 data-[size=sm]:px-2 data-[size=sm]:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input, type InputProps }
