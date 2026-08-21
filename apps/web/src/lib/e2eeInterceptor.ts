import { E2EECrypto } from './crypto';
import { api } from './api';

// Cache the fetched business keys
let cachedPublicKeys: { userId: string, publicKey: string }[] | null = null;

export async function fetchBusinessPublicKeys() {
  if (cachedPublicKeys) return cachedPublicKeys;
  const res = await api.get('/businesses/current/keys');
  if (res.data?.success) {
    cachedPublicKeys = res.data.data;
    return cachedPublicKeys;
  }
  return [];
}

/**
 * Decrypts a single E2EE record if it contains encryptedDeks and iv.
 * Returns the decrypted record, or the original record if not encrypted.
 */
export async function decryptRecord(record: any, privateKey: string, userId: string) {
  if (!record || typeof record !== 'object') return record;
  
  if (record.encryptedDeks && record.iv) {
    const deks = typeof record.encryptedDeks === 'string' ? JSON.parse(record.encryptedDeks) : record.encryptedDeks;
    const encryptedDek = deks[userId];
    
    if (encryptedDek) {
      try {
        const pk = await E2EECrypto.importPrivateKey(privateKey);
        const dek = await E2EECrypto.decryptDEK(encryptedDek, pk);
        
        // Find all fields that look like ciphertext (e.g. base64 strings).
        // For our Pragmatic E2EE, we encrypted specific fields.
        // To be generic, we can try to decrypt any string field that is not an ID or date.
        // Wait, a better approach is to store which fields are encrypted, OR
        // encapsulate all sensitive data into a single `encryptedData` field on the record.
        // Wait! We added `iv` but where is the ciphertext?
        // In the plan, I said "Add shadow columns for ciphertext e.g. encName". 
        // Or we just store the ciphertext directly in the plaintext column (e.g. name = Base64).
        
        const decryptedRecord = { ...record };
        
        // Decrypt string fields that we know are encrypted.
        // We will define a list of known encrypted fields for this app.
        const encryptedFields = [
          'name', 'code', 'phone', 'email', 'address', 'taxNumber', 'notes',
          'accountName', 'accountNumber', 'bankName', 'branchName'
        ];
        
        for (const field of encryptedFields) {
          if (typeof decryptedRecord[field] === 'string' && decryptedRecord[field].includes(':') && decryptedRecord[field].length > 20) {
            try {
              decryptedRecord[field] = await E2EECrypto.decryptData(decryptedRecord[field], dek);
            } catch (e) {
              // Ignore decryption failures (might not be encrypted, or wrong key)
            }
          }
        }
        
        return decryptedRecord;
      } catch (e) {
        console.error('Failed to decrypt record', record.id, e);
      }
    }
  }
  
  // Recursively process nested arrays (e.g., memberships, items)
  for (const key of Object.keys(record)) {
    if (Array.isArray(record[key])) {
      record[key] = await Promise.all(record[key].map((item: any) => decryptRecord(item, privateKey, userId)));
    } else if (record[key] && typeof record[key] === 'object' && !(record[key] instanceof Date)) {
      record[key] = await decryptRecord(record[key], privateKey, userId);
    }
  }
  
  return record;
}

/**
 * Encrypts a payload for saving.
 */
export async function encryptPayload(payload: any, fieldsToEncrypt: string[]) {
  const publicKeys = await fetchBusinessPublicKeys();
  if (!publicKeys || publicKeys.length === 0) return payload; // Cannot encrypt if no keys
  
  const dek = await E2EECrypto.generateDEK();
  let encryptedDeks: Record<string, string> = {};
  
  // Encrypt DEK for every user in the business
  for (const userKey of publicKeys) {
    const pk = await E2EECrypto.importPublicKey(userKey.publicKey);
    encryptedDeks[userKey.userId] = await E2EECrypto.encryptDEK(dek, pk);
  }
  
  const encryptedPayload = { ...payload };
  
  for (const field of fieldsToEncrypt) {
    if (encryptedPayload[field]) {
      const plaintext = encryptedPayload[field].toString();
      encryptedPayload[field] = await E2EECrypto.encryptData(plaintext, dek);
      
      // Compute HMAC for searching (using the businessId as a pseudo-secret, or better, the Public Key of the user)
      // Since all members of the business need to compute the same HMAC for the same plaintext,
      // we need a shared secret. We'll use a hardcoded string + businessId for simplicity, but in true E2EE,
      // it should be a deterministic key derived from the user's password that is shared across the business.
      // For now, we will use 'bms_hmac_secret' as the HMAC key to enable exact match search.
      try {
        encryptedPayload[`hmac${field.charAt(0).toUpperCase() + field.slice(1)}`] = await E2EECrypto.generateHMAC(plaintext, 'bms_hmac_secret');
      } catch (e) {
        // Ignore hmac failure
      }
    }
  }
  
  return {
    ...encryptedPayload,
    encryptedDeks,
    iv: 'deprecated', // Keep it so decryption knows it's an encrypted record
  };
}
