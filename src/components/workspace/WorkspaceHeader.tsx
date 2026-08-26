import { useMemo, useState } from "react";
import { Bell, FileText, Search } from "lucide-react";
import { useWorkspace } from "@/workspace/store";
import { ToolSwitcher } from "@/components/workspace/ToolSwitcher";
import { NotesToolbar } from "@/components/tools/NotesToolbar";
import { QuoteToolbar } from "@/components/tools/QuoteToolbar";
import type { WidgetType } from "@/workspace/types";
import { quoteNumber } from "@/lib/quote-model";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

interface SearchHit {
  key: string;
  group: string;
  text: string;
  onOpen: () => void;
}

export function WorkspaceHeader() {
  const {
    widgets,
    openWidget,
    openTool,
    quote,
    quoteHistory,
    loadQuote,
  } = useWorkspace();
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // Global search: matches notes, reminders, tasks, contacts, information
  // rows and quotations (current + history).
  const hits = useMemo<SearchHit[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchHit[] = [];

    for (const w of widgets) {
      const c = w.content;
      const push = (text: string) => {
        const clean = text.trim();
        if (clean && clean.toLowerCase().includes(q))
          out.push({
            key: `${w.id}:${out.length}`,
            group: w.title,
            text: clean,
            onOpen: () => openWidget(w.id),
          });
      };
      if (c.kind === "reminders" || c.kind === "tasks") {
        c.items.forEach((i) => push(i.title));
      } else if (c.kind === "contacts") {
        c.items.forEach((i) => {
          const hay = [i.name, i.company, i.email, i.phone].filter(Boolean).join(" · ");
          if (hay.toLowerCase().includes(q)) push(hay);
        });
      } else if (c.kind === "information") {
        c.items.forEach((i) => push(`${i.label} ${i.value}`));
      } else if (c.kind === "notes") {
        c.items.forEach((i) => push(stripHtml(i.text)));
      }
    }

    const docs = [quote, ...quoteHistory.filter((h) => h.id !== quote.id)];
    for (const doc of docs) {
      const hay = [doc.recipient, doc.company, doc.guest, quoteNumber(doc)]
        .join(" ")
        .toLowerCase();
      if (hay.includes(q))
        out.push({
          key: `quote:${doc.id}`,
          group: "Quotes",
          text: `${quoteNumber(doc)} · ${doc.recipient || doc.company || "Quotation"}`,
          onOpen: () => {
            if (doc.id !== quote.id) loadQuote(doc.id);
            openTool("quote");
          },
        });
    }
    return out.slice(0, 10);
  }, [query, widgets, quote, quoteHistory, openWidget, openTool, loadQuote]);

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-[1240px] items-center justify-between px-5">
        <ToolSwitcher />

        <div className="flex items-center gap-1">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Search className="size-[17px]" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search reservations, guests, notes"
                className="w-full rounded-lg bg-secondary px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              />
              {query.trim() ? (
                <div className="max-h-72 overflow-y-auto px-1 pb-1 pt-2">
                  {hits.length === 0 ? (
                    <p className="px-2 py-3 text-sm text-muted-foreground">
                      No results for “{query.trim()}”.
                    </p>
                  ) : (
                    <ul className="space-y-0.5 text-sm">
                      {hits.map((h) => (
                        <li key={h.key}>
                          <button
                            type="button"
                            onClick={() => {
                              h.onOpen();
                              setSearchOpen(false);
                              setQuery("");
                            }}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-secondary"
                          >
                            <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate">{h.text}</span>
                            <span className="label-xs shrink-0">{h.group}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <>
                  <p className="px-3 pb-1 pt-3 label-xs">Recent</p>
                  <ul className="space-y-1 px-1 pb-1 text-sm">
                    <li className="rounded-md px-2 py-1.5 hover:bg-secondary">
                      Carlos Morales · <span className="font-mono text-xs">21114</span>
                    </li>
                    <li className="rounded-md px-2 py-1.5 hover:bg-secondary">
                      Biomedical Support · 9 HAB
                    </li>
                  </ul>
                </>
              )}
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger className="relative flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
              <Bell className="size-[17px]" />
              <span className="absolute right-1.5 top-1.5 size-1.5 rounded-full bg-entity-reservation" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72 p-3 text-sm">
              <p className="label-xs mb-2">Notifications</p>
              <p className="text-muted-foreground">
                Quotation for <span className="font-mono text-xs text-foreground">21114</span> is due
                tomorrow.
              </p>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </header>
  );
}
