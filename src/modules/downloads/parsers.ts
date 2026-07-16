import type { Downloads } from 'webextension-polyfill';

export interface DownloadEntry {
  id: string;
  filename: string;
  /** Absolute path the file was saved to. */
  path: string;
  /** Where the file was downloaded from. */
  url: string;
  startTime: number;
}

const basename = (path: string): string => path.split(/[\\/]/).pop() || path;

export function parseDownload(item: Downloads.DownloadItem): DownloadEntry {
  return {
    id: String(item.id),
    filename: basename(item.filename),
    path: item.filename,
    url: item.url || '',
    startTime: item.startTime ? new Date(item.startTime).getTime() : 0,
  };
}
