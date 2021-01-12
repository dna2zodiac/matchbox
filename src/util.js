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

module.exports = {
   Web,
};
