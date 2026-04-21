import axios from 'axios';
import { getApiBaseUrls } from './backendUrls';

const apiClient = axios.create();
const REQUEST_TIMEOUT_MS = 10000;
let preferredBaseURL = null;

const shouldRetry = (error) => {
  if (!error.response) {
    return true;
  }

  return [404, 502, 503, 504].includes(error.response.status);
};

async function requestWithFallback(config) {
  const discoveredBaseUrls = getApiBaseUrls();
  const baseUrls = preferredBaseURL
    ? [preferredBaseURL, ...discoveredBaseUrls.filter((url) => url !== preferredBaseURL)]
    : discoveredBaseUrls;
  let lastError = null;
  const token = localStorage.getItem('token');

  for (const baseURL of baseUrls) {
    try {
      const headers = config.headers ? { ...config.headers } : {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.request({
        ...config,
        baseURL,
        headers,
        timeout: config.timeout || REQUEST_TIMEOUT_MS
      });

      preferredBaseURL = baseURL;
      return response;
    } catch (error) {
      lastError = error;
      if (!shouldRetry(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.request = requestWithFallback;

apiClient.get = (url, config = {}) => requestWithFallback({ ...config, method: 'get', url });
apiClient.delete = (url, config = {}) => requestWithFallback({ ...config, method: 'delete', url });
apiClient.post = (url, data, config = {}) => requestWithFallback({ ...config, method: 'post', url, data });
apiClient.put = (url, data, config = {}) => requestWithFallback({ ...config, method: 'put', url, data });
apiClient.patch = (url, data, config = {}) => requestWithFallback({ ...config, method: 'patch', url, data });

export default apiClient;
