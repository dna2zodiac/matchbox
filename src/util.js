const Web = {
   e400: (res, text) => {
      res.writeHead(400, text || 'Bad Request');
      res.end();
   },
   e401: (res, text) => {
      res.writeHead(401, text || 'Not Authenticated');
      res.end();
   },
   e403: (res, text) => {
      res.writeHead(403, text || 'Forbidden');
      res.end();
   },
   e404: (res, text) => {
      res.writeHead(404, text || 'Not Found');
      res.end();
   },
   e405: (res, text) => {
      res.writeHead(404, text || 'Method Not Allowed');
      res.end();
   },
   e500: (res, text) => {
      res.writeHead(500, text || 'Internal Error');
      res.end();
   },
   rjson: (res, json) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(json?JSON.stringify(json):'{}');
   },
   readRequestBinary: async (req) => {
      return new Promise((resolve, reject) => {
         let body = [];
         req.on('data', (chunk) => { body.push(chunk); });
         req.on('end', () => {
            body = Buffer.concat(body);
            resolve(body);
         });
         req.on('error', reject);
      });
   },
   readRequestJson: async (req) => {
      return new Promise((resolve, reject) => {
         Web.readRequestBinary(req).then((buf) => {
            try {
               body = JSON.parse(buf.toString());
               resolve(body);
            } catch(e) {
               reject(e);
            }
         }, reject);
      });
   },
};

const Buf = {
   int32ToBuffer: (num) => {
     // big endian
     const buf = Buffer.alloc(4);
     buf[0] = num & 0xff;
     buf[1] = (num & 0xff00) >> 8;
     buf[2] = (num & 0xff0000) >> 16;
     buf[3] = (num & 0xff000000) >> 24;
     return buf;
   },
   bufToInt32: (buf, index) => {
     // big endian
     let num = 0;
     num |= buf[index]; index ++;
     num |= buf[index] << 8; index ++;
     num |= buf[index] << 16;  index ++;
     num |= buf[index] << 24;
     return num;
   },
};

module.exports = {
   Web,
   Buf,
};
