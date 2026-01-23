// Encryption utilities for sensitive OLT/ACS credentials
// Uses AES-256-GCM encryption with environment key

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const SALT_LENGTH = 32;

/**
 * Get encryption key from environment
 * Falls back to a derived key if not set (not recommended for production)
 */
function getEncryptionKey(): Buffer {
    const envKey = process.env.CREDENTIAL_ENCRYPTION_KEY;

    if (envKey) {
        // If key is provided, hash it to ensure correct length
        return crypto.createHash('sha256').update(envKey).digest();
    }

    // Fallback: derive from a combination of environment variables
    // This is NOT recommended for production
    console.warn('[WARN] CREDENTIAL_ENCRYPTION_KEY not set, using derived key');
    const combined = `${process.env.SUPABASE_SERVICE_ROLE_KEY || 'default'}-olt-acs-encryption`;
    return crypto.createHash('sha256').update(combined).digest();
}

/**
 * Encrypt a string value
 * Returns base64 encoded string containing salt, iv, tag, and ciphertext
 */
export function encryptCredential(plaintext: string): string {
    if (!plaintext) return '';

    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    // Combine: salt + iv + tag + ciphertext
    const combined = Buffer.concat([
        salt,
        iv,
        tag,
        Buffer.from(encrypted, 'hex')
    ]);

    return combined.toString('base64');
}

/**
 * Decrypt a previously encrypted string
 */
export function decryptCredential(encryptedBase64: string): string {
    if (!encryptedBase64) return '';

    try {
        const combined = Buffer.from(encryptedBase64, 'base64');

        // Extract components
        const salt = combined.subarray(0, SALT_LENGTH);
        const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
        const tag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
        const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);

        const key = getEncryptionKey();

        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
        decipher.setAuthTag(tag);

        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error('Failed to decrypt credential:', error);
        return '';
    }
}

/**
 * Check if a value is encrypted (basic check)
 */
export function isEncrypted(value: string): boolean {
    if (!value) return false;

    try {
        const decoded = Buffer.from(value, 'base64');
        // Minimum length: salt + iv + tag + at least 1 byte
        return decoded.length >= SALT_LENGTH + IV_LENGTH + TAG_LENGTH + 1;
    } catch {
        return false;
    }
}

/**
 * Safely mask a credential for display
 */
export function maskCredential(value: string, showLast: number = 4): string {
    if (!value) return '****';
    if (value.length <= showLast) return '****';
    return '****' + value.slice(-showLast);
}
