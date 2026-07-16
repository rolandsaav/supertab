import type { Item, SourceToggles } from './parsers';
import { defineProxy } from '../../bridge/rpc';
import { MODULE } from './module';

/** Privileged operations the search module runs in the background. */
export interface SearchApi {
  prepare(): Promise<void>;
  query(q: string, enabled: SourceToggles, reqId: number): Promise<{ reqId: number; items: Item[] }>;
  activateTab(id: string): Promise<void>;
  closeTab(id: string): Promise<void>;
  duplicateTab(id: string): Promise<void>;
  muteTab(id: string, muted: boolean): Promise<void>;
  reloadTab(id: string): Promise<void>;
  pinTab(id: string, pinned: boolean): Promise<void>;
  openUrl(url: string): Promise<void>;
  openUrlInCurrentTab(url: string): Promise<void>;
}

export const searchApi = defineProxy<SearchApi>(MODULE);
