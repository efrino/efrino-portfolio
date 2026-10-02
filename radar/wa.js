// WhatsApp report sender (Baileys, unofficial). Sends ONLY to REPORT_WA_TO; never replies or initiates elsewhere.
import makeWASocket, { DisconnectReason, useMultiFileAuthState, Browsers, fetchLatestBaileysVersion } from 'baileys';
import QRCode from 'qrcode';
import pino from 'pino';
import fs from 'node:fs';

const DIR = `${process.env.DATA_DIR || '/data'}/wa-auth`;
const TO = (process.env.REPORT_WA_TO || '').replace(/\D/g, '').replace(/^0/, '62');
const FROM = (process.env.REPORT_WA_FROM || '').replace(/\D/g, '').replace(/^0/, '62');
const state = { status: 'disconnected', qr: null, code: null, phone: null, retries: 0 };
let sock = null, wantCode = false;

export const waStatus = () => ({ ...state, to: TO, from: FROM, configured: !!TO });

export async function waStart({ pairing = false } = {}) {
  if (sock && ['connecting', 'qr', 'connected'].includes(state.status) && !pairing) return waStatus();
  wantCode = pairing;
  const { state: auth, saveCreds } = await useMultiFileAuthState(DIR);
  const { version } = await fetchLatestBaileysVersion().catch(() => ({}));
  state.status = 'connecting'; state.qr = null; state.code = null;
  sock?.end?.();
  sock = makeWASocket({ auth, version, logger: pino({ level: 'silent' }), browser: Browsers.ubuntu('Radar'), markOnlineOnConnect: false, syncFullHistory: false, printQRInTerminal: false, shouldIgnoreJid: () => true });
  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async u => {
    try {
      if (u.qr) {
        state.status = 'qr';
        if (wantCode && FROM && !auth.creds.registered) { wantCode = false; state.code = await sock.requestPairingCode(FROM); }
        state.qr = await QRCode.toDataURL(u.qr, { margin: 1, width: 280 });
      }
      if (u.connection === 'open') { Object.assign(state, { status: 'connected', qr: null, code: null, retries: 0, phone: sock.user?.id?.split(':')[0].split('@')[0] }); console.log('[wa] connected as', state.phone); }
      if (u.connection === 'close') {
        const code = u.lastDisconnect?.error?.output?.statusCode;
        sock = null;
        if (code === DisconnectReason.loggedOut) { fs.rmSync(DIR, { recursive: true, force: true }); Object.assign(state, { status: 'disconnected', qr: null, code: null, phone: null }); return; }
        if (state.status === 'qr' && ++state.retries > 3) { state.status = 'disconnected'; return; } // QR expired unscanned
        state.status = 'reconnecting';
        setTimeout(() => waStart().catch(e => console.error('[wa]', e.message)), Math.min(60000, 3000 * 2 ** Math.min(state.retries++, 4)));
      }
    } catch (e) { console.error('[wa] update', e.message); }
  });
  return waStatus();
}

export async function waSend(text) {
  if (!TO) throw new Error('REPORT_WA_TO belum diatur.');
  if (!sock || state.status !== 'connected') throw new Error('WhatsApp pengirim belum terhubung.');
  await sock.sendMessage(`${TO}@s.whatsapp.net`, { text });
  return true;
}

export async function waLogout() { try { await sock?.logout(); } catch {} sock = null; fs.rmSync(DIR, { recursive: true, force: true }); Object.assign(state, { status: 'disconnected', qr: null, code: null, phone: null }); }

// Reconnect on boot when this server was linked before.
export function waBoot() { if (fs.existsSync(`${DIR}/creds.json`)) waStart().catch(e => console.error('[wa] boot', e.message)); }
