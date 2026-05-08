import AsyncStorage from '@react-native-async-storage/async-storage';

export const StorageKeys = {
  APP_STATE: '@budget_app_state_v1',
};

export const saveData = async (key: string, value: any) => {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
  } catch (e) {
    console.error('Failed to save data', e);
  }
};

export const loadData = async (key: string) => {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (e) {
    console.error('Failed to load data', e);
    return null;
  }
};

export const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
  } catch (e) {
    console.error('Failed to clear data', e);
  }
};

// Export app data to JSON for backup
export const exportBackup = async () => {
  try {
    const data = await loadData(StorageKeys.APP_STATE);
    if (!data) return null;
    const backup = {
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    };
    return JSON.stringify(backup, null, 2);
  } catch (e) {
    console.error('Failed to export backup', e);
    return null;
  }
};

// Import app data from JSON backup
export const importBackup = async (jsonString: string) => {
  try {
    const backup = JSON.parse(jsonString);
    // Validate backup structure
    if (!backup || !backup.data || backup.version !== 1) {
      throw new Error('Invalid backup format');
    }
    // Basic validation of required fields
    if (!backup.data.transactions || !backup.data.categories || !backup.data.settings) {
      throw new Error('Backup is missing required data');
    }
    return backup.data;
  } catch (e) {
    console.error('Failed to import backup', e);
    throw e;
  }
};
