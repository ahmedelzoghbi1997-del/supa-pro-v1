import { Preferences } from '@capacitor/preferences';

export interface SavedAccount {
  id: string;
  email?: string;
  username?: string;
  accessToken?: string;
  refreshToken?: string;
  fullName: string;
  role: string;
  isVirtual: boolean;
  greenhouseName?: string;
  avatarSeed?: string; // For dynamic aesthetic avatar generations
  biometricEnabled?: boolean; // Enable biometric unlock for this specific account
  pinEnabled?: boolean; // Enable PIN lock for this account
  pinCode?: string; // One-way PBKDF2 with Salt hashed code (pbkdf2$100000$salt$hash)
  parentId?: string;
}

/**
 * In-memory Token Store (Module-Scope)
 * Tokens are strictly kept in memory and optionally mirrored to temporary sessionStorage,
 * completely eliminating any writing of access/refresh tokens to persistent localStorage.
 */
interface InMemoryTokens {
  accessToken?: string;
  refreshToken?: string;
  sessionToken?: string;
  session?: any;
}

const inMemoryTokenStore = new Map<string, InMemoryTokens>();

export function setSessionTokenInMemory(accountId: string, tokens: InMemoryTokens) {
  if (!accountId) return;
  const current = inMemoryTokenStore.get(accountId) || {};
  const updated = { ...current, ...tokens };
  inMemoryTokenStore.set(accountId, updated);

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`session_tokens_${accountId}`, JSON.stringify(updated));
    }
  } catch {}
}

export function getSessionTokenFromMemory(accountId: string): InMemoryTokens | null {
  if (!accountId) return null;
  if (inMemoryTokenStore.has(accountId)) {
    return inMemoryTokenStore.get(accountId)!;
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      const val = sessionStorage.getItem(`session_tokens_${accountId}`);
      if (val) {
        const parsed = JSON.parse(val);
        inMemoryTokenStore.set(accountId, parsed);
        return parsed;
      }
    }
  } catch {}

  return null;
}

export function clearSessionTokenFromMemory(accountId: string) {
  if (!accountId) return;
  inMemoryTokenStore.delete(accountId);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(`session_tokens_${accountId}`);
      sessionStorage.removeItem(`supabase_session_${accountId}`);
    }
  } catch {}
}

export function setAccountSession(accountId: string, session: any) {
  if (!accountId || !session) return;
  setSessionTokenInMemory(accountId, {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    session
  });

  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(`supabase_session_${accountId}`, JSON.stringify(session));
    }
  } catch {}
}

export function getAccountSession(accountId: string): any | null {
  if (!accountId) return null;
  const mem = getSessionTokenFromMemory(accountId);
  if (mem?.session) return mem.session;
  if (mem?.accessToken && mem?.refreshToken) {
    return { access_token: mem.accessToken, refresh_token: mem.refreshToken };
  }

  try {
    if (typeof sessionStorage !== 'undefined') {
      const val = sessionStorage.getItem(`supabase_session_${accountId}`);
      if (val) {
        const parsed = JSON.parse(val);
        setSessionTokenInMemory(accountId, { session: parsed, accessToken: parsed.access_token, refreshToken: parsed.refresh_token });
        return parsed;
      }
    }
  } catch {}

  return null;
}

export function removeAccountSession(accountId: string) {
  clearSessionTokenFromMemory(accountId);
}

/**
 * Constant-time comparison of two strings to prevent timing attacks.
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Hash PIN using PBKDF2 with Salt (100,000 iterations, SHA-256).
 * Output format: pbkdf2$100000$<saltHex>$<hashHex>
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$100000$${saltHex}$${hashHex}`;
}

/**
 * Verify entered PIN against stored PBKDF2 hash.
 * Strictly supports only the format: pbkdf2$<iterations>$<saltHex>$<hashHex>
 * Plain-text and legacy SHA-256 comparisons are strictly rejected.
 */
export async function verifyPin(enteredPin: string, storedHash?: string): Promise<boolean> {
  if (!storedHash || !enteredPin) return false;

  try {
    const parts = storedHash.split('$');
    // Must strictly follow pbkdf2$<iterations>$<saltHex>$<hashHex>
    if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
      return false;
    }

    const iterations = parseInt(parts[1], 10);
    const saltHex = parts[2];
    const expectedHashHex = parts[3];

    if (isNaN(iterations) || iterations <= 0 || !saltHex || !expectedHashHex) {
      return false;
    }

    // Convert salt hex to Uint8Array
    if (saltHex.length % 2 !== 0) return false;
    const salt = new Uint8Array(saltHex.length / 2);
    for (let i = 0; i < saltHex.length; i += 2) {
      const byteVal = parseInt(saltHex.substring(i, i + 2), 16);
      if (isNaN(byteVal)) return false;
      salt[i / 2] = byteVal;
    }

    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(enteredPin),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      256
    );

    const computedHashHex = Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return constantTimeCompare(computedHashHex, expectedHashHex);
  } catch (err) {
    console.error("Error verifying PIN:", err);
    return false;
  }
}

/**
 * Check if a stored PIN is in legacy SHA-256 or invalid format.
 */
export function isLegacyPinHash(storedHash?: string): boolean {
  if (!storedHash) return false;
  return !storedHash.startsWith('pbkdf2$');
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const { value } = await Preferences.get({ key: 'saved_accounts_list' });
    if (value) {
      const parsed: (SavedAccount & { password?: string })[] = JSON.parse(value);
      // Strictly remove any password or persistent token from storage to guarantee tokens are in-memory
      const cleaned: SavedAccount[] = parsed.map(acc => {
        const { password: _p, accessToken: _at, refreshToken: _rt, ...safeAcc } = acc;
        // Re-attach in-memory tokens if present
        const memTokens = getSessionTokenFromMemory(acc.id);
        return {
          ...safeAcc,
          accessToken: memTokens?.accessToken,
          refreshToken: memTokens?.refreshToken
        };
      });

      return cleaned;
    }
  } catch (error) {
    console.error("Error reading saved accounts:", error);
  }
  return [];
}

export async function setSavedAccountsList(accounts: SavedAccount[]) {
  try {
    // Strictly ensure passwords and tokens are never written to persistent storage
    const sanitizedList = accounts.map(acc => {
      const { password: _p, accessToken: _at, refreshToken: _rt, ...safeAcc } = acc as any;
      return safeAcc;
    });
    await Preferences.set({ key: 'saved_accounts_list', value: JSON.stringify(sanitizedList) });
  } catch (error) {
    console.error("Error saving accounts list:", error);
  }
}    

export async function saveAccount(account: SavedAccount) {
  try {
    const list = await getSavedAccounts();
    const existingIndex = list.findIndex(acc => acc.id === account.id);
    
    if (!account.avatarSeed) {
      account.avatarSeed = Math.random().toString(36).substring(7);
    }

    // Save tokens to in-memory store
    if (account.accessToken || account.refreshToken) {
      setSessionTokenInMemory(account.id, {
        accessToken: account.accessToken,
        refreshToken: account.refreshToken
      });
    }
    
    // Explicitly delete password, accessToken, refreshToken from account object for persistent storage
    const { password: _p, accessToken: _at, refreshToken: _rt, ...cleanAccount } = account as any;
    const sanitizedAccount: SavedAccount = {
      ...cleanAccount
    };

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const merged: SavedAccount = { 
        ...existing, 
        ...sanitizedAccount, 
        avatarSeed: sanitizedAccount.avatarSeed || existing.avatarSeed
      };
      list[existingIndex] = merged;
    } else {
      list.push(sanitizedAccount);
    }
    
    await setSavedAccountsList(list);
  } catch (error) {
    console.error("Error saving account:", error);
  }
}

export async function setLastActiveAccount(accountId: string) {
  try {
    await Preferences.set({ key: 'last_active_account_id', value: accountId });
  } catch (error) {
    console.error("Error setting last active account:", error);
  }
}

export async function clearLastActiveAccount() {
  try {
    await Preferences.remove({ key: 'last_active_account_id' });
  } catch (error) {
    console.error("Error clearing last active account:", error);
  }
}

export async function removeSavedAccount(accountId: string) {
  try {
    clearSessionTokenFromMemory(accountId);
    const list = await getSavedAccounts();
    const filtered = list.filter(acc => acc.id !== accountId);
    await setSavedAccountsList(filtered);
  } catch (error) {
    console.error("Error removing saved account:", error);
  }
}

export async function updateSavedAccountName(accountId: string, greenhouseName: string) {
  try {
    const list = await getSavedAccounts();
    const updated = list.map(acc => {
      if (acc.id === accountId) {
        return { ...acc, greenhouseName };
      }
      return acc;
    });
    await setSavedAccountsList(updated);
  } catch (error) {
    console.error("Error updating saved account name:", error);
  }
}

export async function toggleSavedAccountBiometrics(accountId: string, enabled: boolean) {
  try {
    const list = await getSavedAccounts();
    const updated = list.map(acc => {
      if (acc.id === accountId) {
        return { ...acc, biometricEnabled: enabled };
      }
      return acc;
    });
    await setSavedAccountsList(updated);
  } catch (error) {
    console.error("Error toggling saved account biometrics:", error);
  }
}

export async function setSavedAccountPin(accountId: string, pinCode: string | null) {
  try {
    const list = await getSavedAccounts();
    const hashedPin = pinCode ? await hashPin(pinCode) : undefined;
    const updated = list.map(acc => {
      if (acc.id === accountId) {
        return { 
          ...acc, 
          pinEnabled: pinCode !== null, 
          pinCode: hashedPin 
        };
      }
      return acc;
    });
    await setSavedAccountsList(updated);
  } catch (error) {
    console.error("Error setting PIN for saved account:", error);
  }
}
