'use client';

import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Trophy, Calendar, Download, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

export default function CertificatesPage() {
    const { user } = useUser();
    const firestore = useFirestore();

    const certificatesQuery = useMemoFirebase(
        () =>
            firestore && user
                ? query(collection(firestore, 'users', user.uid, 'certificates'), orderBy('issueDate', 'desc'))
                : null,
        [firestore, user]
    );

    const { data: certificates, isLoading } = useCollection(certificatesQuery);

    if (isLoading) {
        return (
            <div className="w-full space-y-6">
                <h1 className="text-3xl font-bold">My Certificates</h1>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[200px] w-full rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold">My Certificates</h1>
                <p className="text-muted-foreground">
                    View and download certificates for your completed courses.
                </p>
            </div>

            {!certificates || certificates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg bg-muted/50">
                    <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">No Certificates Yet</h3>
                    <p className="text-muted-foreground text-center max-w-sm mt-2 mb-6">
                        Complete courses to earn certificates. Start learning today!
                    </p>
                    <Button asChild>
                        <Link href="/courses">Browse Courses</Link>
                    </Button>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {certificates.map((cert) => (
                        <Card key={cert.id} className="flex flex-col overflow-hidden border-l-4 border-l-yellow-500 shadow-md hover:shadow-lg transition-shadow">
                            <CardHeader className="bg-gradient-to-r from-yellow-50 to-transparent pb-4">
                                <div className="flex justify-between items-start">
                                    <Trophy className="h-8 w-8 text-yellow-500 mb-2" />
                                    <span className="text-xs font-mono text-muted-foreground bg-background px-2 py-1 rounded border">
                                        {cert.certificateId || 'CERT-ID'}
                                    </span>
                                </div>
                                <CardTitle className="line-clamp-2">{cert.courseName}</CardTitle>
                                <CardDescription>Instructor: {cert.instructorName}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1 pt-4">
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Calendar className="mr-2 h-4 w-4" />
                                    Issued on: {cert.issueDate?.seconds ? format(new Date(cert.issueDate.seconds * 1000), 'PPP') : 'N/A'}
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/20 pt-4">
                                <Button variant="outline" className="w-full" onClick={() => window.print()}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Print / Download
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
