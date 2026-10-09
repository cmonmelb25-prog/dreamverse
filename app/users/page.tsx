
import { getAllUsers } from '@/server/actions/ai';
import UsersClient from './UsersClient';
import { serializeFirestore } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function UsersPage() {
    const users = await getAllUsers();

    return (
        <div className="container mx-auto px-4 py-8 pb-20">
            <div className="mb-10">
                <h1 className="text-4xl font-bold font-headline bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                    The Community
                </h1>
                <p className="text-muted-foreground mt-2">Connect with other people exploring the DreamVerse.</p>
            </div>
            
            <UsersClient initialUsers={serializeFirestore(users)} />
        </div>
    );
}
