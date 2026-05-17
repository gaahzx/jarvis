// JARVIS — WhatsApp Web controller (puppeteer)
// Persistent session via userDataDir so QR scan happens once.
// Selectors are best-effort; WhatsApp changes them occasionally — update here if breaks.

import path from 'path';
import os from 'os';
import puppeteer from 'puppeteer';

const PROFILE_DIR = path.join(os.homedir(), 'Documents', 'Jarvis', 'system', '.wa-session');
let browser = null;
let page = null;
let connecting = false;

async function connect({ headless = false } = {}) {
  if (browser && page && !page.isClosed()) return { connected: true };
  if (connecting) return { connected: false, status: 'connecting' };
  connecting = true;
  try {
    browser = await puppeteer.launch({
      headless,
      userDataDir: PROFILE_DIR,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1280,900'],
      defaultViewport: null,
    });
    const pages = await browser.pages();
    page = pages[0] || (await browser.newPage());
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
    );
    await page.goto('https://web.whatsapp.com/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    return { connected: true, profileDir: PROFILE_DIR };
  } catch (err) {
    return { connected: false, error: err.message };
  } finally {
    connecting = false;
  }
}

async function status() {
  if (!browser || !page || page.isClosed()) return { connected: false, ready: false };
  try {
    // Ready when the chats list is visible (post-QR-scan)
    const ready = await page.evaluate(() => {
      return !!document.querySelector('[role="grid"], [data-testid="chat-list"], [aria-label*="Chat list"], [aria-label*="Lista de conversas"]');
    });
    return { connected: true, ready };
  } catch (e) {
    return { connected: false, error: e.message };
  }
}

async function getChats(limit = 20) {
  if (!page || page.isClosed()) throw new Error('not_connected');
  return await page.evaluate((max) => {
    const grid = document.querySelector('[role="grid"], [data-testid="chat-list"]');
    if (!grid) return [];
    const rows = Array.from(grid.querySelectorAll('[role="row"], [role="listitem"]')).slice(0, max);
    return rows.map((row, idx) => {
      const titleEl = row.querySelector('span[title], [dir="auto"][aria-label]') || row.querySelector('span');
      const previewEls = row.querySelectorAll('span[dir="ltr"], span[dir="auto"]');
      const preview = previewEls.length > 1 ? previewEls[previewEls.length - 1]?.innerText : '';
      const unreadEl = row.querySelector('[aria-label*="unread"], [aria-label*="não lidas"]');
      return {
        index: idx,
        name: (titleEl?.getAttribute('title') || titleEl?.innerText || '').trim().slice(0, 100),
        preview: (preview || '').trim().slice(0, 200),
        unread: !!unreadEl,
      };
    }).filter(c => c.name);
  }, limit);
}

async function openChat(name) {
  if (!page || page.isClosed()) throw new Error('not_connected');
  // Use search box
  const searchSel = '[contenteditable="true"][data-tab="3"], div[role="textbox"][title*="Search"], div[role="textbox"][title*="Pesquisar"]';
  await page.waitForSelector(searchSel, { timeout: 5000 }).catch(() => {});
  const search = await page.$(searchSel);
  if (!search) throw new Error('search_not_found');
  await search.click({ clickCount: 3 });
  await page.keyboard.press('Backspace');
  await search.type(name, { delay: 30 });
  await new Promise(r => setTimeout(r, 800));
  // Click first result
  const clicked = await page.evaluate(() => {
    const results = document.querySelectorAll('[role="row"], [role="listitem"]');
    for (const r of results) {
      const t = r.querySelector('span[title]');
      if (t) { r.click(); return true; }
    }
    return false;
  });
  if (!clicked) throw new Error('chat_not_found');
  await new Promise(r => setTimeout(r, 700));
  return { opened: true, name };
}

async function getMessages(count = 20) {
  if (!page || page.isClosed()) throw new Error('not_connected');
  return await page.evaluate((max) => {
    const msgs = Array.from(document.querySelectorAll('div.message-in, div.message-out, [data-pre-plain-text]'));
    const out = msgs.slice(-max).map(m => {
      const pre = m.getAttribute('data-pre-plain-text') || '';
      const fromOut = m.classList.contains('message-out') || !!m.closest('.message-out');
      const textEl = m.querySelector('span.selectable-text, [data-testid*="text"], span[dir]');
      const text = textEl?.innerText || m.innerText || '';
      return {
        from: fromOut ? 'me' : (pre.match(/\] (.*?):\s/)?.[1] || 'them'),
        timestamp: pre.match(/\[(.*?)\]/)?.[1] || '',
        text: text.trim().slice(0, 2000),
      };
    });
    return out;
  }, count);
}

async function sendMessage(text) {
  if (!page || page.isClosed()) throw new Error('not_connected');
  const inputSel = 'footer [contenteditable="true"], [contenteditable="true"][data-tab="10"], [contenteditable="true"][role="textbox"]';
  await page.waitForSelector(inputSel, { timeout: 5000 });
  const input = await page.$(inputSel);
  if (!input) throw new Error('input_not_found');
  await input.click();
  // Type each line, Shift+Enter for newlines
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (i > 0) await page.keyboard.down('Shift'), await page.keyboard.press('Enter'), await page.keyboard.up('Shift');
    await page.keyboard.type(lines[i], { delay: 15 });
  }
  await new Promise(r => setTimeout(r, 200));
  await page.keyboard.press('Enter');
  return { sent: true, length: text.length };
}

async function disconnect() {
  try { if (browser) await browser.close(); } catch {}
  browser = null;
  page = null;
  return { disconnected: true };
}

export default { connect, status, getChats, openChat, getMessages, sendMessage, disconnect };
