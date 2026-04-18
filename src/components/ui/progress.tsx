import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const v = typeof value === "number" && Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-white/[0.08]", className)}
      {...props}
      value={v}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full rounded-full bg-gradient-to-r from-violet-400/90 to-fuchsia-400/80 transition-all duration-500 ease-out"
        style={{ transform: `translateX(-${100 - v}%)` }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
