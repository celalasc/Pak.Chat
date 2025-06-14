import CryptoJS from 'crypto-js';

/**
 * Encrypt arbitrary data with a passphrase.
 */
export function encryptData<T>(data: T, passphrase: string): string {
  const json = JSON.stringify(data);
  return CryptoJS.AES.encrypt(json, passphrase).toString();
}

/**
 * Decrypt data using the same passphrase used for encryption.
 */
export function decryptData<T>(cipher: string, passphrase: string): T {
  const bytes = CryptoJS.AES.decrypt(cipher, passphrase);
  const json = bytes.toString(CryptoJS.enc.Utf8);
  return JSON.parse(json) as T;
}
