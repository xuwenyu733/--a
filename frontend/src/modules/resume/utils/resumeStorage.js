const STORAGE_KEY = 'ai-resume-data';

export function loadResumeState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  }
}

export function saveResumeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* localStorage 已满或不可用时忽略 */
  }
}

export function clearResumeState() {
  localStorage.removeItem(STORAGE_KEY);
}
