import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 tracking-wide',
  {
    variants: {
      variant: {
        default:
          'bg-navy-600 text-white hover:bg-navy-700 rounded-sm',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-sm',
        outline:
          'border border-border bg-background hover:bg-muted hover:border-navy-300 text-foreground rounded-sm',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/70 rounded-sm',
        ghost:
          'hover:bg-muted text-muted-foreground hover:text-foreground rounded-sm',
        link:
          'text-navy-600 underline-offset-4 hover:underline p-0 h-auto',
        success:
          'bg-emerald-700 text-white hover:bg-emerald-800 rounded-sm',
        warning:
          'bg-amber-500 text-white hover:bg-amber-600 rounded-sm',
        gold:
          'bg-gold-400 text-white hover:bg-gold-500 rounded-sm',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
