'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useDoc, useCollection, useFirestore, useUser, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, addDoc, serverTimestamp, increment, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MessageCircle, ThumbsUp, Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function PostDetailsPage() {
    const params = useParams();
    const postId = params.postId as string;
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();
    const router = useRouter();
    const [commentContent, setCommentContent] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch Post
    const postRef = useMemoFirebase(
        () => (firestore ? doc(firestore, 'posts', postId) : null),
        [firestore, postId]
    );
    const { data: post, isLoading: isLoadingPost } = useDoc(postRef);

    // Fetch Comments
    const commentsQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'posts', postId, 'comments'), orderBy('createdAt', 'asc')) : null),
        [firestore, postId]
    );
    const { data: comments, isLoading: isLoadingComments } = useCollection(commentsQuery);

    const handleAddComment = async () => {
        if (!firestore || !user || !commentContent.trim()) return;

        setIsSubmitting(true);
        try {
            // Add comment
            await addDoc(collection(firestore, 'posts', postId, 'comments'), {
                content: commentContent,
                authorId: user.uid,
                authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                authorAvatar: user.photoURL || '',
                createdAt: serverTimestamp(),
            });

            // Update post comment count
            if (postRef) {
                await updateDoc(postRef, {
                    commentsCount: increment(1)
                });
            }

            setCommentContent('');
            toast({
                title: 'Comment Added',
                description: 'Your comment has been posted.',
            });
        } catch (error: any) {
            console.error('Error adding comment:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to post comment.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLike = async () => {
        if (!firestore || !user || !postRef) return;
        // Simple like implementation (just increment, no dedup for now to keep it simple)
        // In a real app, you'd track likes in a subcollection to prevent double-liking
        try {
            await updateDoc(postRef, {
                likes: increment(1)
            });
        } catch (error) {
            console.error('Error liking post:', error);
        }
    };

    if (isLoadingPost) {
        return (
            <div className="container max-w-3xl py-8 space-y-8">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-64 w-full rounded-xl" />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="container max-w-3xl py-8 text-center">
                <h1 className="text-2xl font-bold mb-4">Post not found</h1>
                <Button asChild>
                    <Link href="/community">Back to Community</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container max-w-3xl py-8 space-y-8">
            <Button variant="ghost" size="sm" asChild className="mb-4">
                <Link href="/community">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Feed
                </Link>
            </Button>

            {/* Main Post */}
            <Card>
                <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                                <AvatarImage src={post.authorAvatar} />
                                <AvatarFallback>{post.authorName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{post.authorName}</p>
                                <p className="text-xs text-muted-foreground">
                                    {post.createdAt ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline" className="capitalize">
                            {post.type}
                        </Badge>
                    </div>
                    <CardTitle className="text-2xl mt-4">{post.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                        {post.content}
                    </div>

                    {post.tags && post.tags.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {post.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                    #{tag}
                                </Badge>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-4 pt-4 border-t">
                        <Button variant="ghost" size="sm" onClick={handleLike}>
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            {post.likes || 0} Likes
                        </Button>
                        <div className="flex items-center text-sm text-muted-foreground">
                            <MessageCircle className="mr-2 h-4 w-4" />
                            {post.commentsCount || 0} Comments
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Comments Section */}
            <div className="space-y-6">
                <h3 className="text-xl font-semibold">Comments</h3>

                {/* Add Comment Form */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex gap-4">
                            <Avatar className="h-8 w-8 hidden sm:block">
                                <AvatarImage src={user?.photoURL || ''} />
                                <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-4">
                                <Textarea
                                    placeholder="Write a comment..."
                                    value={commentContent}
                                    onChange={(e) => setCommentContent(e.target.value)}
                                    className="min-h-[80px]"
                                />
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleAddComment}
                                        disabled={!commentContent.trim() || isSubmitting}
                                    >
                                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                        Post Comment
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Comments List */}
                <div className="space-y-4">
                    {isLoadingComments ? (
                        <div className="space-y-4">
                            <Skeleton className="h-24 w-full" />
                            <Skeleton className="h-24 w-full" />
                        </div>
                    ) : comments && comments.length > 0 ? (
                        comments.map((comment) => (
                            <Card key={comment.id}>
                                <CardContent className="pt-6">
                                    <div className="flex gap-4">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={comment.authorAvatar} />
                                            <AvatarFallback>{comment.authorName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{comment.authorName}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                                </span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <p className="text-center text-muted-foreground py-8">No comments yet. Be the first to share your thoughts!</p>
                    )}
                </div>
            </div>
        </div>
    );
}
