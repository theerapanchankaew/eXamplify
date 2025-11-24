'use client';

import { useState } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, doc, addDoc, deleteDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { GraduationCap, Plus, Edit, Trash2, Copy, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { Label } from '@/components/ui/label';

export default function MasterCoursesPage() {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
    const [isEditDialogOpen, setEditDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [selectedMasterCourse, setSelectedMasterCourse] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        category: '',
        difficulty: 'Beginner',
        price: 0,
        duration: '',
        objectives: '',
        prerequisites: '',
    });

    // Fetch user profile
    const userDocRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, 'users', user.uid) : null),
        [firestore, user]
    );
    const { data: userProfile } = useDoc(userDocRef);

    // Fetch master courses
    const masterCoursesQuery = useMemoFirebase(
        () => (firestore ? query(collection(firestore, 'masterCourses')) : null),
        [firestore]
    );
    const { data: masterCourses, isLoading } = useCollection(masterCoursesQuery);

    const handleCreateClick = () => {
        setFormData({
            name: '',
            description: '',
            category: '',
            difficulty: 'Beginner',
            price: 0,
            duration: '',
            objectives: '',
            prerequisites: '',
        });
        setCreateDialogOpen(true);
    };

    const handleEditClick = (masterCourse: any) => {
        setSelectedMasterCourse(masterCourse);
        setFormData({
            name: masterCourse.name || '',
            description: masterCourse.description || '',
            category: masterCourse.category || '',
            difficulty: masterCourse.difficulty || 'Beginner',
            price: masterCourse.price || 0,
            duration: masterCourse.duration || '',
            objectives: masterCourse.objectives || '',
            prerequisites: masterCourse.prerequisites || '',
        });
        setEditDialogOpen(true);
    };

    const handleDeleteClick = (masterCourse: any) => {
        setSelectedMasterCourse(masterCourse);
        setDeleteDialogOpen(true);
    };

    const handleCreateMasterCourse = async () => {
        if (!firestore || !user) return;

        try {
            await addDoc(collection(firestore, 'masterCourses'), {
                ...formData,
                price: Number(formData.price),
                createdAt: Timestamp.now(),
                createdBy: user.uid,
                updatedAt: Timestamp.now(),
            });

            toast({
                title: 'Master Course Created',
                description: `"${formData.name}" has been created successfully.`,
            });

            setCreateDialogOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Creation Failed',
                description: error.message,
            });
        }
    };

    const handleUpdateMasterCourse = async () => {
        if (!firestore || !selectedMasterCourse) return;

        try {
            const docRef = doc(firestore, 'masterCourses', selectedMasterCourse.id);
            await updateDoc(docRef, {
                ...formData,
                price: Number(formData.price),
                updatedAt: Timestamp.now(),
            });

            toast({
                title: 'Master Course Updated',
                description: `"${formData.name}" has been updated successfully.`,
            });

            setEditDialogOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Update Failed',
                description: error.message,
            });
        }
    };

    const handleDeleteMasterCourse = async () => {
        if (!firestore || !selectedMasterCourse) return;

        try {
            await deleteDoc(doc(firestore, 'masterCourses', selectedMasterCourse.id));

            toast({
                title: 'Master Course Deleted',
                description: `"${selectedMasterCourse.name}" has been deleted.`,
            });

            setDeleteDialogOpen(false);
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Deletion Failed',
                description: error.message,
            });
        }
    };

    const handleCreateCourseFromMaster = async (masterCourse: any) => {
        if (!firestore || !user) return;

        try {
            await addDoc(collection(firestore, 'courses'), {
                name: masterCourse.name,
                description: masterCourse.description,
                category: masterCourse.category,
                difficulty: masterCourse.difficulty,
                price: masterCourse.price,
                duration: masterCourse.duration,
                objectives: masterCourse.objectives,
                prerequisites: masterCourse.prerequisites,
                masterCourseId: masterCourse.id,
                instructorId: user.uid,
                enrollment_count: 0,
                createdAt: Timestamp.now(),
            });

            toast({
                title: 'Course Created',
                description: `A new course "${masterCourse.name}" has been created from this template.`,
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Course Creation Failed',
                description: error.message,
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
            <div className="flex justify-between items-start">
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold tracking-tight">Master Courses</h1>
                    <p className="text-muted-foreground text-lg">
                        Manage course templates and create new courses
                    </p>
                </div>
                {(userProfile?.role === 'Admin' || userProfile?.role === 'Instructor') && (
                    <Button onClick={handleCreateClick}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Master Course
                    </Button>
                )}
            </div>

            {/* Master Courses Grid */}
            {!masterCourses || masterCourses.length === 0 ? (
                <div className="text-center py-20">
                    <GraduationCap className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No master courses found</h3>
                    <p className="text-muted-foreground mb-4">Create your first master course template</p>
                    {(userProfile?.role === 'Admin' || userProfile?.role === 'Instructor') && (
                        <Button onClick={handleCreateClick}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Master Course
                        </Button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {masterCourses.map((masterCourse) => (
                        <Card key={masterCourse.id} className="flex flex-col hover:shadow-lg transition-all">
                            <CardHeader>
                                <div className="flex items-start justify-between mb-2">
                                    <div className="p-2 bg-primary/10 rounded-lg">
                                        <GraduationCap className="h-5 w-5 text-primary" />
                                    </div>
                                    <Badge>{masterCourse.difficulty}</Badge>
                                </div>
                                <CardTitle className="line-clamp-2">{masterCourse.name}</CardTitle>
                                <CardDescription className="line-clamp-3">
                                    {masterCourse.description || 'No description available'}
                                </CardDescription>
                            </CardHeader>

                            <CardContent className="flex-1 space-y-2">
                                {masterCourse.category && (
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Category:</span>{' '}
                                        <span className="font-medium">{masterCourse.category}</span>
                                    </div>
                                )}
                                {masterCourse.price !== undefined && (
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Price:</span>{' '}
                                        <span className="font-medium">{masterCourse.price} THB</span>
                                    </div>
                                )}
                            </CardContent>

                            <CardFooter className="flex gap-2">
                                <Button
                                    variant="default"
                                    size="sm"
                                    className="flex-1"
                                    onClick={() => handleCreateCourseFromMaster(masterCourse)}
                                >
                                    <Copy className="mr-1 h-4 w-4" />
                                    Create Course
                                </Button>
                                {(userProfile?.role === 'Admin' || userProfile?.role === 'Instructor') && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleEditClick(masterCourse)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteClick(masterCourse)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            {/* Create Dialog */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Create Master Course</DialogTitle>
                        <DialogDescription>
                            Create a new master course template
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Course name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Course description"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Programming"
                                />
                            </div>
                            <div>
                                <Label htmlFor="difficulty">Difficulty</Label>
                                <Select
                                    value={formData.difficulty}
                                    onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                                >
                                    <SelectTrigger id="difficulty">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Beginner">Beginner</SelectItem>
                                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                                        <SelectItem value="Advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="price">Price (THB)</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <Label htmlFor="duration">Duration</Label>
                                <Input
                                    id="duration"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    placeholder="e.g., 8 weeks"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="objectives">Learning Objectives</Label>
                            <Textarea
                                id="objectives"
                                value={formData.objectives}
                                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                                placeholder="What students will learn"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="prerequisites">Prerequisites</Label>
                            <Textarea
                                id="prerequisites"
                                value={formData.prerequisites}
                                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                                placeholder="Required knowledge or skills"
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateMasterCourse} disabled={!formData.name}>
                            Create
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Master Course</DialogTitle>
                        <DialogDescription>
                            Update master course template
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-name">Name *</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="Course name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-description">Description</Label>
                            <Textarea
                                id="edit-description"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Course description"
                                rows={3}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-category">Category</Label>
                                <Input
                                    id="edit-category"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    placeholder="e.g., Programming"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-difficulty">Difficulty</Label>
                                <Select
                                    value={formData.difficulty}
                                    onValueChange={(v) => setFormData({ ...formData, difficulty: v })}
                                >
                                    <SelectTrigger id="edit-difficulty">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Beginner">Beginner</SelectItem>
                                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                                        <SelectItem value="Advanced">Advanced</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-price">Price (THB)</Label>
                                <Input
                                    id="edit-price"
                                    type="number"
                                    value={formData.price}
                                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-duration">Duration</Label>
                                <Input
                                    id="edit-duration"
                                    value={formData.duration}
                                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                                    placeholder="e.g., 8 weeks"
                                />
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="edit-objectives">Learning Objectives</Label>
                            <Textarea
                                id="edit-objectives"
                                value={formData.objectives}
                                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                                placeholder="What students will learn"
                                rows={3}
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-prerequisites">Prerequisites</Label>
                            <Textarea
                                id="edit-prerequisites"
                                value={formData.prerequisites}
                                onChange={(e) => setFormData({ ...formData, prerequisites: e.target.value })}
                                placeholder="Required knowledge or skills"
                                rows={2}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateMasterCourse} disabled={!formData.name}>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the master course "{selectedMasterCourse?.name}".
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMasterCourse}>
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
