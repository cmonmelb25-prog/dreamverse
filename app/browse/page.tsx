import { getAllGirls, getAllUsers } from '@/server/actions/ai';
import BrowseClient from './BrowseClient';

export default async function BrowsePage() {
    const girls = await getAllGirls();
    const users = await getAllUsers();

    return (
        <div className="container mx-auto px-4 py-8 pb-20">
            <h1 className="text-4xl font-bold mb-8 font-headline bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                Meet the Ladies
            </h1>
            <BrowseClient initialGirls={girls} initialUsers={users} />
        </div>
    );
}
