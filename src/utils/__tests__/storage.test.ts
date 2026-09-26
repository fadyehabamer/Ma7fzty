import AsyncStorage from '@react-native-async-storage/async-storage';
import { exportBackup, importBackup, loadData, saveData, StorageKeys } from '../storage';
import { initialState } from '../../context/AppContext';

describe('storage', () => {
    let errorSpy: jest.SpyInstance;

    beforeEach(async () => {
        await AsyncStorage.clear();
        errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => errorSpy.mockRestore());

    it('round-trips JSON values', async () => {
        await saveData('k', { a: 1, list: [1, 2] });
        expect(await loadData('k')).toEqual({ a: 1, list: [1, 2] });
        expect(await loadData('missing')).toBeNull();
    });

    it('returns null for corrupted stored JSON instead of throwing', async () => {
        await AsyncStorage.setItem('bad', '{not json');
        expect(await loadData('bad')).toBeNull();
    });

    it('exports a versioned backup that importBackup accepts', async () => {
        expect(await exportBackup()).toBeNull();

        await saveData(StorageKeys.APP_STATE, initialState);
        const json = await exportBackup();
        expect(json).not.toBeNull();

        const parsed = JSON.parse(json!);
        expect(parsed.version).toBe(1);
        expect(Number.isNaN(Date.parse(parsed.exportedAt))).toBe(false);
        expect(await importBackup(json!)).toEqual(initialState);
    });

    it('rejects backups with the wrong version or missing data', async () => {
        const data = { transactions: [], categories: [], settings: {} };
        await expect(importBackup('not json')).rejects.toThrow();
        await expect(importBackup(JSON.stringify({ version: 2, data }))).rejects.toThrow('Invalid backup format');
        await expect(
            importBackup(JSON.stringify({ version: 1, data: { transactions: [] } }))
        ).rejects.toThrow('Backup is missing required data');
        await expect(importBackup(JSON.stringify({ version: 1, data }))).resolves.toEqual(data);
    });
});
