'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Plus, ThumbsUp, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function CommunityPage() {
    const firestore = useFirestore();
    const [filter, setFilter] = useState<string>('all');

    const postsQuery = useMemoFirebase(
        () => {
            if (!firestore) return null;
            const baseCollection = collection(firestore, 'posts');

            if (filter === 'all') {
                return query(baseCollection, orderBy('createdAt', 'desc'));
            }

            return query(
                baseCollection,
                where('type', '==', filter),
                orderBy('createdAt', 'desc')
            );
        },
        [firestore, filter]
    );

    const { data: posts, isLoading, error } = useCollection(postsQuery);

    const getBadgeVariant = (type: string) => {
        switch (type) {
            case 'question': return 'destructive';
            case 'knowledge': return 'secondary';
            default: return 'default';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'question': return '❓';
            case 'knowledge': return '💡';
            default: return '💬';
        }
    };

    return (
        <div className="container max-w-4xl py-8 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Community Hub</h1>
                    <p className="text-muted-foreground">
                        Connect, learn, and grow with your peers.
                    </p>
                </div>
                <Button asChild>
                    <Link href="/community/new">
                        <Plus className="mr-2 h-4 w-4" />
                        New Post
                    </Link>
                </Button>
            </div>

            <Tabs defaultValue="all" onValueChange={setFilter} className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[400px]">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="discussion">Discuss</TabsTrigger>
                    <TabsTrigger value="question">Q&A</TabsTrigger>
                    <TabsTrigger value="knowledge">Tips</TabsTrigger>
                </TabsList>
            </Tabs>

            <div className="space-y-4">
                {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-6 w-3/4 mb-2" />
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-2/3 mt-1" />
                            </CardContent>
                        </Card>
                    ))
                ) : error ? (
                    <Card className="border-destructive/50 bg-destructive/10">
                        <CardContent className="pt-6 text-center text-destructive">
                            <p>Error loading posts. Please try again later.</p>
                            <p className="text-xs opacity-70 mt-2 font-mono break-all">{error.message}</p>
                            {error.message.includes('index') && (
                                <p className="text-xs mt-2 font-bold">
                                    This query requires a Firestore index. Check the console or the error message above for a link to create it.
                                </p>
                            )}
                        </CardContent>
                    </Card>
                ) : posts && posts.length > 0 ? (
                    posts.map((post) => (
                        <Link href={`/community/${post.id}`} key={post.id} className="block group">
                            <Card className="transition-colors hover:bg-muted/50">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={post.authorAvatar} />
                                                <AvatarFallback>{post.authorName?.charAt(0) || 'U'}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium leading-none">{post.authorName}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant={getBadgeVariant(post.type)} className="capitalize">
                                            {getTypeIcon(post.type)} {post.type}
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="pb-3">
                                    <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                                        {post.title}
                                    </h3>
                                    <p className="text-muted-foreground line-clamp-3 text-sm">
                                        {post.content}
                                    </p>
                                    {post.tags && post.tags.length > 0 && (
                                        <div className="flex gap-2 mt-4 flex-wrap">
                                            {post.tags.map((tag: string, index: number) => (
                                                <Badge key={index} variant="outline" className="text-xs font-normal">
                                                    #{tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="pt-0 text-muted-foreground text-sm flex gap-6">
                                    <div className="flex items-center gap-1">
                                        <ThumbsUp className="h-4 w-4" />
                                        <span>{post.likes || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <MessageCircle className="h-4 w-4" />
                                        <span>{post.commentsCount || 0} Comments</span>
                                    </div>
                                </CardFooter>
                            </Card>
                        </Link>
                    ))
                ) : (
                    <div className="text-center py-12">
                        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-4" />
                        <h3 className="text-lg font-semibold">No posts yet</h3>
                        <p className="text-muted-foreground mb-4">Be the first to start a conversation!</p>
                        <Button asChild>
                            <Link href="/community/new">Create Post</Link>
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
