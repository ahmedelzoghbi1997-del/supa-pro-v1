import { Preferences } from '@capacitor/preferences';

export interface SavedAccount {
  id: string;
  email?: string;
  username?: string;
  password?: string;
  fullName: string;
  role: string;
  isVirtual: boolean;
  greenhouseName?: string;
  avatarSeed?: string; // For dynamic aesthetic avatar generations
  biometricEnabled?: boolean; // Enable biometric unlock for this specific account
  pinEnabled?: boolean; // Enable PIN lock for this account
  pinCode?: string; // 4-digit secure code
  parentId?: string;
  parent_id?: string;
  owner_id?: string;
}

function obfuscate(text: string): string {
  if (!text) return text;
  try {
    const reversed = text.split('').reverse().join('');
    const utf8Encoded = new TextEncoder().encode(reversed);
    let binary = '';
    const len = utf8Encoded.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(utf8Encoded[i]);
    }
    return 'obf:' + btoa(binary);
  } catch (_e) {
    return text;
  }
}

function deobfuscate(text: string): string {
  if (!text || !text.startsWith('obf:')) return text;
  try {
    const pureBase64 = text.substring(4);
    const binary = atob(pureBase64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decoded = new TextDecoder().decode(bytes);
    return decoded.split('').reverse().join('');
  } catch (_e) {
    return text;
  }
}

function obfuscateAccount(acc: SavedAccount): SavedAccount {
  return {
    ...acc,
    password: acc.password ? obfuscate(acc.password) : undefined,
    pinCode: acc.pinCode ? obfuscate(acc.pinCode) : undefined,
  };
}

export async function getSavedAccounts(): Promise<SavedAccount[]> {
  try {
    const { value } = await Preferences.get({ key: 'saved_accounts_list' });
    if (value) {
      const parsed: SavedAccount[] = JSON.parse(value);
      return parsed.map(acc => ({
        ...acc,
        password: acc.password ? deobfuscate(acc.password) : undefined,
        pinCode: acc.pinCode ? deobfuscate(acc.pinCode) : undefined,
      }));
    }
  } catch (error) {
    console.error("Error reading saved accounts:", error);
  }
  return [];
}

export async function setSavedAccountsList(accounts: SavedAccount[]) {
  try {
    const obfuscatedList = accounts.map(obfuscateAccount);
    await Preferences.set({ key: 'saved_accounts_list', value: JSON.stringify(obfuscatedList) });
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
    
    if (existingIndex >= 0) {
      const existing = list[existingIndex];
      const merged = { ...existing, ...account, avatarSeed: account.avatarSeed || existing.avatarSeed };
      list[existingIndex] = merged;
    } else {
      list.push(account);
    }
    
    const obfuscatedList = list.map(obfuscateAccount);
    await Preferences.set({ key: 'saved_accounts_list', value: JSON.stringify(obfuscatedList) });
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
    const obfuscatedList = filtered.map(obfuscateAccount);
    await Preferences.set({ key: 'saved_accounts_list', value: JSON.stringify(obfuscatedList) });
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
    const obfuscatedList = updated.map(obfuscateAccount);
    await Preferences.set({ key: 'saved_accounts_list', value: JSON.stringify(obfuscatedList) });
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
    const obfuscatedList = updated.map(obfuscateAccount);
    await Preferences.set({ key: 'saved_accounts_list', value: JSON.stringify(obfuscatedList) });
  } catch (error) {
    console.error("Error toggling saved account biometrics:", error);
  }
}

export async function setSavedAccountPin(accountId: string, pinCode: string | null) {
  try {
    const list = await getSavedAccounts();
    const updated = list.map(acc => {
      if (acc.id === accountId) {
        return { 
          ...acc, 
          pinEnabled: pinCode !== null, 
          pinCode: pinCode || undefined 
        };
      }
      return acc;
    });
    const obfuscatedList = updated.map(obfuscateAccount);
    await Preferences.set({ key: 'saved_accounts_list', value: JSON.stringify(obfuscatedList) });
  } catch (error) {
    console.error("Error setting PIN for saved account:", error);
  }
}

