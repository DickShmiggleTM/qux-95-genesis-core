import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

const LeftDrawer = ({
  shouldScaleBackground = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) => (
  <DrawerPrimitive.Root
    shouldScaleBackground={shouldScaleBackground}
    {...props}
  />
)
LeftDrawer.displayName = "LeftDrawer"

const LeftDrawerTrigger = DrawerPrimitive.Trigger

const LeftDrawerPortal = DrawerPrimitive.Portal

const LeftDrawerClose = DrawerPrimitive.Close

const LeftDrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Overlay
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/80", className)}
    {...props}
  />
))
LeftDrawerOverlay.displayName = "LeftDrawerOverlay"

const LeftDrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <LeftDrawerPortal>
    <LeftDrawerOverlay />
    <DrawerPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-0 bottom-[calc(var(--status-bar-height,40px)+1px)] top-auto z-50 max-h-[calc(100vh-var(--status-bar-height,40px)-1px)] w-auto flex flex-col rounded-tr-[10px] border bg-background transform transition-transform duration-300 ease-in-out data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full",
        className
      )}
      {...props}
    >
      <div className="mx-auto mt-2 h-1 w-[60px] rounded-full bg-cyberpunk-neon-green opacity-70" />
      {children}
    </DrawerPrimitive.Content>
  </LeftDrawerPortal>
))
LeftDrawerContent.displayName = "LeftDrawerContent"

const LeftDrawerHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("grid gap-1.5 p-4 text-left", className)}
    {...props}
  />
)
LeftDrawerHeader.displayName = "LeftDrawerHeader"

const LeftDrawerFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
)
LeftDrawerFooter.displayName = "LeftDrawerFooter"

const LeftDrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
LeftDrawerTitle.displayName = "LeftDrawerTitle"

const LeftDrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DrawerPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
LeftDrawerDescription.displayName = "LeftDrawerDescription"

export {
  LeftDrawer,
  LeftDrawerPortal,
  LeftDrawerOverlay,
  LeftDrawerTrigger,
  LeftDrawerClose,
  LeftDrawerContent,
  LeftDrawerHeader,
  LeftDrawerFooter,
  LeftDrawerTitle,
  LeftDrawerDescription,
}
