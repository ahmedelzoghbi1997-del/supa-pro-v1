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
  pinCode?: string; // One-way SHA-256 hashed code
  parentId?: string;
}

/**
 * Hash PIN using one-way SHA-256 via Web Crypto API (crypto.subtle.digest).
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify entered PIN against stored SHA-256 hash (with backwards compatibility).
 */
export async function verifyPin(enteredPin: string, storedHash?: string): Promise<boolean> {
  if (!storedHash || !enteredPin) return false;
  try {
    const enteredHash = await hashPin(enteredPin);
    return enteredHash === storedHash || enteredPin === storedHash;
  } catch (err) {
    console.error("Error verifying PIN:", err);
    return false;
  }
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const { value } = await Preferences.get({ key: 'saved_accounts_list' });
    if (value) {
      const parsed: (SavedAccount & { password?: string })[] = JSON.parse(value);
      // Strictly remove any password from memory to guarantee passwords are never retained
      const cleaned: SavedAccount[] = parsed.map(acc => {
        const { password: _p, ...safeAcc } = acc;
        return safeAcc;
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
    // Strictly ensure passwords are never stored on device
    const sanitizedList = accounts.map(acc => {
      const { password: _p, ...safeAcc } = acc as any;
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
    
    // Explicitly delete password from account object
    const { password: _p, ...cleanAccount } = account as any;
    const sanitizedAccount: SavedAccount = {
      ...cleanAccount
    };

    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const merged: SavedAccount = { 
        ...existing, 
        ...sanitizedAccount, 
        avatarSeed: sanitizedAccount.avatarSeed || existing.avatarSeed,
        accessToken: sanitizedAccount.accessToken || existing.accessToken,
        refreshToken: sanitizedAccount.refreshToken || existing.refreshToken
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
