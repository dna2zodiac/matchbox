/*
   tri-gram:
      x y z ---> |charCode(x) // 1000| -> b
      /b/x/y/z ---> binary:[ int32(id) ] (2^20/4 = 262144 | 1MB list covered )

      id    ---> id % 512 -> b, id // 10^8 -> c, (id % 10^9) // 10^4 -> d
      /b/c/d/(id//100) ? group{100}
      - 0.json ---> json:{id: hash}

      hash  ---> sha256(text) + md5(text)
      /hash|{4}/... ---> id, urls
 */

const i_path = require('path');
const i_fs = require('fs');
const i_crypto = require('crypto');

const i_u = require('./util');
const i_b = require('./bitmap');

// 4 bytes max num, about N = 4.2 * 10^9
// const MAX_ID = 0xffffffff;
// N = 8 * 10^8, for bitmap,
// each search requires 100MB * 2
const MAX_ID = 0x2faf0800;

function transformLine(line) {
   if (!line) return line;
   return line.split(/\s+/).join(' ').trim();
}

class TrigramSearchEngine {
   constructor(baseDir) {
      this.nextId = 1;
      this.baseDir = baseDir

      const configPath = i_path.join(this.baseDir, 'config.json');
      if (i_fs.existsSync(configPath)) {
         const obj = JSON.parse(i_fs.readFileSync(configPath));
         this.nextId = obj.nextId;
      }
   }

   getTrigramPath(trigram) {
      if (!trigram || trigram.length !== 3) return null;
      /*
      // below code does not work on MacOSX and Windows for
      // the file name is case-insensitive
      const b = ~~(Math.abs(trigram.charCodeAt(0))/1000);
      const x = trigram.charCodeAt(0);
      const y = trigram.charCodeAt(1);
      const z = trigram.charCodeAt(2);
      */
      const b = ~~(Math.abs(trigram.charCodeAt(0))/1000);
      const x = trigram.charCodeAt(0);
      const y = trigram.charCodeAt(1);
      const z = trigram.charCodeAt(2);
      return i_path.join('/', `${b}`, `${x}`, `${y}`, `${z}`);
   }

   getIdPath(id) {
      if (!id) return null;
      const b = id % 512;
      const c = ~~(id/100000000);
      const d = ~~((id%100000000)/10000);
      const group = ~~((id%10000)/100);
      return i_path.join('/', `${b}`, `${c}`, `${d}`, `${group}.json`);
   }

   getHashDir(hash) {
      if (!hash || !hash.length) return null;
      const p = [];
      for (let i = 0, n = hash.length; i < n; i += 4) {
         p.push(hash.substring(i, i + 4));
      }
      p.push(hash);
      return i_path.join('/', ...p);
   }

   getNextId() {
      const id = this.nextId;
      const configPath = i_path.join(this.baseDir, 'config.json');
      let obj;
      if (i_fs.existsSync(configPath)) {
         obj = JSON.parse(i_fs.readFileSync(configPath));
      } else {
         obj = { nextId: 1 };
      }
      this.nextId ++;
      obj.nextId = this.nextId;
      i_fs.writeFileSync(configPath, JSON.stringify(obj));
      return id;
   }

   async getIdHash(id) {
      const path = i_path.join(this.baseDir, '_idhash', this.getIdPath(id));
      return new Promise((r, e) => {
         i_fs.readFile(path, (err, blob) => {
            if (err) return e(err);
            try {
               const obj = JSON.parse(blob);
               r(obj[id] || null);
            } catch(err) { return e(err); }
         });
      });
   }

   async writeIdHash(id, hash) {
      const path = i_path.join(this.baseDir, '_idhash', this.getIdPath(id));
      const dir = i_path.dirname(path);
      let obj = null;
      if (i_fs.existsSync(path)) {
         const blob = i_fs.readFileSync(path);
         obj = JSON.parse(blob);
      } else {
         i_fs.mkdirSync(dir, { recursive: true });
         obj = {};
      }
      obj[id] = hash;
      i_fs.writeFileSync(path, JSON.stringify(obj));
   }

   async hasHash(hash) {
      const path = i_path.join(this.baseDir, '_hash', this.getHashDir(hash), 'id');
      return i_fs.existsSync(path);
   }

   async writeHash(hash, id, url) {
      const path = i_path.join(this.baseDir, '_hash', this.getHashDir(hash));
      if (i_fs.existsSync(path)) {
         throw 'exist';
      }
      i_fs.mkdirSync(path, { recursive: true });
      const path_id = i_path.join(path, 'id');
      const path_url = i_path.join(path, 'url');
      i_fs.writeFileSync(path_id, `${id}`);
      const obj = [];
      if (url) obj.push(url);
      i_fs.writeFileSync(path_url, JSON.stringify(obj));
      return id;
   }

   async getHashId(hash) {
      const path = i_path.join(this.baseDir, '_hash', this.getHashDir(hash), 'id');
      if (!i_fs.existsSync(path)) {
         return null;
      }
      const blob = i_fs.readFileSync(path).toString();
      return parseInt(blob);
   }

   async getHashAttr(hash, key) {
      const path = i_path.join(this.baseDir, '_hash', this.getHashDir(hash), key);
      if (!i_fs.existsSync(path)) {
         return null;
      }
      const blob = i_fs.readFileSync(path);
      return blob;
   }

   async writeHashAttr(hash, key, value) {
      if (key === 'id' || key === 'url') return;
      const path = i_path.join(this.baseDir, '_hash', this.getHashDir(hash));
      if (!i_fs.existsSync(path)) {
         return false;
      }
      const path_key = i_path.join(path, key);
      if (i_fs.existsSync(path_key) && !value) {
         i_fs.unlinkSync(path_key);
         return true;
      }
      i_fs.writeFileSync(path_key, value);
      return true;
   }

   async getHashUrl(hash) {
      const path = i_path.join(this.baseDir, '_hash', this.getHashDir(hash), 'url');
      if (!i_fs.existsSync(path)) {
         return [];
      }
      const blob = i_fs.readFileSync(path);
      const obj = JSON.parse(blob);
      return obj || [];
   }

   async addHashUrl(hash, url) {
      const path = i_path.join(this.baseDir, '_hash', this.getHashDir(hash), 'url');
      if (!i_fs.existsSync(path)) {
         throw 'not-exist';
      }
      const blob = i_fs.readFileSync(path);
      const obj = JSON.parse(blob);
      if (obj && !obj.includes(url)) {
         obj.push(url);
         i_fs.writeFileSync(path, JSON.stringify(obj));
      }
      return obj;
   }

   async delHashUrl(hash, url) {
      const path = i_path.join(this.baseDir, '_hash', this.getHashDir(hash), 'url');
      if (!i_fs.existsSync(path)) {
         throw 'not-exist';
      }
      const blob = i_fs.readFileSync(path);
      const obj = JSON.parse(blob);
      if (obj) {
         const i = obj.indexOf(url);
         if (i >= 0) {
            obj.splice(i, 1);
            i_fs.writeFileSync(path, JSON.stringify(obj));
         }
      }
      return obj;
   }

   async hashText(text) {
      const sha256 = i_crypto.createHash('sha256');
      const md5 = i_crypto.createHash('md5');
      const buf = Buffer.from(text);
      sha256.update(buf);
      md5.update(buf);
      const hash = sha256.digest('hex') + md5.digest('hex');
      return hash;
   }

   /*
       abcdefg => abc, bcd, cde, def, efg (1)
       - search(abc, efg) => (1) (1)
       abcdef  => abc, bcd, cde, def => (1)
       efgwof  => efg, fgw, gwo, wof => (2)
       - search(abc, efg) => (1) (2)
    */
   async writeTrigramLineMap(hash, text) {
      // n/4B ('tri\0' m/4B (L/4B ... [m]) ... [n])
      const map = {};
      if (!text || text.length < 3) return map;
      const lines = text.split('\n');
      lines.forEach((line, lineno) => {
         line = transformLine(line);
         if (!line || line.length < 3) return;
         for (let i = 0, n = line.length - 3; i <= n; i++) {
            const trigram = text.substring(i, i+3);
            if (!map[trigram]) map[trigram] = [];
            if (map[trigram].indexOf(lineno) < 0) map[trigram].push(lineno);
         }
      });

      let buf = Buffer.alloc(0);
      const tris = Object.keys(map);
      // max trigram: 2^32 = 4.2B
      buf = Buffer.concat([buf, i_u.Buf.int32ToBuffer(tris.length)]);
      tris.forEach((tri) => {
         const list = map[tri];
         const n = list.length;
         const bufList = Buffer.alloc(n * 4 + 4);
         bufList.writeUInt32LE(n);
         for (let i = 1; i <= n; i++) {
            bufList.writeUInt32LE(list[i-1], i * 4);
         }
         buf = Buffer.concat([buf, Buffer.from(tri + '\0'), bufList]);
      });
      await this.writeHashAttr(hash, '_linemap', buf);
      return map;
   }

   async readTrigramLineMap(hash) {
      const buf = await this.getHashAttr(hash, '_linemap');
      const map = {};
      if (!buf) return map;
      const N = i_u.Buf.bufToInt32(buf, 0);
      let base = 4;
      for (let i = 0; i < N; i++) {
         const cstri = readCString(buf, base);
         const trigram = buf.slice(base, cstri);
         map[trigram] = [];
         base = cstri + 1;
         const M = i_u.Buf.bufToInt32(buf, base);
         base += 4;
         for (let j = 0; j < M; j++) {
            const x = i_u.Buf.bufToInt32(buf, base);
            map[trigram].push(x);
            base += 4;
         }
      }
      return map;

      function readCString(buf, offset) {
         let end = offset;
         const n = buf.length;
         while (end < n && buf[end] !== 0) {
            end ++;
         }
         return end;
      }
   }

   async trigramAddId(trigram, id) {
      const path = i_path.join(this.baseDir, '_trigram', this.getTrigramPath(trigram));
      const dir = i_path.dirname(path);
      if (i_fs.existsSync(path)) {
         i_fs.appendFileSync(path, i_u.Buf.int32ToBuffer(id));
      } else {
         i_fs.mkdirSync(dir, { recursive: true });
         i_fs.writeFileSync(path, i_u.Buf.int32ToBuffer(id));
      }
   }

   async trigramCount(trigram) {
      const path = i_path.join(this.baseDir, '_trigram', this.getTrigramPath(trigram));
      return new Promise((r, e) => {
         i_fs.lstat(path, (err, stat) => {
            if (err) return r(0);
            r(~~(stat.size/4));
         });
      });
   }

   async trigramIdList(trigram) {
      const path = i_path.join(this.baseDir, '_trigram', this.getTrigramPath(trigram));
      const bitmap = new i_b.Bitmap(this.nextId - 1);
      return new Promise((r, e) => {
         i_fs.readFile(path, (err, blob) => {
            if (err) return r(bitmap);
            for (let i = 0, n = blob.length; i < n; i += 4) {
               const id = i_u.Buf.bufToInt32(blob, i);
               bitmap.set(id);
            }
            r(bitmap);
         });
      });
   }

   async trigramDelId(trigram, id) {
      const n = await this.trigramCount(trigram);
      if (!n) return;
      const bitmap = await this.trigramIdList(trigram);
      bitmap.clr(id);
      const path = i_path.join(this.baseDir, '_trigram', this.getTrigramPath(trigram));
      i_fs.writeFileSync(path, '');
      await bitmap.asyncForEach(async function (id) {
         i_fs.appendFileSync(path, i_u.Buf.int32ToBuffer(id));
         return false;
      });
   }

   async addDocIndexForText(text) {
      return await this.addDocIndex('', text);
   }

   async addDocIndex(url, text) {
      if (text.length < 3) return null;
      const hash = await this.hashText(text);
      // TODO: race condition still exists
      // util we use a map to record processing hash
      if (await this.hasHash(hash)) {
         if (url) await this.addHashUrl(hash, url);
         return await this.getHashId(hash);
      }

      const visited = {};
      const lines = text.split('\n');
      lines.forEach((line) => {
         line = transformLine(line);
         if (line.length < 3) return;
         for (let j = 0, m = line.length - 3; j <= m; j++) {
            visited[text.substring(j, j+3)] = 1;
         }
      });
      const keys = Object.keys(visited);
      if (!keys.length) return null;

      const id = this.getNextId();
      if (id >= MAX_ID) throw 'reach max id';
      await this.writeHash(hash, id, url);
      await this.writeIdHash(id, hash);
      for (let i = 0, n = keys.length; i < n; i++) {
         await this.trigramAddId(keys[i], id);
      }
      return id;
   }

   async searchGetCaseInsensitiveBitmap(trigrams) {
      const bitmap = await getCaseInsensitiveBitmap.call(this, trigrams[0].x);
      for (let i = 0, n = trigrams.length; i < n; i++) {
         const another = await getCaseInsensitiveBitmap.call(this, trigrams[i].x);
         bitmap.and(another);
         if (bitmap.isEmpty()) break;
      }
      return bitmap;

      async function getCaseInsensitiveBitmap(trigram) {
         const p = [
            [trigram.charAt(0).toLowerCase(), trigram.charAt(0).toUpperCase()],
            [trigram.charAt(1).toLowerCase(), trigram.charAt(1).toUpperCase()],
            [trigram.charAt(2).toLowerCase(), trigram.charAt(2).toUpperCase()],
         ];
         if (p[0][0] === p[0][1]) p[0].pop();
         if (p[1][0] === p[1][1]) p[0].pop();
         if (p[2][0] === p[2][1]) p[0].pop();
         const bitmap = new i_b.Bitmap(this.nextId - 1);
         for (let i0 = 0, n0 = p[0].length; i0 < n0; i0++)
            for (let i1 = 0, n1 = p[1].length; i1 < n1; i1++)
               for (let i2 = 0, n2 = p[2].length; i2 < n2; i2++)
                  bitmap.or(await this.trigramIdList(`${p[0][i0]}${p[1][i1]}${p[2][i2]}`));
         return bitmap;
      }
   }

   async searchGetCaseSensitiveBitmap(trigrams) {
      const bitmap = await this.trigramIdList(trigrams[0].x);
      for (let i = 1, n = trigrams.length; i < n; i++) {
         const another = await this.trigramIdList(trigrams[i].x);
         bitmap.and(another);
         if (bitmap.isEmpty()) break;
      }
      return bitmap;
   }

   async searchForBitmap(query, caseOn) {
      const q = query.split(/\s+/).join(' ').trim();
      // TODO: too long query; want to fixed 1024?
      if (q.length > 1024) q = q.substring(0, 1024);
      if (q.length < 3) {
         // TODO: ls /b/x/y/... and then pick n
         return [];
      }
      const v = {};
      for (let i = 0, n = q.length-3; i <= n; i++) {
         v[q.substring(i, i+3)] = 1;
      }
      const ts = Object.keys(v).map((x) => ({x:x, c:0}));
      if (!ts.length) return [];
      for (let i = 0, n = ts.length; i < n; i++) {
         ts[i].c = await this.trigramCount(ts[i].x);
      }
      ts.sort((a, b) => a.c - b.c);
      const min = ts[0].c;
      // if (this.nextId <= 8388608 + 1 /* 2^20 * 8 = 1MB */) {
      // } else {
      //    // TODO: large scale search; doc > 100M
      // }

      const bitmap = (
         caseOn?
         (await this.searchGetCaseSensitiveBitmap(ts)):
         (await this.searchGetCaseInsensitiveBitmap(ts))
      );
      return bitmap;
   }

   async search(query, options) {
      if (!options) options = {};
      if (options.n === undefined) options.n = 100;
      if (options.case === undefined) options.case = true;

      const bitmap = await this.searchForBitmap(query, options.case);

      const r = [];
      await bitmap.asyncForEach(async (id) => {
         const hash = await this.getIdHash(id);
         const urls = await this.getHashUrl(hash);
         while (r.length < options.n && urls.length > 0) r.push(urls.shift());
         return r.length >= options.n;
      });
      return r;
   }

   // TODO:
   // need a file walker to get each file in _trigram (remove id), _hash (remove url)
   async trigramGarbageCollect(trigram) {}
   async delUrl(url) {}
   async delDocIndex(id) {} // record a hole and store in a list

}


if (require.main === module) {
   // node trigram_engine.js </path/to/datadir>
   async function main() {
      const se = new TrigramSearchEngine(i_path.resolve(process.argv[2]));
      console.log('doc id =', await se.addDocIndex('test://hello/world', 'this is a wonderful world?'));
      console.log('doc id =', await se.addDocIndex('test://hello/world/2', 'this is a wonderful world?'));
      console.log('doc id =', await se.addDocIndex('test://hello/world/3', 'what a bug'));
      console.log('sensitive search', await se.search('World', { n: 10, case: true }), ' -> nothing');
      console.log('insensitive search', await se.search('World', { n: 10, case: false }), ' -> count=2');

      const text = 'this is a wonderful world?';
      const hash = await se.hashText(text);
      console.log('write:', JSON.stringify(await se.writeTrigramLineMap(hash, text)));
      console.log('read:', JSON.stringify(await se.readTrigramLineMap(hash)));
   }
   main();
}

module.exports = {
   TrigramSearchEngine,
};
