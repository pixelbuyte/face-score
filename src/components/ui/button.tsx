import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[hsl(230_30%_5%)] disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-br from-[hsl(268_52%_52%)] to-[hsl(290_48%_42%)] text-white shadow-lg shadow-violet-950/50 hover:brightness-110",
        outline:
          "border border-white/10 bg-white/[0.03] text-foreground hover:bg-white/[0.07] hover:border-white/15",
        ghost: "text-foreground/80 hover:bg-white/[0.06] hover:text-foreground",
        subtle: "bg-white/[0.06] text-foreground hover:bg-white/[0.1]",
      },
      size: {
        default: "h-11 px-6",
        lg: "h-14 px-10 text-base rounded-2xl",
        sm: "h-9 px-4 rounded-xl text-xs",
        icon: "h-11 w-11 rounded-xl p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
