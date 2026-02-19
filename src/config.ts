import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AppConfig } from './types.js';

const ROOT = resolve(import.meta.dirname, '..');

function requiredEnv(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env: ${key}`);
  return val;
}

export function loadConfig(): AppConfig {
  return {
    githubToken: requiredEnv('GITHUB_TOKEN'),
    telegramBotToken: requiredEnv('TELEGRAM_BOT_TOKEN'),
    telegramChatId: requiredEnv('TELEGRAM_CHAT_ID'),
    aiBaseUrl: requiredEnv('AI_BASE_URL'),
    aiApiKey: requiredEnv('AI_API_KEY'),
    aiModel: requiredEnv('AI_MODEL'),
    checkInterval: Number(process.env.CHECK_INTERVAL) || 900,
  };
}

export function loadSubscriptions(): string[] {
  const filePath = resolve(ROOT, 'subscribe.json');
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw) as { repos: string[] };
  return data.repos;
}
