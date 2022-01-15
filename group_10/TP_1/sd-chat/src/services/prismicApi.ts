import axios from 'axios';

const api = axios.create({
  baseURL: `https://sd-chat.prismic.io/api/v2`,
});

export default api;