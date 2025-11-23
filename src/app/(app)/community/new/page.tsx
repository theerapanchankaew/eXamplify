'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useFirestore, useUser } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const postSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters.').max(100, 'Title must be less than 100 characters.'),
    content: z.string().min(20, 'Content must be at least 20 characters.'),
    type: z.enum(['discussion', 'question', 'knowledge'], {
        required_error: 'Please select a post type.',
    }),
    tags: z.string().optional(),
});

type PostFormData = z.infer<typeof postSchema>;

export default function CreatePostPage() {
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<PostFormData>({
        resolver: zodResolver(postSchema),
        defaultValues: {
            title: '',
            content: '',
            type: 'discussion',
            tags: '',
        },
    });

    const onSubmit = async (data: PostFormData) => {
        if (!firestore || !user) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'You must be logged in to create a post.',
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const tagsArray = data.tags
                ? data.tags.split(',').map((tag) => tag.trim()).filter((tag) => tag !== '')
                : [];

            await addDoc(collection(firestore, 'posts'), {
                title: data.title,
                content: data.content,
                type: data.type,
                tags: tagsArray,
                authorId: user.uid,
                authorName: user.displayName || user.email?.split('@')[0] || 'Anonymous',
                authorAvatar: user.photoURL || '',
                likes: 0,
                commentsCount: 0,
                createdAt: serverTimestamp(),
            });

            toast({
                title: 'Post Created',
                description: 'Your post has been successfully published.',
            });

            router.push('/community');
        } catch (error: any) {
            console.error('Error creating post:', error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to create post.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container max-w-2xl py-8 space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/community">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Create Post</h1>
                    <p className="text-muted-foreground">Share your thoughts with the community.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>New Discussion</CardTitle>
                    <CardDescription>
                        Ask a question, share knowledge, or start a discussion.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Post Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="discussion">💬 Discussion</SelectItem>
                                                <SelectItem value="question">❓ Question</SelectItem>
                                                <SelectItem value="knowledge">💡 Knowledge</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormDescription>
                                            Choose the category that best fits your post.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="What's on your mind?" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="content"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Content</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Write your post content here..."
                                                className="min-h-[200px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="tags"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tags (Optional)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="learning, javascript, career (comma separated)" {...field} />
                                        </FormControl>
                                        <FormDescription>
                                            Separate tags with commas.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-4">
                                <Button variant="outline" type="button" onClick={() => router.back()}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Publish Post
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
