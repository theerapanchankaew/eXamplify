'use client';

import { useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function SeedPage() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);

    const handleSeed = async () => {
        if (!firestore) return;
        setLoading(true);
        try {
            // 1. Create Course
            const courseRef = doc(collection(firestore, 'courses'));
            const courseId = courseRef.id;

            await setDoc(courseRef, {
                name: 'Free Certification Test Course',
                description: 'A free course to test enrollment and certificate generation.',
                price: 0,
                instructorId: 'admin_user',
                createdAt: serverTimestamp(),
                enrollment_count: 0,
                published: true
            });

            // 2. Create Module
            const moduleRef = await addDoc(collection(firestore, `courses/${courseId}/modules`), {
                name: 'Test Module 1',
                description: 'First module for testing.',
                courseId: courseId,
                createdAt: serverTimestamp()
            });

            // 3. Create Chapter
            const chapterRef = await addDoc(collection(firestore, `courses/${courseId}/modules/${moduleRef.id}/chapters`), {
                name: 'Test Chapter 1',
                content: 'This is a test chapter. Read it and complete it.',
                moduleId: moduleRef.id,
                createdAt: serverTimestamp()
            });

            toast({ title: 'Success', description: 'Test course created successfully!' });
        } catch (error: any) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Error', description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex justify-center items-center h-[80vh]">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Test Data Seeder</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="mb-4 text-muted-foreground">
                        Click the button below to create a free test course with modules and chapters.
                    </p>
                    <Button onClick={handleSeed} disabled={loading} className="w-full">
                        {loading ? 'Seeding...' : 'Seed Free Test Course'}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
