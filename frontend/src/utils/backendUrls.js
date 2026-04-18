const normalizeBaseUrl = (url, suffix = '') => {
  if (!url) {
    return '';
  }

  return `${url.replace(/\/$/, '')}${suffix}`;
};

const unique = (values) => [...new Set(values.filter(Boolean))];

export const getApiBaseUrls = () => {
  const configured = import.meta.env.VITE_API_URL;
  const configuredSocket = import.meta.env.VITE_SOCKET_URL;

  return unique([
    normalizeBaseUrl(configured),
    normalizeBaseUrl(configuredSocket, '/api'),
    'http://localhost:5002/api',
    'http://localhost:5001/api',
    'http://localhost:5000/api'
  ]);
};

export const getSocketUrls = () => {
  const configured = import.meta.env.VITE_SOCKET_URL;
  const configuredApi = import.meta.env.VITE_API_URL;

  return unique([
    normalizeBaseUrl(configured),
    normalizeBaseUrl(configuredApi).replace(/\/api$/, ''),
    'http://localhost:5002',
    'http://localhost:5001',
    'http://localhost:5000'
  ]);
};
