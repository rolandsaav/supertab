/**
 * Tracks which tabs have been activated this session. Backed by
 * `storage.session`, which survives service-worker restarts but clears when the
 * browser closes — matching "this session".
 */

import browser from 'webextension-polyfill';

const KEY = 'visitedTabIds';

// Runs tasks one at a time so two rapid updates can't both read the old set
// and overwrite each other.
//
// The tail of the queue: a promise that settles when the most recently
// scheduled task finishes. Starts already-resolved because nothing is
// scheduled yet, so the first task can run immediately.
let lastScheduled: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  // Wait for the previous task to finish, then run this one. We pass `task`
  // for BOTH the success and failure case so a previous task throwing doesn't
  // stop this one from running.
  const thisRun = lastScheduled.then(
    () => task(), // previous task succeeded
    () => task()  // previous task failed — run anyway
  );

  // Move the tail forward so the NEXT enqueue() waits for this task. The
  // .catch() keeps one failure from breaking the chain for everyone after it —
  // but only on the internal pointer, not on what we return.
  lastScheduled = thisRun.catch(() => {});

  // Hand the caller the real result, errors and all.
  return thisRun;
}

async function read(): Promise<Set<string>> {
  // Storage returns an object like { visitedTabIds: [...] }; pull out our key.
  // It's an array (or undefined on first run) since storage only holds JSON.
  const { [KEY]: ids } = await browser.storage.session.get(KEY);
  return new Set((ids as string[] | undefined) ?? []);
}

function write(ids: Set<string>): Promise<void> {
  // A Set isn't JSON, so spread it back to an array before storing.
  return browser.storage.session.set({ [KEY]: [...ids] });
}

// Read the set, apply a change, write it back — all as one queued step.
function update(mutate: (ids: Set<string>) => void): Promise<void> {
  return enqueue(async () => {
    const ids = await read();
    mutate(ids);
    await write(ids);
  });
}

/** Tab IDs activated at least once this session. */
export function getVisited(): Promise<Set<string>> {
  return read();
}

/** Mark a tab visited when it becomes active. */
export function markVisited(tabId: number): Promise<void> {
  return update((ids) => ids.add(String(tabId)));
}

/** Drop a closed tab from the set. */
export function forget(tabId: number): Promise<void> {
  return update((ids) => ids.delete(String(tabId)));
}

/**
 * Seed with every open tab, once per session, so only tabs opened afterward
 * can be flagged unvisited.
 */
export function seed(): Promise<void> {
  return enqueue(async () => {
    const tabs = await browser.tabs.query({}); // {} = every tab
    const ids = tabs.map((t) => t.id).filter((id) => id != null);
    await write(new Set(ids.map(String))); // replace the set wholesale
  });
}
