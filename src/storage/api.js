const i_path = require('path');
const i_url = require('url');

const i_auth = require('../auth');
const i_util = require('../util');
const i_trigram_engine = require('./trigram_engine');

const env = {
   trigramBaseDir: i_path.resolve(process.env.MATCHBOX_TRIGRAM_BASEDIR)
};

const singleton = {
   trigramEngine: new i_trigram_engine.TrigramSearchEngine(env.trigramBaseDir)
};

const api = {
   search: async (req, res, opt) => {
      if (!i_auth.validateBasicAuth(req, res)) return;
      const urlObj = i_url.parse(req.url, true);
      const query = urlObj.query.q;
      if (!query) return i_util.Web.e400(res);
      const topN = parseInt(urlObj.query.n || '50');
      const caseOn = (
         // by default, switch on case sensitive
         !urlObj.case ||
         (urlObj.case === 'true') ||
         (urlObj.case === '1')
      );
      try {
         const urls = await singleton.trigramEngine.search(
            query, { n: topN, case: caseOn }
         );
         i_util.Web.rjson(res, { urls });
      } catch (err) {
         console.error('api/search', err);
         return i_util.Web.e500(res);
      }
   },
   index: async (req, res, opt) => {
      if (!i_auth.validateBasicAuth(req, res)) return;
      if (req.method !== 'POST') return i_util.Web.e405(res);
      const urlObj = i_url.parse(req.url, true);
      const url = urlObj.query.url;
      if (!url) return i_util.Web.e400(res);
      try {
         const docSrc = (await i_util.Web.readRequestBinary(req)).toString();
         // do not process empty file and trigram requires length gte 3
         if (!docSrc || docSrc.length < 3) return i_util.Web.e400(res);
         // do not process binary file
         if (docSrc.indexOf('\0') >= 0) return i_util.Web.e400(res);
         const docId = await singleton.trigramEngine.addDocIndex(url, docSrc);
         i_util.Web.rjson(res, { docId });
      } catch (err) {
         console.error('api/index', err);
         return i_util.Web.e500(res);
      }
   },
};

module.exports = {
   api,
   env,
   singleton,
};
