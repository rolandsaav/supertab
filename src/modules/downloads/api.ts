import type { DownloadEntry } from './parsers';
import { defineProxy } from '../../bridge/rpc';
import { MODULE } from './module';

/** Privileged operations the downloads module runs in the background. */
export interface DownloadsApi {
  prepare(): Promise<void>;
  query(q: string, reqId: number): Promise<{ reqId: number; items: DownloadEntry[] }>;
  openFile(id: string): Promise<void>;
  showFile(id: string): Promise<void>;
  openUrl(url: string): Promise<void>;
}

export const downloadsApi = defineProxy<DownloadsApi>(MODULE);
