import { useState, useEffect } from 'react';

export function useLocalStorage(key, initialValue) {
  // Inicialização do estado a partir do localStorage
  const [value, setValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Erro ao ler chave "${key}" do localStorage:`, error);
      return initialValue;
    }
  });

  // Salvar no localStorage sempre que o valor ou a chave mudar
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Erro ao salvar chave "${key}" no localStorage:`, error);
    }
  }, [key, value]);

  return [value, setValue];
}
