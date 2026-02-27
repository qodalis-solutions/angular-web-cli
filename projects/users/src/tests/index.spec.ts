import { usersModule } from '../public-api';

describe('CliUsersModule', () => {
    it('should be defined', () => {
        expect(usersModule).toBeDefined();
    });

    it('should have the correct name', () => {
        expect(usersModule.name).toBe('@qodalis/cli-users');
    });

    it('should have 4 processors', () => {
        expect(usersModule.processors?.length).toBe(4);
    });

    it('should have services', () => {
        expect(usersModule.services?.length).toBeGreaterThan(0);
    });

    it('should have an onInit hook', () => {
        expect(usersModule.onInit).toBeDefined();
    });
});
