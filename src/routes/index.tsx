import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { WorkspaceProvider, useWorkspace } from "@/workspace/store";
import { WorkspaceHeader } from "@/components/workspace/WorkspaceHeader";
import { WidgetGrid } from "@/components/workspace/WidgetGrid";
import { NotesTool } from "@/components/tools/NotesTool";
import { NotesToolbar } from "@/components/tools/NotesToolbar";
import { RatesTool } from "@/components/tools/RatesTool";
import { QuoteTool } from "@/components/tools/QuoteTool";
import { QuoteToolbar } from "@/components/tools/QuoteToolbar";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Reservation Workspace — Hotel reservation desk" },
      {
        name: "description",
        content:
          "A calm digital desk for hotel reservation agents: intelligent notes, senior rate calculator and PDF quotations in one transforming workspace.",
      },
      { property: "og:title", content: "Reservation Workspace" },
      {
        property: "og:description",
        content:
          "Write, recognize, save and quote — one workspace that transforms around the reservation you are working on.",
      },
    ],
  }),
  component: WorkspacePage,
});

function WorkspacePage() {
  return (
    <WorkspaceProvider>
      <div className="min-h-screen bg-background">
        <WorkspaceHeader />
        <main className="mx-auto max-w-[1240px] px-5 py-3">
          <Workspace />
        </main>
        <Toaster position="bottom-right" />
      </div>
    </WorkspaceProvider>
  );
}

function Workspace() {
  const { mode, activeTool } = useWorkspace();
  const toolMode = mode === "tool";
  const [quotePreview, setQuotePreview] = useState(false);
  const [quoteHistory, setQuoteHistory] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div
        className={cn(
          "flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-[var(--ease-desk)]",
          toolMode && activeTool === "notes"
            ? "max-w-[280px] translate-x-0 opacity-100"
            : "max-w-0 -translate-x-2 opacity-0 pointer-events-none",
        )}
      >
        <NotesToolbar />
      </div>
      <div
        className={cn(
          "flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-[var(--ease-desk)]",
          toolMode && activeTool === "quote"
            ? "max-w-[220px] translate-x-0 opacity-100"
            : "max-w-0 -translate-x-2 opacity-0 pointer-events-none",
        )}
      >
        <QuoteToolbar
          preview={quotePreview}
          onTogglePreview={() => setQuotePreview((v) => !v)}
          history={quoteHistory}
          onToggleHistory={() => setQuoteHistory((v) => !v)}
        />
      </div>

      {/* Tool area — expands in tool mode, retracts fully in widget mode */}
      <section
        className={cn(
          "desk-panel overflow-hidden transition-all duration-500 ease-[var(--ease-desk)]",
          toolMode
            ? "min-h-[540px] p-6 opacity-100"
            : "pointer-events-none max-h-0 border-0 p-0 opacity-0 shadow-none",
        )}
        aria-hidden={!toolMode}
      >
        {toolMode && (
          <div className="flex h-[520px] flex-col">
            {activeTool === "notes" && <NotesTool />}
            {activeTool === "rates" && <RatesTool />}
            {activeTool === "quote" && (
              <QuoteTool showPreview={quotePreview} showHistory={quoteHistory} />
            )}
          </div>
        )}
      </section>

      <WidgetGrid />
    </div>
  );
}

