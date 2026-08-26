import { useState } from "react";
import { ArrowUpRight, Check, Clock, Pencil, Pin, Trash2, X } from "lucide-react";
import { useWorkspace } from "@/workspace/store";
import type { ItemStatus, NoteRefItem, ReminderItem, Widget } from "@/workspace/types";
import { DateField } from "@/components/common/DateField";
import { TimeField } from "@/components/common/TimeField";
import { cn } from "@/lib/utils";
import { sanitizeHtml } from "@/lib/sanitize-html";

import { accentVar } from "./AccentControl";

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

/** Tiny inline action button used by contextual item controls. */
function MiniAction({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onPointerDown={stop}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-secondary hover:text-foreground"
    >
      {children}
    </button>
  );
}

/**
 * Wrapper that reveals contextual actions on hover, or on tap (touch).
 * Actions are absolutely positioned over the item's trailing edge with a soft
 * fade so compact cards never get their content clipped or pushed around.
 */
function ItemActions({
  revealed,
  children,
}: {
  revealed: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute right-0 top-0 z-10 flex shrink-0 items-start gap-0.5 rounded-lg pl-2 backdrop-blur-[3px] transition-opacity duration-200",
        revealed
          ? "pointer-events-auto opacity-100"
          : "opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100",
      )}
    >
      {children}
    </span>
  );
}

/** Standard, subtle in-card delete confirmation used by every widget. */
function DeleteAction({
  label,
  confirming,
  onRequest,
  onCancel,
  onConfirm,
}: {
  label: string;
  confirming: boolean;
  onRequest: () => void;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (!confirming)
    return (
      <MiniAction label={label} onClick={onRequest}>
        <Trash2 className="size-3" />
      </MiniAction>
    );

  return (
    <>
      <MiniAction label={`Confirm ${label.toLowerCase()}`} onClick={onConfirm}>
        <Check className="size-3 text-destructive" />
      </MiniAction>
      <MiniAction label="Cancel delete" onClick={onCancel}>
        <X className="size-3" />
      </MiniAction>
    </>
  );
}

const taskState = (s: string): ItemStatus =>
  s === "done" || s === "completed" ? "completed" : "active";

const reminderState = (r: ReminderItem): ItemStatus =>
  r.status === "archived" ? "archived" : (r.status ?? (r.done ? "completed" : "active"));

/** Legacy values may be "2026-08-18 09:00". */
function splitWhen(r: ReminderItem) {
  const [d, t] = (r.date ?? "").split(" ");
  return { date: d ?? "", time: r.time ?? t ?? "" };
}

function TasksContent({ widget }: { widget: Widget }) {
  const { toggleTask, deleteTask } = useWorkspace();
  const [tapped, setTapped] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  if (widget.content.kind !== "tasks") return null;
  const items = widget.content.items;
  const accent = accentVar(widget.accent);

  return (
    <ul className="space-y-2">
      {items.map((t) => {
        const done = taskState(t.status) === "completed";
        const isConfirming = confirming === t.id;
        return (
          <li
            key={t.id}
            className="group relative flex min-h-6 items-start gap-2 pr-1"
            onClick={() => setTapped((v) => (v === t.id ? null : t.id))}
          >
            <button
              type="button"
              aria-label={done ? "Reopen task" : "Complete task"}
              onPointerDown={stop}
              onClick={(e) => {
                e.stopPropagation();
                toggleTask(widget.id, t.id);
              }}
              className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors"
              style={
                done
                  ? { backgroundColor: accent, borderColor: accent }
                  : { borderColor: "var(--border)" }
              }
            >
              {done && <Check className="size-2.5 text-white" strokeWidth={3} />}
            </button>
            <span
              className={cn(
                "min-w-0 flex-1 break-words text-[13px] leading-snug",
                done && "text-muted-foreground line-through",
              )}
            >
              {t.title}
            </span>
            <ItemActions revealed={tapped === t.id || isConfirming}>
              <DeleteAction
                label="Delete task"
                confirming={isConfirming}
                onRequest={() => setConfirming(t.id)}
                onCancel={() => setConfirming(null)}
                onConfirm={() => {
                  setConfirming(null);
                  deleteTask(widget.id, t.id);
                }}
              />
            </ItemActions>
          </li>
        );
      })}
    </ul>
  );
}

function RemindersContent({ widget }: { widget: Widget }) {
  const { updateReminder, setReminderStatus, deleteReminder } = useWorkspace();
  const [editing, setEditing] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState<string | null>(null);
  const [tapped, setTapped] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  if (widget.content.kind !== "reminders") return null;
  const accent = accentVar(widget.accent);
  const items = widget.content.items;

  return (
    <ul className="space-y-2.5">
      {items.map((r) => {
        const done = reminderState(r) === "completed";
        const when = splitWhen(r);
        const isEditing = editing === r.id;
        const isRescheduling = rescheduling === r.id;
        const isConfirming = confirming === r.id;
        return (
          <li
            key={r.id}
            className="group relative flex min-h-7 gap-2.5 pr-1"
            onClick={() => setTapped((v) => (v === r.id ? null : r.id))}
          >
            <button
              type="button"
              aria-label={done ? "Reopen reminder" : "Complete reminder"}
              onPointerDown={stop}
              onClick={(e) => {
                e.stopPropagation();
                setReminderStatus(widget.id, r.id, done ? "active" : "completed");
              }}
              className="mt-1 flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors"
              style={
                done
                  ? { backgroundColor: accent, borderColor: accent }
                  : { borderColor: accent, backgroundColor: "transparent" }
              }
            >
              {done && <Check className="size-2 text-white" strokeWidth={3} />}
            </button>

            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="space-y-1.5" onClick={stop} onPointerDown={stop}>
                  <input
                    value={r.title}
                    onChange={(e) => updateReminder(widget.id, r.id, { title: e.target.value })}
                    className="w-full rounded-lg bg-surface-2 px-2 py-1 text-[13px] outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(null);
                    }}
                    className="label-xs hover:text-foreground"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <p
                  className={cn(
                    "truncate text-[13px] leading-snug",
                    done && "text-muted-foreground line-through",
                  )}
                >
                  {r.title}
                </p>
              )}

              {isRescheduling ? (
                <div className="mt-1.5 space-y-1.5" onClick={stop} onPointerDown={stop}>
                  <div className="flex flex-col gap-1.5">
                    <DateField
                      size="sm"
                      value={when.date}
                      onChange={(iso) => updateReminder(widget.id, r.id, { date: iso })}
                      placeholder="Pick a date"
                      aria-label="Reminder date"
                    />
                    <TimeField
                      value={when.time}
                      onChange={(t) => updateReminder(widget.id, r.id, { time: t })}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setRescheduling(null);
                    }}
                    className="label-xs hover:text-foreground"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <p className="truncate font-mono text-[11px] text-muted-foreground">
                  {[when.date, when.time].filter(Boolean).join(" ") || "No date"}
                </p>
              )}
            </div>

            <ItemActions
              revealed={tapped === r.id || isEditing || isRescheduling || isConfirming}
            >
              {isConfirming ? (
                <DeleteAction
                  label="Delete reminder"
                  confirming
                  onRequest={() => setConfirming(r.id)}
                  onCancel={() => setConfirming(null)}
                  onConfirm={() => {
                    setConfirming(null);
                    deleteReminder(widget.id, r.id);
                  }}
                />
              ) : (
                <>
                  <MiniAction label="Edit reminder" onClick={() => setEditing(r.id)}>
                    <Pencil className="size-3" />
                  </MiniAction>
                  <MiniAction label="Reschedule reminder" onClick={() => setRescheduling(r.id)}>
                    <Clock className="size-3" />
                  </MiniAction>
                  <DeleteAction
                    label="Delete reminder"
                    confirming={false}
                    onRequest={() => setConfirming(r.id)}
                    onCancel={() => setConfirming(null)}
                    onConfirm={() => deleteReminder(widget.id, r.id)}
                  />
                </>
              )}
            </ItemActions>
          </li>
        );
      })}
    </ul>
  );
}

function ContactsContent({ widget }: { widget: Widget }) {
  const { updateContact, deleteContact } = useWorkspace();
  const [editing, setEditing] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [tapped, setTapped] = useState<string | null>(null);
  if (widget.content.kind !== "contacts") return null;

  const field =
    "w-full rounded-lg bg-surface px-2 py-1 text-[12px] outline-none focus:ring-1 focus:ring-ring";

  return (
    <ul className="grid grid-cols-1 gap-2.5 @[22rem]:grid-cols-2">
      {widget.content.items.map((p) => {
        const isEditing = editing === p.id;
        const isConfirming = confirming === p.id;
        return (
          <li
            key={p.id}
            className="group relative min-w-0 rounded-xl bg-surface-2 px-3 py-2"
            onClick={() => setTapped((v) => (v === p.id ? null : p.id))}
          >
            <div className="flex min-w-0 items-start gap-2">
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <div className="space-y-1" onClick={stop} onPointerDown={stop}>
                    {(
                      [
                        ["name", "Name"],
                        ["company", "Company"],
                        ["email", "Email"],
                        ["phone", "Phone"],
                      ] as const
                    ).map(([key, label]) => (
                      <input
                        key={key}
                        value={p[key] ?? ""}
                        placeholder={label}
                        aria-label={label}
                        onChange={(e) => updateContact(widget.id, p.id, { [key]: e.target.value })}
                        className={field}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(null);
                      }}
                      className="label-xs hover:text-foreground"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    <p className="truncate pr-6 text-[13px] font-medium">{p.name}</p>
                    {p.company && (
                      <p className="truncate text-[11px] text-muted-foreground">{p.company}</p>
                    )}
                    {p.email && <p className="truncate text-[11px] text-entity-email">{p.email}</p>}
                    {p.phone && (
                      <p className="truncate font-mono text-[11px] text-entity-phone">{p.phone}</p>
                    )}
                  </>
                )}
              </div>

              <ItemActions revealed={tapped === p.id || isEditing || isConfirming}>
                {isConfirming ? (
                  <DeleteAction
                    label="Delete contact"
                    confirming
                    onRequest={() => setConfirming(p.id)}
                    onCancel={() => setConfirming(null)}
                    onConfirm={() => {
                      setConfirming(null);
                      deleteContact(widget.id, p.id);
                    }}
                  />
                ) : (
                  <>
                    <MiniAction label="Edit contact" onClick={() => setEditing(p.id)}>
                      <Pencil className="size-3" />
                    </MiniAction>
                    <DeleteAction
                      label="Delete contact"
                      confirming={false}
                      onRequest={() => setConfirming(p.id)}
                      onCancel={() => setConfirming(null)}
                      onConfirm={() => deleteContact(widget.id, p.id)}
                    />
                  </>
                )}
              </ItemActions>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * In-place rich-text editor for a sticky note. Uncontrolled (innerHTML is set
 * once on mount) so typing never resets the caret; changes stream to the
 * store on every input.
 */
function StickyNoteEditor({ widgetId, note }: { widgetId: string; note: NoteRefItem }) {
  const { updateNoteContent } = useWorkspace();
  return (
    <div
      ref={(el) => {
        if (el && !el.dataset["init"]) {
          el.innerHTML = note.text;
          el.dataset["init"] = "1";
        }
      }}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      aria-label="Edit sticky note"
      onInput={(e) => updateNoteContent(widgetId, note.id, e.currentTarget.innerHTML)}
      onPointerDown={stop}
      onDragStart={(e) => e.preventDefault()}
      className="notes-rich min-h-5 min-w-0 cursor-text break-words rounded-md text-[13px] leading-snug outline-none transition-colors focus:bg-surface/50"
    />
  );
}

function NotesContent({ widget }: { widget: Widget }) {
  const { convertNoteToSticky, deleteNote, toggleNotePin, editNoteInEditor } = useWorkspace();
  const [tapped, setTapped] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  if (widget.content.kind !== "notes") return null;

  // Sticky notes render as a plain pastel note with click-to-edit content.
  if (widget.type === "sticky")
    return (
      <div className="space-y-2">
        {widget.content.items.map((n) => (
          <StickyNoteEditor key={n.id} widgetId={widget.id} note={n} />
        ))}
      </div>
    );

  const ordered = [...widget.content.items].sort(
    (a, b) => Number(!!b.pinned) - Number(!!a.pinned),
  );

  if (ordered.length === 0)
    return (
      <p className="text-[12px] text-muted-foreground">
        Write in the NOTES editor and press save to add a note here.
      </p>
    );

  return (
    <ul className="space-y-2">
      {ordered.map((n) => {
        const isConfirming = confirming === n.id;
        return (
          <li
            key={n.id}
            className={cn(
              "group relative flex min-w-0 items-start gap-2 rounded-xl bg-surface-2 px-3 py-2",
              n.pinned && "ring-1 ring-border",
            )}
            onClick={() => setTapped((v) => (v === n.id ? null : n.id))}
          >
            <span
              className="notes-rich min-w-0 flex-1 break-words text-[13px] leading-snug"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(n.text) }}
            />
            {n.pinned && (
              <Pin
                className="pointer-events-none absolute right-2 top-2 size-3 text-muted-foreground/60"
                fill="currentColor"
              />
            )}
            <ItemActions revealed={tapped === n.id || isConfirming}>
              {isConfirming ? (
                <DeleteAction
                  label="Delete note"
                  confirming
                  onRequest={() => setConfirming(n.id)}
                  onCancel={() => setConfirming(null)}
                  onConfirm={() => {
                    setConfirming(null);
                    deleteNote(widget.id, n.id);
                  }}
                />
              ) : (
                <>
                  <MiniAction
                    label={n.pinned ? "Unpin note" : "Pin note"}
                    onClick={() => toggleNotePin(widget.id, n.id)}
                  >
                    <Pin className="size-3" />
                  </MiniAction>
                  <MiniAction
                    label="Edit note"
                    onClick={() => editNoteInEditor(widget.id, n.id)}
                  >
                    <Pencil className="size-3" />
                  </MiniAction>
                  <MiniAction
                    label="Convert to sticky note"
                    onClick={() => convertNoteToSticky(widget.id, n.id)}
                  >
                    <ArrowUpRight className="size-3" />
                  </MiniAction>
                  <DeleteAction
                    label="Delete note"
                    confirming={false}
                    onRequest={() => setConfirming(n.id)}
                    onCancel={() => setConfirming(null)}
                    onConfirm={() => deleteNote(widget.id, n.id)}
                  />
                </>
              )}
            </ItemActions>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * INFORMATION renders as one unified 2-column block (labels left, monospace
 * values right-aligned). Actions are hidden by default; clicking the table
 * reveals a compact floating toolbar with edit / detach / clear icons.
 */
function InformationContent({ widget }: { widget: Widget }) {
  const { updateInformation, deleteInformation, addInformation, clearInformation, convertInformationToSticky } = useWorkspace();
  const [editing, setEditing] = useState(false);
  const [toolbar, setToolbar] = useState(false);
  if (widget.content.kind !== "information") return null;
  const items = widget.content.items;
  const field =
    "w-full rounded-lg bg-surface px-2 py-1 text-[12px] outline-none focus:ring-1 focus:ring-ring";

  if (editing)
    return (
      <div className="space-y-2" onClick={stop} onPointerDown={stop}>
        {items.map((i) => (
          <div key={i.id} className="flex items-center gap-1.5">
            <input
              value={i.label}
              aria-label="Label"
              placeholder="Label"
              onChange={(e) => updateInformation(widget.id, i.id, { label: e.target.value })}
              className={field}
            />
            <input
              value={i.value}
              aria-label="Value"
              placeholder="Value"
              onChange={(e) => updateInformation(widget.id, i.id, { value: e.target.value })}
              className={cn(field, "font-mono")}
            />
            <MiniAction label="Remove row" onClick={() => deleteInformation(widget.id, i.id)}>
              <Trash2 className="size-3" />
            </MiniAction>
          </div>
        ))}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => addInformation(widget.id)}
            className="label-xs hover:text-foreground"
          >
            Add row
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="label-xs hover:text-foreground"
          >
            Done
          </button>
        </div>
      </div>
    );

  return (
    <div
      className="relative"
      onClick={(e) => {
        e.stopPropagation();
        setToolbar((v) => !v);
      }}
    >
      {toolbar && (
        <div
          className="absolute -top-8 right-1 z-20 flex items-center gap-0.5 rounded-xl bg-surface/90 px-1.5 py-1 backdrop-blur-[3px]"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <MiniAction label="Edit block" onClick={() => setEditing(true)}>
            <Pencil className="size-3" />
          </MiniAction>
          <MiniAction label="Detach as sticky note" onClick={() => convertInformationToSticky(widget.id)}>
            <ArrowUpRight className="size-3" />
          </MiniAction>
          <MiniAction label="Clear information" onClick={() => clearInformation(widget.id)}>
            <Trash2 className="size-3" />
          </MiniAction>
        </div>
      )}
      <dl className="divide-y divide-border/60 overflow-hidden rounded-xl bg-surface-2">
        {items.map((i) => (
          <div key={i.id} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
            <dt className="label-xs shrink-0">{i.label}</dt>
            <dd className="min-w-0 truncate text-right font-mono text-[12.5px]">{i.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function WidgetContent({ widget }: { widget: Widget }) {
  const c = widget.content;

  if (c.kind === "reminders") return <RemindersContent widget={widget} />;
  if (c.kind === "tasks") return <TasksContent widget={widget} />;
  if (c.kind === "contacts") return <ContactsContent widget={widget} />;
  if (c.kind === "information") return <InformationContent widget={widget} />;

  return <NotesContent widget={widget} />;
}
