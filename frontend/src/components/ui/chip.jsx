import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/utils/cn"
import { cva } from "class-variance-authority"

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        outline: "border-2 border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-primary/50",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "px-3 py-1.5 text-sm",
        sm: "px-2 py-1 text-xs",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Chip = React.forwardRef(({ 
  className, 
  variant, 
  size, 
  onRemove, 
  children, 
  ...props 
}, ref) => {
  return (
    <span
      ref={ref}
      className={cn(chipVariants({ variant, size }), className)}
      {...props}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className="ml-1 rounded-full hover:bg-black/20 dark:hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 p-0.5 transition-colors duration-200"
          aria-label="Remove filter"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
})
Chip.displayName = "Chip"

export { Chip, chipVariants }

