import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Encryption configuration
 * Using AES-256-GCM for authenticated encryption
 */
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits
const TAG_LENGTH = 16; // 128 bits
const ITERATIONS = 100000; // PBKDF2 iterations

/**
 * Generate a random encryption key
 * This should be stored securely (e.g., in user settings)
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_LENGTH).toString('hex');
}

/**
 * Derive encryption key from password using PBKDF2
 * @param password - User password
 * @param salt - Random salt (will be generated if not provided)
 * @returns Object with key and salt
 */
export function deriveKeyFromPassword(
  password: string,
  salt?: Buffer
): { key: Buffer; salt: Buffer } {
  const actualSalt = salt || crypto.randomBytes(SALT_LENGTH);
  const key = crypto.pbkdf2Sync(
    password,
    actualSalt,
    ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
  return { key, salt: actualSalt };
}

/**
 * Encrypt data using AES-256-GCM
 * @param data - Data to encrypt (Buffer or string)
 * @param key - Encryption key (hex string or Buffer)
 * @returns Encrypted data as Buffer with format: [salt][iv][tag][encryptedData]
 */
export function encryptData(data: Buffer | string, key: string | Buffer): Buffer {
  const dataBuffer = typeof data === 'string' ? Buffer.from(data, 'utf8') : data;
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;

  // Generate random IV for each encryption
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher
  const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

  // Encrypt data
  const encrypted = Buffer.concat([
    cipher.update(dataBuffer),
    cipher.final()
  ]);

  // Get authentication tag
  const tag = cipher.getAuthTag();

  // Combine: salt (if using password), iv, tag, encrypted data
  // Format: [iv (16 bytes)][tag (16 bytes)][encryptedData (variable)]
  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypt data using AES-256-GCM
 * @param encryptedData - Encrypted data buffer with format: [iv][tag][encryptedData]
 * @param key - Encryption key (hex string or Buffer)
 * @returns Decrypted data as Buffer
 */
export function decryptData(encryptedData: Buffer, key: string | Buffer): Buffer {
  const keyBuffer = typeof key === 'string' ? Buffer.from(key, 'hex') : key;

  // Extract components
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const tag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedData.subarray(IV_LENGTH + TAG_LENGTH);

  // Create decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(tag);

  // Decrypt data
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]);

  return decrypted;
}

/**
 * Encrypt a file
 * @param inputPath - Path to file to encrypt
 * @param outputPath - Path to save encrypted file
 * @param key - Encryption key (hex string)
 * @returns Promise that resolves when encryption is complete
 */
export async function encryptFile(
  inputPath: string,
  outputPath: string,
  key: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Read file
      const data = fs.readFileSync(inputPath);
      
      // Encrypt data
      const encrypted = encryptData(data, key);
      
      // Write encrypted file
      fs.writeFileSync(outputPath, encrypted);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Decrypt a file
 * @param inputPath - Path to encrypted file
 * @param outputPath - Path to save decrypted file
 * @param key - Encryption key (hex string)
 * @returns Promise that resolves when decryption is complete
 */
export async function decryptFile(
  inputPath: string,
  outputPath: string,
  key: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Read encrypted file
      const encrypted = fs.readFileSync(inputPath);
      
      // Decrypt data
      const decrypted = decryptData(encrypted, key);
      
      // Write decrypted file
      fs.writeFileSync(outputPath, decrypted);
      
      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Check if a file is encrypted (has our encryption format)
 * @param filePath - Path to file
 * @returns true if file appears to be encrypted
 */
export function isEncryptedFile(filePath: string): boolean {
  try {
    const stats = fs.statSync(filePath);
    // Encrypted files should be at least IV + TAG length
    if (stats.size < IV_LENGTH + TAG_LENGTH) {
      return false;
    }
    
    // Try to read first bytes to check format
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(IV_LENGTH + TAG_LENGTH);
    fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    
    // If file has proper size and structure, assume encrypted
    // In production, you might want to add a magic number header
    return true;
  } catch {
    return false;
  }
}

/**
 * Get or create encryption key from settings
 * If no key exists, generates a new one
 * @param settingsPath - Path to settings file/directory
 * @returns Encryption key (hex string)
 */
export function getOrCreateEncryptionKey(settingsPath: string): string {
  const keyFilePath = path.join(settingsPath, '.encryption_key');
  
  try {
    // Try to read existing key
    if (fs.existsSync(keyFilePath)) {
      const key = fs.readFileSync(keyFilePath, 'utf8').trim();
      // Validate key format (should be hex string of correct length)
      if (key.length === KEY_LENGTH * 2 && /^[0-9a-f]+$/i.test(key)) {
        return key;
      }
    }
  } catch (error) {
    console.warn('Failed to read encryption key, generating new one:', error);
  }
  
  // Generate new key
  const newKey = generateEncryptionKey();
  
  try {
    // Ensure directory exists
    const keyDir = path.dirname(keyFilePath);
    if (!fs.existsSync(keyDir)) {
      fs.mkdirSync(keyDir, { recursive: true });
    }
    
    // Save key with restricted permissions (owner read/write only)
    fs.writeFileSync(keyFilePath, newKey, { mode: 0o600 });
    console.log('Generated new encryption key');
  } catch (error) {
    console.error('Failed to save encryption key:', error);
    throw new Error('Не вдалося зберегти ключ шифрування');
  }
  
  return newKey;
}

