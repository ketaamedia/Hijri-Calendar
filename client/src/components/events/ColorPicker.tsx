import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import type { EventColor } from "@shared/schema";
import { eventColorNames } from "@shared/schema";

interface ColorPickerProps {
  value: EventColor;
  onChange: (color: EventColor) => void;
}

const colorBgClasses: Record<EventColor, string> = {
  primary: "bg-primary",
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
};

const colorBorderClasses: Record<EventColor, string> = {
  primary: "border-primary",
  red: "border-red-500",
  orange: "border-orange-500",
  yellow: "border-yellow-500",
  green: "border-green-500",
  blue: "border-blue-500",
  purple: "border-purple-500",
  pink: "border-pink-500",
};

const colors: EventColor[] = ["primary", "red", "orange", "yellow", "green", "blue", "purple", "pink"];

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2" data-testid="color-picker">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            "w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110",
            colorBgClasses[color],
            value === color && "ring-2 ring-offset-2 ring-foreground"
          )}
          title={eventColorNames[color]}
          data-testid={`button-color-${color}`}
        >
          {value === color && <Check className="h-4 w-4 text-white" />}
        </button>
      ))}
    </div>
  );
}

export function getEventBgClass(color: EventColor): string {
  return colorBgClasses[color] || colorBgClasses.primary;
}

export function getEventBorderClass(color: EventColor): string {
  return colorBorderClasses[color] || colorBorderClasses.primary;
}
