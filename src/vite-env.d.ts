/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Ya no se usa VITE_DEEPSEEK_API_KEY en el frontend.
  // La API key se configura como DEEPSEEK_API_KEY en el servidor.
}

declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
