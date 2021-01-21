const i_fs = require('fs');

class Bitmap {
   /*
      support scale:
      N = 8388608 // = 2^20 * 8, where 2^20 = 1MB
      which means that, one search will use mem,
      where the size number is 2 times of N/8
    */
   constructor(N) {
      this.bitmap = Buffer.alloc(Math.ceil(N/8));
   }

   isEmpty() {
      for (let i = 0, n = this.bitmap.length; i < n; i++) {
         if (this.bitmap[i] > 0) return false;
      }
      return true;
   }

   set(id) {
      id--;
      const a = ~~(id/8);
      const b = id % 8;
      this.bitmap[a] |= 1 << b;
   }

   clr(id) {
      id--;
      const a = ~~(id/8);
      const b = id % 8;
      const mask = mask & (0xff - 1 << b);
      this.bitmap[a] &= mask;
   }

   get(id) {
      id--;
      const a = ~~(id/8);
      const b = id % 8;
      return (this.bitmap[a] & (1 << b)) > 0;
   }

   and(another) {
      for (let i = 0, n = this.bitmap.length; i < n; i++) {
         this.bitmap[i] &= another.bitmap[i] || 0;
      }
   }

   or(another) {
      for (let i = 0, n = this.bitmap.length; i < n; i++) {
         this.bitmap[i] |= another.bitmap[i] || 0;
      }
   }

   sub(another) {
      /*
            1010101010101
            1111110000000
        sub -------------
            0000001010101
       */
      for (let i = 0, n = this.bitmap.length; i < n; i++) {
         this.bitmap[i] &= 0xff & (~(another.bitmap[i] || 0))
      }
   }

   clone() {
      const one = new Bitmap(0);
      one.bitmap = Buffer.from(this.bitmap);
      return one;
   }

   save(filename) {
      i_fs.writeFileSync(filename, this.bitmap);
   }

   load(filename) {
      this.bitmap = i_fs.readfileSync(filename);
   }

   async asyncForEach(fn) {
      for (let i = 0, n = this.bitmap.length; i < n; i++) {
         let bit = this.bitmap[i];
         for (let j = 0; j < 8; j++) {
            if (bit & 0x1) {
               // if fn return true, skip remains
               if (await fn(i*8+j+1)) break;
            }
            bit >>= 1;
         }
      }
   }
}

module.exports = {
   Bitmap
};
