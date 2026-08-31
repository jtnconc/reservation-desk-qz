import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { History, PhoneOff, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { useWorkspace } from "@/workspace/store";
import {
  ENTITY_STYLES,
  extractContact,
  extractReminder,
  parseEntities,
} from "@/lib/note-parser";
import {
  CALL_HASHTAGS,
  findActivePropertyCode,
  PROPERTY_STYLES,
} from "@/lib/property-codes";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { insertHashtagAfterActiveProperty, registerNotesEditor } from "./notes-format";

const HIGHLIGHT_PREFIX = "entity-";


export function NotesTool() {
  const {
    noteText,
    setNoteText,
    noteHistory,
    saveNoteToWidget,
    restoreNoteVersion,
    addReminder,
    addContact,
  } = useWorkspace();
  const editorRef = useRef<HTMLDivElement>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [plain, setPlain] = useState("");

  // Keep the DOM in sync only when the incoming value differs (restore/version).
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== noteText) el.innerHTML = noteText;
    setPlain(el.textContent ?? "");
  }, [noteText]);

  useEffect(() => {
    registerNotesEditor(editorRef.current);
    return () => registerNotesEditor(null);
  }, []);

  const entities = useMemo(() => parseEntities(plain), [plain]);
  const activeProperty = useMemo(() => findActivePropertyCode(plain), [plain]);
  const activePropertyStyle = activeProperty
    ? PROPERTY_STYLES[activeProperty.code]
    : null;

  /** Paint entity + property-code highlights with the CSS Custom Highlight API (no overlay → caret stays exact). */
  const paintHighlights = useCallback(() => {
    const el = editorRef.current;
    const highlights = (
      CSS as unknown as { highlights?: Map<string, unknown> }
    ).highlights;
    if (!el || !highlights || typeof Highlight === "undefined") return;

    for (const key of Object.keys(ENTITY_STYLES))
      highlights.delete(HIGHLIGHT_PREFIX + key);
    for (const style of Object.values(PROPERTY_STYLES))
      highlights.delete(style.highlightKey);

    // Flatten text nodes with their global offsets.
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes: { node: Text; start: number }[] = [];
    let offset = 0;
    let n = walker.nextNode() as Text | null;
    while (n) {
      nodes.push({ node: n, start: offset });
      offset += n.data.length;
      n = walker.nextNode() as Text | null;
    }

    const rangeFor = (start: number, end: number): Range | null => {
      const range = document.createRange();
      let placedStart = false;
      let placedEnd = false;
      for (const { node, start: nodeStart } of nodes) {
        const nodeEnd = nodeStart + node.data.length;
        if (!placedStart && start >= nodeStart && start <= nodeEnd) {
          range.setStart(node, start - nodeStart);
          placedStart = true;
        }
        if (placedStart && !placedEnd && end >= nodeStart && end <= nodeEnd) {
          range.setEnd(node, end - nodeStart);
          placedEnd = true;
          break;
        }
      }
      return placedStart && placedEnd ? range : null;
    };

    if (entities.length > 0) {
      const byType = new Map<string, Range[]>();
      for (const e of entities) {
        const range = rangeFor(e.start, e.end);
        if (!range) continue;
        const list = byType.get(e.type) ?? [];
        list.push(range);
        byType.set(e.type, list);
      }
      for (const [type, ranges] of byType)
        highlights.set(
          HIGHLIGHT_PREFIX + type,
          new Highlight(...(ranges as never[])),
        );
    }

    if (activeProperty && activePropertyStyle) {
      const range = rangeFor(activeProperty.start, activeProperty.end);
      if (range)
        highlights.set(
          activePropertyStyle.highlightKey,
          new Highlight(range as never),
        );
    }
  }, [entities, activeProperty, activePropertyStyle]);

  useEffect(() => {
    paintHighlights();
  }, [paintHighlights, noteText]);

  const entityCounts = entities.reduce<Record<string, number>>((acc, e) => {
    acc[e.type] = (acc[e.type] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <div
          className="notes-paper relative min-h-[280px] flex-1 overflow-y-auto rounded-xl"
          onClick={() => editorRef.current?.focus()}
        >
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            suppressHydrationWarning
            role="textbox"
            aria-multiline="true"
            aria-label="Notes"
            spellCheck={false}
            onKeyDown={(e) => {
              if (e.key !== "Enter" || e.shiftKey) return;
              const el = e.currentTarget;
              const text = el.textContent ?? "";
              const trimmed = text.trimEnd();
              const isReminder = trimmed.endsWith("*");
              const isContact = trimmed.endsWith("#");
              if (!isReminder && !isContact) return;
              e.preventDefault();

              if (isReminder) {
                const { title, date } = extractReminder(text);
                if (!title) return;
                addReminder(title, date);
                toast.success("Reminder created", {
                  description: [title, date].filter(Boolean).join(" · "),
                });
              } else {
                const draft = extractContact(text);
                if (!draft.name) return;
                addContact(draft);
                toast.success("Contact created", {
                  description: [draft.company, draft.email, draft.phone]
                    .filter(Boolean)
                    .join(" · ") || draft.name,
                });
              }

              el.innerHTML = "";
              setPlain("");
              setNoteText("");
            }}
            onPaste={(e) => {
              // Clean external clipboard HTML so dangerous markup never lands
              // in the editor (and thus never gets persisted or re-rendered).
              const html = e.clipboardData.getData("text/html");
              if (!html) return; // plain-text paste is inert; let it through
              e.preventDefault();
              document.execCommand("insertHTML", false, sanitizeHtml(html));
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              setPlain(el.textContent ?? "");
              setNoteText(el.innerHTML);
            }}
            className="notes-editor min-h-full w-full outline-none"
          />
        </div>

        {showHistory && (
          <aside className="w-64 shrink-0 overflow-y-auto border-l border-border pl-4">
            <p className="label-xs mb-2">History</p>
            <ul className="space-y-1.5">
              {noteHistory.length === 0 && (
                <li className="text-[12px] text-muted-foreground">No saved versions yet.</li>
              )}
              {noteHistory.map((v) => (
                <li key={v.id} className="rounded-xl bg-surface-2 p-2.5">
                  <p className="font-mono text-[10.5px] text-muted-foreground">{v.savedAt}</p>
                  <div
                    className="notes-rich mt-1 line-clamp-2 text-[12px]"
                    dangerouslySetInnerHTML={{ __html: sanitizeHtml(v.text) }}
                  />
                  <div className="mt-1.5 flex gap-2">
                    <button
                      onClick={() => setPreview(preview === v.id ? null : v.id)}
                      className="text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      {preview === v.id ? "Hide" : "View"}
                    </button>
                    <button
                      onClick={() => restoreNoteVersion(v.id)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3" /> Restore & edit
                    </button>
                  </div>
                  {preview === v.id && (
                    <div
                      className="notes-rich mt-2 text-[11.5px] leading-snug"
                      dangerouslySetInnerHTML={{ __html: sanitizeHtml(v.text) }}
                    />
                  )}
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>

      <footer className="mt-auto flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border pt-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {activePropertyStyle ? (
            <>
              <span
                className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold"
                style={{
                  backgroundColor: activePropertyStyle.hex,
                  color: activePropertyStyle.fg,
                }}
              >
                {activePropertyStyle.code} · {activePropertyStyle.label}
              </span>
              {CALL_HASHTAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => insertHashtagAfterActiveProperty(tag)}
                  className="rounded-full px-2 py-0.5 text-[10.5px] font-medium transition-opacity hover:opacity-80"
                  style={{
                    backgroundColor: `${activePropertyStyle.hex}33`,
                    color: activePropertyStyle.hex,
                  }}
                >
                  {tag}
                </button>
              ))}
            </>
          ) : (
            Object.entries(entityCounts).map(([type, count]) => (
              <span
                key={type}
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10.5px] font-medium",
                  ENTITY_STYLES[type as keyof typeof ENTITY_STYLES].className,
                )}
              >
                {ENTITY_STYLES[type as keyof typeof ENTITY_STYLES].label} · {count}
              </span>
            ))
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => {
              const el = editorRef.current;
              if (!el?.textContent?.trim() && !el?.querySelector("img")) return;
              saveNoteToWidget();
              el.innerHTML = "";
              setPlain("");
              toast.success("Note saved");
            }}
            aria-label="Save note"
            title="Save note"
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <Save className="size-[15px]" />
          </button>
          <button
            onClick={() => setShowHistory((v) => !v)}
            aria-label="Notes history"
            title="Notes history"
            className={cn(
              "flex size-8 items-center justify-center rounded-full transition-colors",
              showHistory ? "bg-secondary text-foreground" : "text-muted-foreground hover:bg-secondary",
            )}
          >
            <History className="size-[15px]" />
          </button>
          {activePropertyStyle && (
            <button
              onClick={() => {
                const el = editorRef.current;
                if (!el?.textContent?.trim() && !el?.querySelector("img")) return;
                saveNoteToWidget();
                el.innerHTML = "";
                setPlain("");
                setNoteText("");
                toast.success("Call finished", {
                  description: `${activePropertyStyle.code} · ${activePropertyStyle.label}`,
                });
              }}
              aria-label="Finish call"
              title="Finish call"
              className="flex size-8 items-center justify-center rounded-full text-primary-foreground shadow-desk transition-opacity hover:opacity-90"
              style={{ backgroundColor: activePropertyStyle.hex, color: activePropertyStyle.fg }}
            >
              <PhoneOff className="size-[15px]" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
