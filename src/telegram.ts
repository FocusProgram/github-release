const TG_API = 'https://api.telegram.org';
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function sendMessage(
  botToken: string,
  chatId: string,
  html: string,
): Promise<boolean> {
  const url = `${TG_API}/bot${botToken}/sendMessage`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: html,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
        }),
      });

      if (res.ok) return true;

      const body = await res.text();
      console.error(
        `[TG] Attempt ${attempt}/${MAX_RETRIES} failed: ${res.status} ${body}`,
      );
    } catch (e) {
      console.error(`[TG] Attempt ${attempt}/${MAX_RETRIES} error:`, e);
    }

    if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY);
  }

  return false;
}
