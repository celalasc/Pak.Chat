'use client'
import { createContext } from 'react';

/**
 * Indicates whether Firebase auth state has been initialized.
 * Components can use this to delay data fetching until auth is ready.
 */
export const AuthContext = createContext(false);
