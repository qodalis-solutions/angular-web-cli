import { Injectable } from '@angular/core';
import { CliDefaultUsersStoreService } from '@qodalis/cli-users';

@Injectable()
export class CliCustomUsersStoreService extends CliDefaultUsersStoreService {
    constructor() {
        super();
    }

    protected override initialize(): void {
        super.initialize([
            {
                id: 'root',
                name: 'root',
                email: 'root@root.com',
                groups: ['admin'],
            },
            {
                id: 'root1',
                name: 'root1',
                email: 'root1@root.com',
                groups: ['admin'],
            },
        ]);
    }
}
