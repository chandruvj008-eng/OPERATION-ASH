// Local FoundIt API; bind to localhost to keep it off the public network.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const ROOT = __dirname;
const DATA = path.join(ROOT, 'items.json');
const HOST = '127.0.0.1';
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 8 * 1024 * 1024;

async function readItems() {
  try { return JSON.parse(await fs.readFile(DATA, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return []; throw e; }
}
async function writeItems(items) {
  const temp = `${DATA}.tmp`;
  await fs.writeFile(temp, JSON.stringify(items, null, 2), {mode: 0o600});
  await fs.rename(temp, DATA);
}
function publicItem({registeredPhone, recipientPhone, contact, ...safe}) { return safe; }
function similarity(a, b) {
  const stop = new Set(['the','and','with','from','near','item','found','lost','this','that','for','has','have','was','are']);
  const words = x => new Set(String(x || '').toLowerCase().match(/[a-z0-9]+/g)?.filter(w => w.length > 2 && !stop.has(w)) || []);
  const aw = words(`${a.name} ${a.description}`), bw = words(`${b.name} ${b.description}`);
  const union = new Set([...aw, ...bw]).size;
  let score = union ? [...aw].filter(w => bw.has(w)).length / union : 0;
  if (a.category && a.category === b.category) score += 0.2;
  if ([...words(a.name)].some(w => words(b.name).has(w))) score += 0.2;
  return Math.min(score, 1);
}
function send(res, status, data, type = 'application/json; charset=utf-8') {
  res.writeHead(status, {'Content-Type': type, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'});
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
async function bodyJson(req) {
  let raw = '';
  for await (const part of req) {
    raw += part;
    if (Buffer.byteLength(raw) > MAX_BODY) throw Object.assign(new Error('Request is too large.'), {status: 413});
  }
  try { return JSON.parse(raw || '{}'); }
  catch { throw Object.assign(new Error('Invalid JSON.'), {status: 400}); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    if (req.method === 'GET' && url.pathname === '/api/items') {
      return send(res, 200, (await readItems()).map(publicItem));
    }
    if (req.method === 'POST' && url.pathname === '/api/items') {
      const input = await bodyJson(req);
      const type = ['lost','found'].includes(input.type) ? input.type : '';
      const name = String(input.name || '').trim().slice(0, 70);
      const location = String(input.location || '').trim().slice(0, 100);
      if (!type || !name || !location) return send(res, 400, {error: 'Type, name, and location are required.'});
      const phone = value => String(value || '').replace(/\D/g, '').slice(0, 15);
      const registeredPhone = type === 'lost' ? phone(input.registeredPhone) : '';
      const recipientPhone = type === 'found' ? phone(input.recipientPhone) : '';
      if ((type === 'lost' && registeredPhone.length < 7) || (type === 'found' && recipientPhone.length < 7)) return send(res, 400, {error: 'A valid registered phone number is required.'});
      const photo = typeof input.photo === 'string' && /^data:image\/(png|jpeg|webp|gif);base64,/i.test(input.photo) && input.photo.length <= 7_000_000 ? input.photo : '';
      const item = {
        id: `FI-${Date.now().toString(36).toUpperCase()}`, type, name, location,
        date: String(input.date || '').slice(0, 40), category: String(input.category || 'other').slice(0, 40),
        handoffLocation: type === 'found' ? String(input.handoffLocation || '').trim().slice(0, 100) : '',
        description: String(input.description || '').trim().slice(0, 300), photo,
        emoji: String(input.emoji || '').slice(0, 12), bg: /^#[0-9a-f]{6}$/i.test(input.bg) ? input.bg : '#eef1ff',
        contact: String(input.contact || '').trim().slice(0, 100), registeredPhone, recipientPhone, returned: false, createdAt: new Date().toISOString()
      };
      const items = await readItems();
      const otherType = type === 'lost' ? 'found' : 'lost';
      const target = type === 'lost' ? registeredPhone : recipientPhone;
      const other = items.find(x => x.type === otherType && !x.returned &&
        (type === 'lost' ? x.recipientPhone : x.registeredPhone) === target && similarity(item, x) >= 0.25);
      if (other) { item.returned = true; other.returned = true; }
      items.unshift(item);
      await writeItems(items);
      return send(res, 201, {item: publicItem(item), handoffVerified: Boolean(other), matchedItem: other ? publicItem(other) : null});
    }
    if (req.method === 'GET' && ['/', '/index.html', '/script.js', '/step-actions.js', '/styles.css'].includes(url.pathname)) {
      const file = url.pathname === '/' ? 'index.html' : path.basename(url.pathname);
      const type = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'}[path.extname(file)];
      return send(res, 200, await fs.readFile(path.join(ROOT, file), 'utf8'), type);
    }
    return send(res, 404, {error: 'Not found.'});
  } catch (e) {
    console.error(e);
    return send(res, e.status || 500, {error: e.status ? e.message : 'Server error.'});
  }
});
server.listen(PORT, HOST, () => console.log(`FoundIt running at http://${HOST}:${PORT}`));
