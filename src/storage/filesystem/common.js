const i_fs = require('fs');
const i_path = require('path');

const api = {
   stat: async (path) => {
      return new Promise((r, e) => {
         i_fs.stat(path, (err, stat) => {
            if (err) return e(err);
            r(stat);
         });
      });
   }, // readlink+stat
   lstat: async (path) => {
      return new Promise((r, e) => {
         i_fs.lstat(path, (err, stat) => {
            if (err) return e(err);
            r(stat);
         });
      });
   }, // stat
   load: async (path) => {
      return new Promise((r, e) => {
         i_fs.readFile(path, (err, data) => {
            if (err) return e(err);
            r(data);
         });
      });
   }, // load
   save: async (path, data) => {
      return new Promise((r, e) => {
         i_fs.writeFile(path, data, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, // save
   ls: async (path) => {
      return new Promise((r, e) => {
         api.lstat(path).then((stat) => {
            if (stat.isDirectory()) {
               i_fs.readdir(path, (err, list) => {
                  if (err) return e(err);
                  r(list);
               });
            } else {
               e(new Error('not supported'));
            }
         }, e);
      });
   }, // ls
   lsR: async (path, ignore) => {
      path = i_path.resolve(path);
      return new Promise((r, e) => { (async function() {
         ignore = ignore || [];
         const aggregated = [];
         const todo = [path];
         while (todo.length) {
            const dir = todo.shift();
            try {
               const stat = await api.lstat(dir);
               if (!stat.isDirectory()) {
                  aggregated.push(dir.substring(path.length));
                  continue;
               }
               aggregated.push(dir.substring(path.length) + '/');
               const list = await api.ls(dir);
               if (list .length) list.sort((a, b) => a>b?1:-1);
               while(list.length) {
                  const item = list.pop();
                  if (ignore.includes(item)) continue;
                  const next = i_path.join(dir, item);
                  todo.unshift(next);
               }
            } catch (err) {
               return e(err);
            }
         }
         r(aggregated);
      })(); });
   }, // ls -R
   findF: async (path, ignore) => {
      path = i_path.resolve(path);
      return new Promise((r, e) => { (async function () {
         ignore = ignore || [];
         const aggregated = [];
         const todo = [path];
         while (todo.length) {
            const dir = todo.shift();
            try {
               const stat = await api.lstat(dir);
               if (!stat.isDirectory()) {
                  aggregated.push(dir.substring(path.length));
                  continue;
               }
               const list = await api.ls(dir);
               if (list .length) list.sort((a, b) => a>b?1:-1);
               while(list.length) {
                  const item = list.pop();
                  if (ignore.includes(item)) continue;
                  const next = i_path.join(dir, item);
                  todo.unshift(next);
               }
            } catch (err) {
               return e(err);
            }
         }
         r(aggregated);
      })(); });
   }, // find -type f
   mkdir: async (path) => {
      return new Promise((r, e) => {
         i_fs.mkdir(path, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, // mkdir
   mkdirP: async (path) => {
      return new Promise((r, e) => {
         i_fs.mkdir(path, { recursive: true }, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, // mkdir -p
   rmdir: async (path) => {
      return new Promise((r, e) => {
         i_fs.rmdir(path, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, // rmdir
   rm: async (path) => {
      return new Promise((r, e) => {
         i_fs.unlink(path, (err) => {
            if (err) return e(err);
            r();
         });
      });
   }, // rm
   rmR: async (path) => {
      return new Promise((r, e) => {
         i_fs.stat(path, (err, stat) => {
            if (err) return e(err);
            if (stat.isDirectory()) {
               i_fs.rmdir(path, { recursive: true }, (err) => {
                  if (err) return e(err);
                  r();
               });
            } else if (stat.isFile()) {
               api.rm(path).then(r, e);
            } else {
               e(new Error('not supported'));
            }
         });
      });
   }, // rm -r
};

module.exports = api;
