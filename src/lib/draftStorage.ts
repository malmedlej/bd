const DRAFT_KEY = 'bd-pulse-drafts';

interface Draft {
  id: string;
  type: string;
  data: Record<string, unknown>;
  savedAt: string;
}

export function saveDraft(type: string, id: string, data: Record<string, unknown>): void {
  try {
    const drafts = getDrafts();
    drafts[`${type}-${id}`] = { id, type, data, savedAt: new Date().toISOString() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {}
}

export function getDraft(type: string, id: string): Draft | null {
  try {
    const drafts = getDrafts();
    return drafts[`${type}-${id}`] ?? null;
  } catch {
    return null;
  }
}

export function clearDraft(type: string, id: string): void {
  try {
    const drafts = getDrafts();
    delete drafts[`${type}-${id}`];
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch {}
}

export function getDraftCount(): number {
  try {
    return Object.keys(getDrafts()).length;
  } catch {
    return 0;
  }
}

function getDrafts(): Record<string, Draft> {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
