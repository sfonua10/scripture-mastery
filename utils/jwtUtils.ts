/**
 * JWT decoding utilities for extracting user profile data from OAuth tokens.
 * NOTE: These functions only decode JWT payloads - they do NOT verify signatures.
 * Signature verification is handled by Firebase Auth.
 */

/**
 * Decoded payload from a Google ID token JWT
 */
export interface GoogleIdTokenPayload {
  // Standard JWT claims
  iss: string;
  sub: string;
  aud: string;
  exp: number;
  iat: number;

  // Google profile claims
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

/**
 * Extracted profile data from an OAuth provider
 */
export interface ExtractedProfileData {
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

/**
 * Base64 decode that works in React Native (atob is not available)
 */
function base64Decode(base64: string): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let buffer = 0;
  let bits = 0;

  for (let i = 0; i < base64.length; i++) {
    const char = base64[i];
    if (char === '=') break;

    const index = chars.indexOf(char);
    if (index === -1) continue;

    buffer = (buffer << 6) | index;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  // Handle UTF-8 decoding for non-ASCII characters
  try {
    return decodeURIComponent(escape(output));
  } catch {
    // If UTF-8 decoding fails, return raw output
    return output;
  }
}

/**
 * Decodes a JWT token and extracts the payload.
 * NOTE: This only decodes the payload - it does NOT verify the signature.
 *
 * @param token - The JWT token string
 * @returns The decoded payload, or null if decoding fails
 */
export function decodeJwtPayload<T = Record<string, unknown>>(
  token: string
): T | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.warn('Invalid JWT format: expected 3 parts');
      return null;
    }

    const payload = parts[1];

    // Base64URL decode (JWT uses URL-safe base64)
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');

    // Add padding if needed
    const paddedBase64 = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      '='
    );

    // Decode base64 to string (using React Native compatible decoder)
    const jsonString = base64Decode(paddedBase64);

    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to decode JWT payload:', error);
    return null;
  }
}

/**
 * Extracts user profile data from a Google ID token.
 *
 * @param idToken - The Google ID token
 * @returns Object with displayName, email, and photoURL (all nullable)
 */
export function extractGoogleProfileFromIdToken(
  idToken: string
): ExtractedProfileData {
  const payload = decodeJwtPayload<GoogleIdTokenPayload>(idToken);

  if (!payload) {
    return { displayName: null, email: null, photoURL: null };
  }

  return {
    displayName: payload.name || null,
    email: payload.email || null,
    photoURL: payload.picture || null,
  };
}
