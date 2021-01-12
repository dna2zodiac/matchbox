const env = {
   basicAuthToken: process.env.MATCHBOX_BATOKEN,
};

const api = {
   validateBasicAuth: (req, res) => {
      if (!env.basicAuthToken) return true;
      const auth = req.headers.authorization || '';
      const parts = auth.split(' ');
      if (parts[0] !== 'Basic' || parts[1] !== env.basicAuthToken) {
         res.writeHead(401, 'Not Authenticated');
         res.end();
         return false;
      }
      return true;
   },
};

module.exports = api;
