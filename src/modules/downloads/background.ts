import browser from 'webextension-polyfill';
import { registerModule } from '../../bridge/rpc-background';
import { parseDownload } from './parsers';
import { rank } from './ranking';
import type { DownloadEntry } from './parsers';
import type { DownloadsApi } from './api';
import { MODULE } from './module';

const SEARCH_LIMIT = 1000;

// Completed downloads held between keystrokes. Emptied on palette-open (freshness).
let cache: DownloadEntry[] | null = null;

async function fill(): Promise<DownloadEntry[]> {
  if (cache) {
    return cache;
  }
  const results = await browser.downloads.search({ limit: SEARCH_LIMIT, orderBy: ['-startTime'] });
  cache = results.filter((d) => d.filename && d.state === 'complete').map(parseDownload);
  return cache;
}

/** Download ids cross the RPC boundary as strings; the downloads.* API wants numbers. */
const toId = (id: string): number => Number(id);

const handlers: DownloadsApi = {
  async prepare() {
    cache = null;
  },
  async query(query, reqId) {
    const items = await fill();
    return { reqId, items: rank(items, query) };
  },
  async openFile(id) {
    await browser.downloads.open(toId(id));
  },
  async showFile(id) {
    await browser.downloads.show(toId(id));
  },
  async openUrl(url) {
    await browser.tabs.create({ url });
  }
};

registerModule(MODULE, handlers);
