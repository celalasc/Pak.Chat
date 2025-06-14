'use client';
import { useAuthStore } from '@/frontend/stores/AuthStore';

export default function AuthListener() {
  // Этот хук просто вызывает useAuthStore и тем самым
  // инициализирует его логику, включая onAuthStateChanged.
  // Он ничего не рендерит.
  useAuthStore(); 
  return null;
} 