import {
    ICliUserSessionService,
    ICliUserSession,
    ICliUsersStoreService,
} from '@qodalis/cli-core';
import { BehaviorSubject, Observable, take } from 'rxjs';

export class CliDefaultUserSessionService implements ICliUserSessionService {
    private userSessionSubject = new BehaviorSubject<
        ICliUserSession | undefined
    >({
        user: {
            id: 'anonymous',
            name: 'Anonymous',
            email: 'anonymous',
        },
    });

    constructor(usersService: ICliUsersStoreService) {
        usersService
            .getUsers()
            .pipe(take(1))
            .subscribe((users) => {
                const user = users.find((u) => u.id === 'root');
                if (user) {
                    this.setUserSession({ user });
                }
            });
    }

    async setUserSession(session: ICliUserSession): Promise<void> {
        this.userSessionSubject.next(session);
    }

    getUserSession(): Observable<ICliUserSession | undefined> {
        return this.userSessionSubject.asObservable();
    }
}
