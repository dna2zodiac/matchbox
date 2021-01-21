# matchbox
Source code search engine in JS

### Start Server

```
node server.js
```

### Environment Variables

- `MATCHBOX_BATOKEN`: to require basic auth token for calling APIs
- `MATCHBOX_TRIGRAM_BASEDIR`: to specify storage path for index metadata

### APIs

- `/api/v1/search/index`: `?s=` for shard name, `?url=` (required) for doc URL, request body (required) for doc contents
- `/api/v1/search/search`: `?s=` for shard name, `?q=` (required) for query, `?n=` for top N (by default `50`), `?case=` for case in/sensitive (by default `true`)
