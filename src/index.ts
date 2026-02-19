import 'dotenv/config';
import { loadConfig, loadSubscriptions } from './config.js';
import { loadState, saveState, checkRepo } from './github.js';
import { createAIClient, categorizeRelease } from './ai.js';
import { formatMessage, splitMessages } from './formatter.js';
import { sendMessage } from './telegram.js';
import type { AppState, CategorizedRelease } from './types.js';

const config = loadConfig();
const model = createAIClient(config);
let running = true;

async function processRepo(
  repo: string,
  state: AppState,
): Promise<void> {
  const result = await checkRepo(repo, config.githubToken, state);
  const now = new Date().toISOString();

  if (result.newReleases.length === 0) {
    if (result.etag && result.etag !== state[repo]?.etag) {
      state[repo] = {
        lastRelease: state[repo]?.lastRelease ?? '',
        etag: result.etag,
        lastCheck: now,
      };
    }
    return;
  }

  console.log(
    `[${repo}] Found ${result.newReleases.length} new release(s)`,
  );

  const categorized: CategorizedRelease[] = [];
  for (const release of result.newReleases) {
    categorized.push(await categorizeRelease(model, release));
  }

  const messages = splitMessages(repo, categorized);

  for (const msg of messages) {
    const ok = await sendMessage(
      config.telegramBotToken,
      config.telegramChatId,
      msg,
    );
    if (!ok) {
      console.error(`[${repo}] Failed to send Telegram message`);
      return;
    }
  }

  state[repo] = {
    lastRelease: result.newReleases[0].tag_name,
    etag: result.etag,
    lastCheck: now,
  };
  console.log(`[${repo}] Notified, latest: ${state[repo].lastRelease}`);
}

async function runCheck(): Promise<void> {
  const repos = loadSubscriptions();
  console.log(
    `[Check] ${new Date().toISOString()} — ${repos.length} repo(s)`,
  );

  const state = loadState();

  for (const repo of repos) {
    if (!running) break;
    try {
      await processRepo(repo, state);
    } catch (e) {
      console.error(`[${repo}] Unexpected error:`, e);
    }
  }

  saveState(state);
}

async function main(): Promise<void> {
  console.log(
    `Started. Interval: ${config.checkInterval}s`,
  );

  await runCheck();

  const timer = setInterval(async () => {
    if (!running) return;
    await runCheck();
  }, config.checkInterval * 1000);

  const shutdown = () => {
    console.log('\nShutting down...');
    running = false;
    clearInterval(timer);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main();
