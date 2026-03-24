import api from './api';

// SWR needs a "fetcher" function — it receives the URL key and must return the data.
// We reuse our existing axios instance so JWT auth headers are automatically attached.
const fetcher = (url: string) => api.get(url).then(res => res.data);

export default fetcher;
