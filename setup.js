const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');
const url = 'https://github.com/XTLS/Xray-core/releases/download/v26.11.9/Xray-linux-64.zip';
const zip = path.join(__dirname, 'xray.zip');
const bin = path.join(__dirname, 'web-worker');
function get(u, file) {
  return new Promise((resolve, reject) => {
    const f = fs.createWriteStream(file);
    https.get(u, { headers: { 'User-Agent': 'setup' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        f.close(); try { fs.unlinkSync(file); } catch (e) {}
        return get(res.headers.location, file).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      res.pipe(f); f.on('finish', () => f.close(resolve));
    }).on('error', reject);
  });
}
// Extract a zip archive using only Node.js built-ins (no `unzip` binary needed).
function extractZip(zipPath, dest) {
  const buf = fs.readFileSync(zipPath);
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('invalid zip: EOCD not found');
  const total = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(off) !== 0x02014b50) throw new Error('invalid zip: bad central directory');
    const method = buf.readUInt16LE(off + 10);
    const compSize = buf.readUInt32LE(off + 20);
    const fileNameLen = buf.readUInt16LE(off + 28);
    const extraLen = buf.readUInt16LE(off + 30);
    const commentLen = buf.readUInt16LE(off + 32);
    const localOff = buf.readUInt32LE(off + 42);
    const name = buf.toString('utf8', off + 46, off + 46 + fileNameLen);
    off += 46 + fileNameLen + extraLen + commentLen;
    if (buf.readUInt32LE(localOff) !== 0x04034b50) throw new Error('invalid zip: bad local header');
    const lfNameLen = buf.readUInt16LE(localOff + 26);
    const lfExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lfNameLen + lfExtraLen;
    const data = buf.subarray(dataStart, dataStart + compSize);
    let content;
    if (method === 0) content = Buffer.from(data);
    else if (method === 8) content = zlib.inflateRawSync(data);
    else throw new Error('unsupported zip method ' + method);
    const target = path.join(dest, name);
    if (name.endsWith('/')) { fs.mkdirSync(target, { recursive: true }); continue; }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}
(async () => {
  if (!fs.existsSync(bin) || !fs.existsSync(path.join(__dirname, 'geoip.dat'))) {
    await get(url, zip);
    try {
      execSync('unzip -o -q xray.zip && mv -f xray web-worker && chmod +x web-worker && rm -f xray.zip LICENSE README.md', { cwd: __dirname, stdio: 'inherit' });
    } catch (e) {
      console.log('unzip not available, extracting with node');
      extractZip(zip, __dirname);
      fs.renameSync(path.join(__dirname, 'xray'), bin);
      fs.chmodSync(bin, 0o755);
      fs.unlinkSync(zip);
      for (const f of ['LICENSE', 'README.md']) { try { fs.unlinkSync(path.join(__dirname, f)); } catch (_) {} }
    }
  }
  for (const f of ['geoip.dat', 'geosite.dat']) {
    if (!fs.existsSync(path.join(__dirname, f))) throw new Error('missing ' + f);
  }
  console.log('setup ok');
})().catch((e) => { console.error(e); process.exit(1); });
