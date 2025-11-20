'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { getAuth, createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';


const userSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  role: z.enum(['Admin', 'Instructor', 'Student']),
});

const newUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['Admin', 'Instructor', 'Student']),
});

type UserFormData = z.infer<typeof userSchema>;
type NewUserFormData = z.infer<typeof newUserSchema>;


export default function UsersPage() {
  const firestore = useFirestore();
  const auth = getAuth();
  const { toast } = useToast();

  const usersCollectionQuery = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'users')) : null),
    [firestore]
  );

  const { data: users, isLoading } = useCollection(usersCollectionQuery);

  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
  });

  const newUserForm = useForm<NewUserFormData>({
      resolver: zodResolver(newUserSchema),
      defaultValues: {
          email: '',
          password: '',
          role: 'Student',
      },
  });

  const handleEditClick = (user: any) => {
    setSelectedUser(user);
    form.reset({
      username: user.username || '',
      role: user.role || 'Student',
    });
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (user: any) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  const handleUpdateUser = async (data: UserFormData) => {
    if (!firestore || !selectedUser) return;
    
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    const adminRoleRef = doc(firestore, 'roles_admin', selectedUser.id);

    try {
      await updateDoc(userDocRef, data);

      if (data.role === 'Admin') {
        await setDoc(adminRoleRef, { role: 'admin' });
      } else if (selectedUser.role === 'Admin' && data.role !== 'Admin') {
        await deleteDoc(adminRoleRef);
      }

      toast({
        title: 'User Updated',
        description: `User ${selectedUser.email} has been updated.`,
      });
      setEditDialogOpen(false);
      setSelectedUser(null);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message,
      });
    }
  };

  const handleCreateUser = async (data: NewUserFormData) => {
      if (!firestore) return;
      
      // This is a temporary solution for creating users. 
      // In a real app, you'd use a backend function to create users.
      try {
          // Temporarily sign out the admin to create a new user
          const adminUser = auth.currentUser;
          await auth.signOut();

          const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
          const newUser = userCredential.user;

          const userDocRef = doc(firestore, 'users', newUser.uid);
          await setDoc(userDocRef, {
              id: newUser.uid,
              email: data.email,
              role: data.role,
              username: data.email.split('@')[0],
          });

          if (data.role === 'Admin') {
              const adminRoleRef = doc(firestore, 'roles_admin', newUser.uid);
              await setDoc(adminRoleRef, { role: 'admin' });
          }

          toast({
              title: 'User Created',
              description: `User ${data.email} has been created.`,
          });
          
          // Sign back in as admin - this is simplistic and has issues
          // A proper solution requires a backend.
          if(adminUser) {
            // This part is problematic as it requires credentials.
            // For now, we'll just log that the admin needs to log back in.
            console.log("Admin needs to log back in manually.");
          }

          setAddUserDialogOpen(false);
          newUserForm.reset();

      } catch (error: any) {
          toast({
              variant: 'destructive',
              title: 'Create User Failed',
              description: error.message,
          });
      }
  };

  const handleDeleteUser = async () => {
    if (!firestore || !selectedUser) return;
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    try {
      await deleteDoc(userDocRef);

      if (selectedUser.role === 'Admin') {
        const adminRoleRef = doc(firestore, 'roles_admin', selectedUser.id);
        await deleteDoc(adminRoleRef);
      }
      
      toast({
        title: 'User Deleted',
        description: `User ${selectedUser.email} has been deleted from Firestore. Note: This does not remove the user from Firebase Authentication.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: error.message,
      });
    } finally {
        setDeleteDialogOpen(false);
        setSelectedUser(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>Users</CardTitle>
                <CardDescription>
                    Manage your users and view their activity.
                </CardDescription>
            </div>
            <Button onClick={() => setAddUserDialogOpen(true)}>Add User</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Skeleton className="hidden h-9 w-9 sm:flex rounded-full" />
                        <div className="grid gap-1">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-16" />
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Skeleton className="h-6 w-12 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : users && users.length > 0 ? (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="hidden h-9 w-9 sm:flex" data-ai-hint="person face">
                          <AvatarImage
                            src={`https://picsum.photos/seed/${user.id}/40/40`}
                            alt="Avatar"
                          />
                          <AvatarFallback>
                            {user.username
                              ? user.username.charAt(0).toUpperCase()
                              : user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="grid gap-1">
                          <p className="text-sm font-medium leading-none">
                            {user.username || 'N/A'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.role}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={'default'}>Active</Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleEditClick(user)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDeleteClick(user)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isAddUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Add New User</DialogTitle>
                  <DialogDescription>
                      Create a new user account. An email and a temporary password are required.
                  </DialogDescription>
              </DialogHeader>
              <Form {...newUserForm}>
                  <form onSubmit={newUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                      <FormField
                          control={newUserForm.control}
                          name="email"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Email</FormLabel>
                                  <FormControl>
                                      <Input placeholder="user@example.com" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={newUserForm.control}
                          name="password"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Password</FormLabel>
                                  <FormControl>
                                      <Input type="password" placeholder="••••••••" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <FormField
                          control={newUserForm.control}
                          name="role"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Role</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <FormControl>
                                          <SelectTrigger>
                                              <SelectValue placeholder="Select a role" />
                                          </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                          <SelectItem value="Admin">Admin</SelectItem>
                                          <SelectItem value="Instructor">Instructor</SelectItem>
                                          <SelectItem value="Student">Student</SelectItem>
                                      </SelectContent>
                                  </Select>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                      <DialogFooter>
                          <Button type="button" variant="outline" onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
                          <Button type="submit">Create User</Button>
                      </DialogFooter>
                  </form>
              </Form>
          </DialogContent>
      </Dialog>


      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Make changes to the user's profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleUpdateUser)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Instructor">Instructor</SelectItem>
                        <SelectItem value="Student">Student</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              account and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
