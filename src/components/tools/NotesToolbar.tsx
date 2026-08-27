import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Check,
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Italic,
  Code2,
  Sparkles,
  Type,
  TypeOutline,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  applyNotesFontSize,
  execNotesCommand,
  insertNotesImage,
  readNotesFontFamily,
  readNotesFontSize,
} from "./notes-format";

const COLORS = [
  { label: "Ink", value: "#1c1c1e" },
  { label: "Blue", value: "#2563eb" },
  { label: "Green", value: "#0f766e" },
  { label: "Amber", value: "#b45309" },
  { label: "Red", value: "#b91c1c" },
  { label: "Violet", value: "#6d28d9" },
];

const FONTS = [
  {
    label: "Inter",
    hint: "System Sans",
    icon: Type,
    value: "Inter, ui-sans-serif, system-ui, sans-serif",
    match: "inter",
  },
  {
    label: "Merriweather",
    hint: "Serif",
    icon: TypeOutline,
    value: "Merriweather, ui-serif, Georgia, Cambria, serif",
    match: "merriweather",
  },
  {
    label: "JetBrains Mono",
    hint: "Monospace",
    icon: Code2,
    value: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
    match: "jetbrains",
  },
  {
    label: "Poppins",
    hint: "Display Geometric Sans",
    icon: Sparkles,
    value: "Poppins, ui-sans-serif, system-ui, sans-serif",
    match: "poppins",
  },
];

const BASE_FONT_SIZE = 16;
const MIN_FONT_SIZE = 8;
const MAX_FONT_SIZE = 96;

const clampSize = (n: number) =>
  Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, Math.round(n)));

const btn =
  "flex size-8 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-desk transition-colors hover:bg-secondary hover:text-foreground";
const activeBtn =
  "bg-primary text-primary-foreground border-primary hover:bg-primary hover:text-primary-foreground";

export function NotesToolbar() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState({ bold: false, italic: false });
  const [fontFamily, setFontFamily] = useState<string | null>(null);
  const [size, setSize] = useState(BASE_FONT_SIZE);
  const [sizeDraft, setSizeDraft] = useState(String(BASE_FONT_SIZE));

  const syncActive = () => {
    setActive({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
    });
    setFontFamily(readNotesFontFamily());
    const current = readNotesFontSize();
    if (current !== null) {
      setSize(current);
      setSizeDraft(String(current));
    }
  };

  /** Commit a size to the editor and keep the input in sync. */
  const commitSize = (next: number) => {
    const px = clampSize(next);
    setSize(px);
    setSizeDraft(String(px));
    applyNotesFontSize(px);
  };

  useEffect(() => {
    syncActive();
    document.addEventListener("selectionchange", syncActive);
    return () => document.removeEventListener("selectionchange", syncActive);
  }, []);

  const toggle = (command: "bold" | "italic") => {
    execNotesCommand(command);
    // Reflect the new state immediately so combined bold+italic both stay lit.
    syncActive();
  };

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
        aria-pressed={active.bold}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggle("bold")}
        className={cn(btn, active.bold && activeBtn)}
      >
        <Bold className="size-[14px]" />
      </button>
      <button
        type="button"
        aria-label="Italic"
        aria-pressed={active.italic}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => toggle("italic")}
        className={cn(btn, active.italic && activeBtn)}
      >
        <Italic className="size-[14px]" />
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Typography"
            onMouseDown={(e) => e.preventDefault()}
            className={btn}
          >
            <Type className="size-[14px]" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-64 space-y-3 p-3">
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Text color
            </p>
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
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Font family
            </p>
            <ul
              role="menu"
              aria-label="Font family"
              className="max-h-[300px] divide-y divide-border overflow-y-auto rounded-md border border-border bg-surface"
            >
              {FONTS.map((f) => {
                const Icon = f.icon;
                const selected = fontFamily
                  ?.toLowerCase()
                  .includes(f.match);
                return (
                  <li key={f.value} role="none">
                    <button
                      type="button"
                      role="menuitemradio"
                      aria-checked={Boolean(selected)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        execNotesCommand("fontName", f.value);
                        setFontFamily(f.value);
                      }}
                      className="flex w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-secondary"
                    >
                      <span className="flex w-4 shrink-0 justify-center">
                        {selected && (
                          <Check className="size-3.5 text-primary" />
                        )}
                      </span>
                      <Icon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1">
                        <span
                          className="block truncate text-[13px] leading-tight text-foreground"
                          style={{ fontFamily: f.value }}
                        >
                          {f.label}
                        </span>
                        <span className="block truncate text-[10.5px] leading-tight text-muted-foreground">
                          {f.hint}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="notes-font-size"
              className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            >
              Font size
            </label>
            <div className="flex flex-1 items-center rounded-md border border-border bg-surface">
              <input
                id="notes-font-size"
                type="number"
                inputMode="numeric"
                min={MIN_FONT_SIZE}
                max={MAX_FONT_SIZE}
                value={sizeDraft}
                aria-label="Font size in pixels"
                onChange={(e) => setSizeDraft(e.target.value)}
                onBlur={() => {
                  const parsed = Number.parseInt(sizeDraft, 10);
                  if (Number.isNaN(parsed)) setSizeDraft(String(size));
                  else commitSize(parsed);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    commitSize(size + 1);
                  } else if (e.key === "ArrowDown") {
                    e.preventDefault();
                    commitSize(size - 1);
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    const parsed = Number.parseInt(sizeDraft, 10);
                    if (!Number.isNaN(parsed)) commitSize(parsed);
                  }
                }}
                className="w-full min-w-0 bg-transparent px-2 py-1 text-[13px] text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <span className="pointer-events-none pr-1 text-[11px] text-muted-foreground">
                px
              </span>
              <span className="flex flex-col border-l border-border">
                <button
                  type="button"
                  aria-label="Increase font size"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitSize(size + 1)}
                  className="flex h-3.5 w-5 items-center justify-center text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Decrease font size"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => commitSize(size - 1)}
                  className="flex h-3.5 w-5 items-center justify-center border-t border-border text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <ChevronDown className="size-3" />
                </button>
              </span>
            </div>
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
