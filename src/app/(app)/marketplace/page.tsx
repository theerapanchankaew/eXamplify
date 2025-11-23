'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, collectionGroup } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { addToCart } from '@/lib/marketplace';
import { Search, ShoppingCart, BookOpen, FileText, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function MarketplacePage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'course' | 'exam'>('all');
    const [sortBy, setSortBy] = useState<'name' | 'price' | 'popularity'>('name');

    // Fetch all courses
    const coursesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'courses')) : null),
        [firestore]
    );
    const { data: courses, isLoading: isLoadingCourses } = useCollection(coursesQuery);

    // Fetch all exams
    const examsQuery = useMemoFirebase(
        () => (firestore ? query(collectionGroup(firestore, 'exams')) : null),
        [firestore]
    );
    const { data: exams, isLoading: isLoadingExams } = useCollection(examsQuery);

    const isLoading = isLoadingCourses || isLoadingExams;

    // Combine and filter items
    const allItems = [
        ...(courses?.map(c => ({ ...c, type: 'course' as const })) || []),
        ...(exams?.map(e => ({ ...e, type: 'exam' as const })) || []),
    ];

    const filteredItems = allItems
        .filter(item => {
            if (filterType !== 'all' && item.type !== filterType) return false;
            if (searchQuery && !item.name?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
            if (sortBy === 'price') return (a.price || 0) - (b.price || 0);
            if (sortBy === 'popularity') return (b.enrollment_count || 0) - (a.enrollment_count || 0);
            return 0;
        });

    const handleAddToCart = async (item: any) => {
        if (!firestore || !user) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'You must be logged in to add items to cart.',
            });
            return;
        }

        try {
            await addToCart(
                firestore,
                user.uid,
                item.type,
                item.id,
                item.name,
                item.price || 0,
                item.description,
                item.thumbnail
            );

            toast({
                title: 'Added to Cart',
                description: `${item.name} has been added to your cart.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to add item to cart.',
            });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[...Array(6)].map((_, i) => (
                        <Skeleton key={i} className="h-[300px] rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 space-y-8">
            {/* Header */}
            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Marketplace</h1>
                <p className="text-muted-foreground text-lg">
                    Browse and purchase courses and exams
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search courses and exams..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                <Select value={filterType} onValueChange={(v: any) => setFilterType(v)}>
                    <SelectTrigger className="w-[180px]">
                        <Filter className="mr-2 h-4 w-4" />
                        <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Items</SelectItem>
                        <SelectItem value="course">Courses Only</SelectItem>
                        <SelectItem value="exam">Exams Only</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="price">Price</SelectItem>
                        <SelectItem value="popularity">Popularity</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
                Showing {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </div>

            {/* Items Grid */}
            {filteredItems.length === 0 ? (
                <div className="text-center py-20">
                    <h3 className="text-xl font-semibold mb-2">No items found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredItems.map((item) => (
                        <Card key={`${item.type}-${item.id}`} className="flex flex-col hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between mb-2">
                                    <Badge variant={item.type === 'course' ? 'default' : 'secondary'}>
                                        {item.type === 'course' ? (
                                            <><BookOpen className="mr-1 h-3 w-3" /> Course</>
                                        ) : (
                                            <><FileText className="mr-1 h-3 w-3" /> Exam</>
                                        )}
                                    </Badge>
                                    <span className="text-2xl font-bold text-primary">
                                        {item.price || 0} <span className="text-sm font-normal">tokens</span>
                                    </span>
                                </div>
                                <CardTitle className="line-clamp-2">{item.name}</CardTitle>
                                <CardDescription className="line-clamp-3">
                                    {item.description || 'No description available'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1">
                                <div className="space-y-2 text-sm text-muted-foreground">
                                    {item.enrollment_count !== undefined && (
                                        <div>👥 {item.enrollment_count} enrolled</div>
                                    )}
                                    {item.difficulty && (
                                        <div>📊 {item.difficulty}</div>
                                    )}
                                </div>
                            </CardContent>

                            <CardFooter>
                                <Button
                                    className="w-full"
                                    onClick={() => handleAddToCart(item)}
                                >
                                    <ShoppingCart className="mr-2 h-4 w-4" />
                                    Add to Cart
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
