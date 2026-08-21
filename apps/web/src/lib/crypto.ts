/**
 * End-to-End Encryption (E2EE) Utility
 * Utilizes the Web Crypto API (globalThis.crypto.subtle) to ensure
 * zero-knowledge encryption in the browser before data hits the network.
 */

export class E2EECrypto {
  // 1. Password-Based Key Derivation (PBKDF2)
  static async deriveKeyFromPassword(password: string, saltBase64: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const salt = this.base64ToArrayBuffer(saltBase64);
    
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );
    
    return globalThis.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Generate a new random Salt for PBKDF2
  static generateSalt(): string {
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
    return this.arrayBufferToBase64(salt.buffer);
  }

  // 2. Generate RSA-OAEP Key Pair for the User
  static async generateKeyPair(): Promise<CryptoKeyPair> {
    return globalThis.crypto.subtle.generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // Export/Import Keys to/from Base64 (for storing in DB)
  static async exportPublicKey(key: CryptoKey): Promise<string> {
    const exported = await globalThis.crypto.subtle.exportKey('spki', key);
    return this.arrayBufferToBase64(exported);
  }

  static async exportPrivateKey(key: CryptoKey): Promise<string> {
    const exported = await globalThis.crypto.subtle.exportKey('pkcs8', key);
    return this.arrayBufferToBase64(exported);
  }

  static async importPublicKey(base64: string): Promise<CryptoKey> {
    const binary = this.base64ToArrayBuffer(base64);
    return globalThis.crypto.subtle.importKey(
      'spki',
      binary,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    );
  }

  static async importPrivateKey(base64: string): Promise<CryptoKey> {
    const binary = this.base64ToArrayBuffer(base64);
    return globalThis.crypto.subtle.importKey(
      'pkcs8',
      binary,
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['decrypt']
    );
  }

  // 3. Encrypt/Decrypt Private Key using derived Password Key
  static async encryptPrivateKey(privateKeyBase64: string, kek: CryptoKey): Promise<string> {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      kek,
      enc.encode(privateKeyBase64)
    );
    
    const ivBase64 = this.arrayBufferToBase64(iv.buffer);
    const ciphertextBase64 = this.arrayBufferToBase64(ciphertext);
    return `${ivBase64}:${ciphertextBase64}`;
  }

  static async decryptPrivateKey(encryptedString: string, derivedKey: CryptoKey): Promise<string> {
    const [ivBase64, ciphertextBase64] = encryptedString.split(':');
    if (!ivBase64 || !ciphertextBase64) throw new Error('Invalid encrypted private key format');

    const ciphertext = this.base64ToArrayBuffer(ciphertextBase64);
    const iv = this.base64ToArrayBuffer(ivBase64);
    
    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      ciphertext
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  }

  // 4. Data Encryption (Symmetric AES-256-GCM for Records)
  static async generateDEK(): Promise<CryptoKey> {
    return globalThis.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  static async encryptData(plaintext: string, dek: CryptoKey): Promise<string> {
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder();
    
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      dek,
      enc.encode(plaintext)
    );
    
    const ivBase64 = this.arrayBufferToBase64(iv.buffer);
    const ciphertextBase64 = this.arrayBufferToBase64(ciphertext);
    return `${ivBase64}:${ciphertextBase64}`;
  }

  static async decryptData(encryptedString: string, dek: CryptoKey): Promise<string> {
    if (!encryptedString.includes(':')) {
      return encryptedString; // Return plaintext if not encrypted
    }
    
    const [ivBase64, ciphertextBase64] = encryptedString.split(':');
    const ciphertext = this.base64ToArrayBuffer(ciphertextBase64);
    const iv = this.base64ToArrayBuffer(ivBase64);
    
    const decrypted = await globalThis.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      dek,
      ciphertext
    );
    
    const dec = new TextDecoder();
    return dec.decode(decrypted);
  }

  // 5. Envelope Encryption (Encrypting DEK with RSA Public Key)
  static async encryptDEK(dek: CryptoKey, publicKey: CryptoKey): Promise<string> {
    const rawDek = await globalThis.crypto.subtle.exportKey('raw', dek);
    const encrypted = await globalThis.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      publicKey,
      rawDek
    );
    return this.arrayBufferToBase64(encrypted);
  }

  static async decryptDEK(encryptedDekBase64: string, privateKey: CryptoKey): Promise<CryptoKey> {
    const encryptedDek = this.base64ToArrayBuffer(encryptedDekBase64);
    const rawDek = await globalThis.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      encryptedDek
    );
    return globalThis.crypto.subtle.importKey(
      'raw',
      rawDek,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );
  }

  // 6. HMAC for Exact Match Searching
  static async generateHMAC(plaintext: string, searchKeyString: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await globalThis.crypto.subtle.importKey(
      'raw',
      enc.encode(searchKeyString),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await globalThis.crypto.subtle.sign(
      'HMAC',
      key,
      enc.encode(plaintext.toLowerCase().trim())
    );
    
    return this.arrayBufferToBase64(signature);
  }

  // Utility: ArrayBuffer <-> Base64
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
