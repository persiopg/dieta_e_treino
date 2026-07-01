import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, API_TIMEOUT } from './config';

const api = axios.create({
  baseURL: API_URL,
  timeout: API_TIMEOUT,
});

// Interceptor para injetar o token JWT em cada requisição de forma transparente
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('fitlife_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
