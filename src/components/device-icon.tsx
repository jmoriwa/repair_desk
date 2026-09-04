import {
  Gamepad2,
  HardDrive,
  Laptop,
  Monitor,
  Printer,
  Smartphone,
  Tablet,
  Tv,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DeviceType } from "@/services";
import { cn } from "@/lib/utils";

const ICONS: Record<DeviceType, LucideIcon> = {
  Laptop,
  Desktop: HardDrive,
  Smartphone,
  Tablet,
  Monitor,
  Printer,
  Television: Tv,
  "Game console": Gamepad2,
  Other: Wrench,
};

export function DeviceIcon({
  type,
  className,
}: {
  type: DeviceType;
  className?: string;
}) {
  const Icon = ICONS[type] ?? Wrench;
  return <Icon className={cn("size-4", className)} />;
}

/** Square icon tile used in list rows and detail headers. */
export function DeviceTile({
  type,
  className,
}: {
  type: DeviceType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-sm border border-border bg-surface text-muted-foreground",
        className,
      )}
    >
      <DeviceIcon type={type} />
    </span>
  );
}
