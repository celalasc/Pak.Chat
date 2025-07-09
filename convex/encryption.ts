// Web-compatible encryption using SubtleCrypto API
// This works in Convex environment without Node.js crypto module

const ALGORITHM = 'AES-GCM';
const KEY_LENGTH = 256; // bits
const IV_LENGTH = 12; // bytes for GCM

// Generate a deterministic key from a secret string
async function deriveKey(secret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('pak-chat-salt'), // Static salt for deterministic key
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

// Simple secret - you can change this to any string
const SECRET = process.env.ENCRYPTION_SECRET || 'pak-chat-default-secret-key-2024';

let cachedKey: CryptoKey | null = null;

async function getKey(): Promise<CryptoKey> {
  if (!cachedKey) {
    cachedKey = await deriveKey(SECRET);
  }
  return cachedKey;
}

/**
 * Encrypt plaintext using AES-GCM with Web Crypto API
 */
export async function encrypt(plainText: string): Promise<string> {
  try {
    const key = await getKey();
    const encoder = new TextEncoder();
    const data = encoder.encode(plainText);
    
    // Generate random IV
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: ALGORITHM, iv },
      key,
      data
    );
    
    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    return plainText; // Return original if encryption fails
  }
}

/**
 * Check if a string is valid base64
 */
function isValidBase64(str: string): boolean {
  try {
    // Basic base64 pattern check
    const base64Pattern = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Pattern.test(str)) {
      return false;
    }
    
    // Try to decode - this will throw if invalid
    atob(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Decrypt ciphertext previously produced by encrypt
 */
export async function decrypt(base64Input: string): Promise<string> {
  try {
    // Check if input is valid base64 first
    if (!isValidBase64(base64Input)) {
      throw new Error('Invalid base64 input');
    }
    
    const key = await getKey();
    
    // Decode from base64
    const combined = new Uint8Array(
      atob(base64Input).split('').map(char => char.charCodeAt(0))
    );
    
    // Check minimum length (IV + some encrypted data)
    if (combined.length <= IV_LENGTH) {
      throw new Error('Input too short to be valid encrypted data');
    }
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, IV_LENGTH);
    const encrypted = combined.slice(IV_LENGTH);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: ALGORITHM, iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    throw error; // Re-throw to allow tryDecrypt to handle it
  }
}

/**
 * Attempt to decrypt the provided string. If decryption fails,
 * the original string is returned unchanged.
 * This handles cases where data might not be encrypted or is corrupted.
 */
export async function tryDecrypt(value: string): Promise<string> {
  // Return empty string for null/undefined/empty values
  if (!value || value.length === 0) {
    return '';
  }
  
  // If the string looks like it might be plain text (contains invalid base64 chars)
  // or is too short to be encrypted data, return as-is
  if (!isValidBase64(value) || value.length < 20) {
    console.warn(`Treating as plain text (invalid base64 or too short): ${value.substring(0, 10)}...`);
    return value;
  }
  
  try {
    const decrypted = await decrypt(value);
    return decrypted;
  } catch (error) {
    console.warn(`Failed to decrypt, returning as plain text: ${error}`);
    return value;
  }
} 