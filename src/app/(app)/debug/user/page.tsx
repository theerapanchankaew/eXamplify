'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function DebugUserPage() {
    const firestore = useFirestore();
    const [email, setEmail] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!firestore || !email) return;
        setLoading(true);
        setError('');
        setUserData(null);

        try {
            const q = query(collection(firestore, 'users'), where('email', '==', email));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setError('User not found');
            } else {
                setUserData({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <Card>
                <CardHeader>
                    <CardTitle>Debug User Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Enter email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button onClick={handleSearch} disabled={loading}>
                            {loading ? 'Searching...' : 'Search'}
                        </Button>
                    </div>

                    {error && <p className="text-red-500">{error}</p>}

                    {userData && (
                        <div className="bg-slate-100 p-4 rounded-md overflow-auto">
                            <pre className="text-sm">{JSON.stringify(userData, null, 2)}</pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
