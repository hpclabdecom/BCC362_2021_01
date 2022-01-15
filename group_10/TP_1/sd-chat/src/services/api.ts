import axios from 'axios';

const api = axios.create({
  baseURL: `http://${process.env.NEXT_PUBLIC_BACKEND_URL}`,
});

export default api;