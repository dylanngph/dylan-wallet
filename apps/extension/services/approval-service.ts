import { browser } from "#imports";
import type { ApprovalPayload } from "../lib/dapp-protocol";

const WIDTH = 380;
const HEIGHT = 620;
const MARGIN = 16;

interface Pending {
  payload: ApprovalPayload;
  resolve: (approved: boolean) => void;
  windowId?: number;
}

/**
 * Manages dapp approval prompts: opens a popup window for each request and
 * resolves the originating promise when the user decides (or rejects if they
 * close the window). The window is positioned at the top-right of the active
 * browser window so it lines up with the toolbar popup.
 */
export class ApprovalService {
  #pending = new Map<string, Pending>();
  #seq = 0;

  constructor() {
    browser.windows.onRemoved.addListener((windowId) => {
      for (const [id, entry] of this.#pending) {
        if (entry.windowId === windowId) {
          entry.resolve(false);
          this.#pending.delete(id);
        }
      }
    });
  }

  request(payload: ApprovalPayload): Promise<boolean> {
    const id = `${Date.now()}-${this.#seq++}`;
    const result = new Promise<boolean>((resolve) => {
      this.#pending.set(id, { payload, resolve });
    });
    void this.#open(id);
    return result;
  }

  get(id: string): ApprovalPayload | undefined {
    return this.#pending.get(id)?.payload;
  }

  settle(id: string, approved: boolean) {
    const entry = this.#pending.get(id);
    if (!entry) return;
    this.#pending.delete(id);
    entry.resolve(approved);
    if (entry.windowId !== undefined) {
      void browser.windows.remove(entry.windowId).catch(() => {});
    }
  }

  async #open(id: string) {
    const position = await this.#position();
    const win = await browser.windows.create({
      url: browser.runtime.getURL(`/approval.html?id=${id}`),
      type: "popup",
      width: WIDTH,
      height: HEIGHT,
      focused: true,
      ...position,
    });
    const entry = this.#pending.get(id);
    if (entry && win?.id !== undefined) entry.windowId = win.id;
  }

  async #position(): Promise<{ left?: number; top?: number }> {
    try {
      const last = await browser.windows.getLastFocused();
      if (last.left === undefined || last.top === undefined || !last.width) return {};
      return {
        left: Math.max(0, last.left + last.width - WIDTH - MARGIN),
        top: last.top + MARGIN,
      };
    } catch {
      return {};
    }
  }
}
