import { useEffect, useRef, useState } from "react";
import { Bold, Italic, ImagePlus, Palette } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { execNotesCommand, insertNotesImage } from "./notes-format";

const COLORS = [
  { label: "Ink", value: "#1c1c1e" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#0f766e" },
  { label: "Amber", value: "#b45309" },
  { label: "Red", value: "#b91c1c" },
  { label: "Violet", value: "#6d28d9" },
];

const btn =
  "flex size-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-desk transition-colors hover:bg-secondary hover:text-foreground";
const activeBtn =
  "bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground";

export function NotesToolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState({ bold: false, italic: false });

  useEffect(() => {
    const update = () => {
      setActive({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
      });
    };
    update();
    document.addEventListener("selectionchange", update);
    return () => document.removeEventListener("selectionchange", update);
  }, []);

  const pickImage = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => insertNotesImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        aria-label="Bold"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => execNotesCommand("bold")}
        className={cn(btn, active.bold && activeBtn)}
      >
        <Bold className="size-[14px]" />
      </button>
      <button
        type="button"
        aria-label="Italic"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => execNotesCommand("italic")}
        className={cn(btn, active.italic && activeBtn)}
      >
        <Italic className="size-[14px]" />
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Text color"
            onMouseDown={(e) => e.preventDefault()}
            className={btn}
          >
            <Palette className="size-[14px]" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c.value}
                type="button"
                aria-label={c.label}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => execNotesCommand("foreColor", c.value)}
                className="size-5 rounded-full border border-border transition-transform hover:scale-110"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <button
        type="button"
        aria-label="Insert image"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className={btn}
      >
        <ImagePlus className="size-[14px]" />
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pickImage(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
