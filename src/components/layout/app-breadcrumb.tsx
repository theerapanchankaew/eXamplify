'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

interface BreadcrumbSegment {
    label: string;
    href: string;
    isLast: boolean;
}

export function AppBreadcrumb() {
    const pathname = usePathname();
    const firestore = useFirestore();
    const [segments, setSegments] = useState<BreadcrumbSegment[]>([]);

    useEffect(() => {
        async function generateBreadcrumbs() {
            if (!pathname || pathname === '/') {
                setSegments([]);
                return;
            }

            const paths = pathname.split('/').filter(Boolean);
            const breadcrumbs: BreadcrumbSegment[] = [];

            // Always start with Home
            breadcrumbs.push({
                label: 'Home',
                href: '/',
                isLast: false,
            });

            // Parse path segments
            for (let i = 0; i < paths.length; i++) {
                const segment = paths[i];
                const isLast = i === paths.length - 1;
                const href = '/' + paths.slice(0, i + 1).join('/');

                // Handle different route patterns
                if (segment === 'courses') {
                    breadcrumbs.push({
                        label: 'Courses',
                        href: '/courses',
                        isLast,
                    });
                } else if (segment === 'exams') {
                    breadcrumbs.push({
                        label: 'Exams',
                        href: '/exams',
                        isLast,
                    });
                } else if (segment === 'marketplace') {
                    breadcrumbs.push({
                        label: 'Marketplace',
                        href: '/marketplace',
                        isLast,
                    });
                } else if (segment === 'cart') {
                    breadcrumbs.push({
                        label: 'Cart',
                        href: '/cart',
                        isLast,
                    });
                } else if (segment === 'checkout') {
                    breadcrumbs.push({
                        label: 'Checkout',
                        href: '/checkout',
                        isLast,
                    });
                } else if (segment === 'my-bookings') {
                    breadcrumbs.push({
                        label: 'My Bookings',
                        href: '/my-bookings',
                        isLast,
                    });
                } else if (segment === 'schedule') {
                    breadcrumbs.push({
                        label: 'Schedule',
                        href,
                        isLast,
                    });
                } else if (segment === 'take') {
                    breadcrumbs.push({
                        label: 'Take Exam',
                        href,
                        isLast,
                    });
                } else if (segment === 'modules') {
                    breadcrumbs.push({
                        label: 'Modules',
                        href,
                        isLast,
                    });
                } else if (segment === 'chapters') {
                    breadcrumbs.push({
                        label: 'Chapters',
                        href,
                        isLast,
                    });
                } else if (segment === 'lessons') {
                    breadcrumbs.push({
                        label: 'Lessons',
                        href,
                        isLast,
                    });
                } else if (segment.length > 10 && firestore) {
                    // Likely an ID - fetch entity name
                    const prevSegment = paths[i - 1];
                    let entityName = segment.substring(0, 8) + '...';

                    try {
                        if (prevSegment === 'courses') {
                            const courseDoc = await doc(firestore, 'courses', segment);
                            const courseSnap = await import('firebase/firestore').then(m => m.getDoc(courseDoc));
                            if (courseSnap.exists()) {
                                entityName = courseSnap.data()?.name || entityName;
                            }
                        } else if (prevSegment === 'exams') {
                            // Find exam in courses
                            entityName = 'Exam';
                        } else if (prevSegment === 'modules') {
                            const courseId = paths[i - 2];
                            const moduleDoc = doc(firestore, `courses/${courseId}/modules/${segment}`);
                            const moduleSnap = await import('firebase/firestore').then(m => m.getDoc(moduleDoc));
                            if (moduleSnap.exists()) {
                                entityName = moduleSnap.data()?.name || entityName;
                            }
                        } else if (prevSegment === 'chapters') {
                            const courseId = paths[i - 4];
                            const moduleId = paths[i - 2];
                            const chapterDoc = doc(firestore, `courses/${courseId}/modules/${moduleId}/chapters/${segment}`);
                            const chapterSnap = await import('firebase/firestore').then(m => m.getDoc(chapterDoc));
                            if (chapterSnap.exists()) {
                                entityName = chapterSnap.data()?.name || entityName;
                            }
                        } else if (prevSegment === 'lessons') {
                            const courseId = paths[i - 6];
                            const moduleId = paths[i - 4];
                            const chapterId = paths[i - 2];
                            const lessonDoc = doc(firestore, `courses/${courseId}/modules/${moduleId}/chapters/${chapterId}/lessons/${segment}`);
                            const lessonSnap = await import('firebase/firestore').then(m => m.getDoc(lessonDoc));
                            if (lessonSnap.exists()) {
                                entityName = lessonSnap.data()?.title || entityName;
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching entity name:', error);
                    }

                    breadcrumbs.push({
                        label: entityName,
                        href,
                        isLast,
                    });
                }
            }

            setSegments(breadcrumbs);
        }

        generateBreadcrumbs();
    }, [pathname, firestore]);

    // Don't show breadcrumbs on home page or if only one segment
    if (!pathname || pathname === '/' || segments.length <= 1) {
        return null;
    }

    return (
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 py-3">
                <Breadcrumb>
                    <BreadcrumbList>
                        {segments.map((segment, index) => (
                            <div key={segment.href} className="flex items-center gap-2">
                                <BreadcrumbItem>
                                    {segment.isLast ? (
                                        <BreadcrumbPage>{segment.label}</BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink asChild>
                                            <Link href={segment.href} className="flex items-center gap-1">
                                                {index === 0 && <Home className="h-3 w-3" />}
                                                {segment.label}
                                            </Link>
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>
                                {!segment.isLast && <BreadcrumbSeparator />}
                            </div>
                        ))}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </div>
    );
}
