/** Tiny bridge so the header toolbar can format the notes editor. */
let editor: HTMLElement | null = null;

export function registerNotesEditor(el: HTMLElement | null) {
  editor = el;
}

function withEditor(fn: (el: HTMLElement) => void) {
  if (!editor) return;
  editor.focus();
  const sel = window.getSelection();
  if (sel && sel.rangeCount === 0) {
    const r = document.createRange();
    r.selectNodeContents(editor);
    r.collapse(false);
    sel.addRange(r);
  }
  fn(editor);
  editor.dispatchEvent(new Event("input", { bubbles: true }));
}

export function execNotesCommand(command: string, value?: string) {
  withEditor(() => {
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(command, false, value);
  });
}

/**
 * Applies an exact pixel font size to the current selection.
 *
 * `execCommand("fontSize")` only accepts the legacy 1-7 buckets, so it can't
 * express "17px". Instead we let the browser tag the selection with a unique
 * legacy size, then rewrite those elements into `<span style="font-size:Npx">`.
 */
export function applyNotesFontSize(px: number) {
  withEditor((el) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;

    // Collapsed caret: nothing to wrap, so set the size for what's typed next.
    if (sel.getRangeAt(0).collapsed) {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      span.appendChild(document.createTextNode("\u200b")); // zero-width anchor
      sel.getRangeAt(0).insertNode(span);
      const range = document.createRange();
      range.setStart(span.firstChild as Text, 1);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    document.execCommand("styleWithCSS", false, "false");
    document.execCommand("fontSize", false, "7");
    document.execCommand("styleWithCSS", false, "true");

    // Rewrite every element the browser marked with the sentinel size.
    for (const marked of Array.from(
      el.querySelectorAll<HTMLElement>('font[size="7"], [style*="xxx-large"]'),
    )) {
      const span = document.createElement("span");
      span.style.fontSize = `${px}px`;
      while (marked.firstChild) span.appendChild(marked.firstChild);
      marked.replaceWith(span);
    }
  });
}

/** Reads the rendered font size (in px) at the current selection. */
export function readNotesFontSize(): number | null {
  const sel = window.getSelection();
  if (!editor || !sel || sel.rangeCount === 0) return null;
  const node = sel.anchorNode;
  if (!node || !editor.contains(node)) return null;
  const target = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  if (!target) return null;
  const size = Number.parseFloat(window.getComputedStyle(target).fontSize);
  return Number.isFinite(size) ? Math.round(size) : null;
}

/** Reads the rendered font family stack at the current selection. */
export function readNotesFontFamily(): string | null {
  const sel = window.getSelection();
  if (!editor || !sel || sel.rangeCount === 0) return null;
  const node = sel.anchorNode;
  if (!node || !editor.contains(node)) return null;
  const target = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
  if (!target) return null;
  return window.getComputedStyle(target).fontFamily || null;
}

export function insertNotesImage(dataUrl: string) {
  withEditor(() => {
    document.execCommand(
      "insertHTML",
      false,
      `<img src="${dataUrl}" alt="" style="max-width:100%;border-radius:10px;margin:6px 0;" />`,
    );
  });
}
