import { ICliKeyValueStore } from '@qodalis/cli-core';
import { CliCommandHistory } from '../lib/services/cli-command-history';

class MockKeyValueStore implements ICliKeyValueStore {
    private data = new Map<string, any>();

    async get<T = any>(key: string): Promise<T | undefined> {
        return this.data.get(key) as T | undefined;
    }

    async set(key: string, value: any): Promise<void> {
        this.data.set(key, value);
    }

    async remove(key: string): Promise<void> {
        this.data.delete(key);
    }

    async clear(): Promise<void> {
        this.data.clear();
    }
}

describe('CliCommandHistory', () => {
    let history: CliCommandHistory;
    let store: MockKeyValueStore;

    beforeEach(() => {
        store = new MockKeyValueStore();
        history = new CliCommandHistory(store);
    });

    it('should start with empty history', () => {
        expect(history.getHistory()).toEqual([]);
        expect(history.getLastIndex()).toBe(0);
    });

    it('should add a command', async () => {
        await history.addCommand('echo hello');
        expect(history.getHistory()).toEqual(['echo hello']);
        expect(history.getLastIndex()).toBe(1);
    });

    it('should add multiple commands in order', async () => {
        await history.addCommand('first');
        await history.addCommand('second');
        await history.addCommand('third');
        expect(history.getHistory()).toEqual(['first', 'second', 'third']);
    });

    it('should not add duplicate consecutive commands', async () => {
        await history.addCommand('echo hello');
        await history.addCommand('echo hello');
        expect(history.getHistory()).toEqual(['echo hello']);
    });

    it('should allow non-consecutive duplicates', async () => {
        await history.addCommand('a');
        await history.addCommand('b');
        await history.addCommand('a');
        expect(history.getHistory()).toEqual(['a', 'b', 'a']);
    });

    it('should ignore empty and whitespace-only commands', async () => {
        await history.addCommand('');
        await history.addCommand('   ');
        await history.addCommand('\t');
        expect(history.getHistory()).toEqual([]);
    });

    it('should trim command whitespace', async () => {
        await history.addCommand('  echo hello  ');
        expect(history.getHistory()).toEqual(['echo hello']);
    });

    it('should get command by index', async () => {
        await history.addCommand('first');
        await history.addCommand('second');
        expect(history.getCommand(0)).toBe('first');
        expect(history.getCommand(1)).toBe('second');
        expect(history.getCommand(2)).toBeUndefined();
    });

    it('should clear history', async () => {
        await history.addCommand('first');
        await history.addCommand('second');
        await history.clearHistory();
        expect(history.getHistory()).toEqual([]);
        expect(history.getLastIndex()).toBe(0);
    });

    it('should return a copy from getHistory (not the internal array)', async () => {
        await history.addCommand('test');
        const result = history.getHistory();
        result.push('injected');
        expect(history.getHistory().length).toBe(1);
    });

    it('should persist to store on add', async () => {
        await history.addCommand('cmd1');
        const stored = await store.get<string[]>('cli-command-history');
        expect(stored).toEqual(['cmd1']);
    });

    it('should persist to store on clear', async () => {
        await history.addCommand('cmd1');
        await history.clearHistory();
        const stored = await store.get<string[]>('cli-command-history');
        expect(stored).toEqual([]);
    });
});
