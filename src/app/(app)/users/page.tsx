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
import { Button, buttonVariants } from '@/components/ui/button';
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
import { useCollection, useFirestore, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, doc, updateDoc, deleteDoc, setDoc, writeBatch } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

const userSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  role: z.enum(['Admin', 'Instructor', 'Student']),
});

const newUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    role: z.enum(['Admin', 'Instructor', 'Student']),
    username: z.string().min(1, 'Username is required'),
});

type UserFormData = z.infer<typeof userSchema>;
type NewUserFormData = z.infer<typeof newUserSchema>;


export default function UsersPage() {
  const firestore = useFirestore();
  const auth = useAuth();
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
          username: '',
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
    
    const batch = writeBatch(firestore);
    const userDocRef = doc(firestore, 'users', selectedUser.id);
    const adminRoleRef = doc(firestore, 'roles_admin', selectedUser.id);

    try {
      batch.update(userDocRef, { role: data.role, username: data.username });

      if (data.role === 'Admin') {
        batch.set(adminRoleRef, { role: 'admin' });
      } else if (selectedUser.role === 'Admin' && data.role !== 'Admin') {
        batch.delete(adminRoleRef);
      }

      await batch.commit();

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
    if (!firestore || !auth) return;

    // This is a workaround for client-side user creation.
    // A backend function is recommended for production environments
    // to avoid admin re-authentication issues.
    // We create a temporary user on the client, then the admin can complete setup.
    // For this demo, we'll proceed, but it might fail if the admin's session is old.
    try {
        const tempAuth = auth; // This might need a re-authenticated instance in a real app.
        
        // We can't create a user and get the UID without actually creating an auth record.
        // In a real app, this should be a server-side (Cloud Function) operation
        // that can create the user and the Firestore documents atomically.
        
        // For this client-side implementation, we show a toast and acknowledge the limitation.
        toast({
            title: 'Manual User Creation Required',
            description: "For security, please create the user in the Firebase Authentication console, then add their details here.",
            duration: 9000,
        });
        
        // This is a placeholder for where a server-side call would go.
        console.log("Attempting to create user client-side (may require re-auth):", data);

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
    const adminRoleRef = doc(firestore, 'roles_admin', selectedUser.id);
    const batch = writeBatch(firestore);

    try {
      // NOTE: Deleting a user from Authentication is a privileged operation
      // and typically requires a backend function (e.g., Cloud Functions)
      // to be called by an admin. This implementation only deletes the
      // Firestore document.
      batch.delete(userDocRef);

      if (selectedUser.role === 'Admin') {
        batch.delete(adminRoleRef);
      }

      await batch.commit();
      
      toast({
        title: 'User Document Deleted',
        description: `User ${selectedUser.email}'s data has been deleted from Firestore. The Auth record still exists.`,
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
                      <Badge variant={'outline'}>Active</Badge>
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
                          <DropdownMenuItem onClick={() => handleDeleteClick(user)} className="text-red-600">Delete</DropdownMenuItem>
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
                      Fill in the details to create a new user account.
                  </DialogDescription>
              </DialogHeader>
              <Form {...newUserForm}>
                  <form onSubmit={newUserForm.handleSubmit(handleCreateUser)} className="space-y-4">
                      <FormField
                          control={newUserForm.control}
                          name="username"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Username</FormLabel>
                                  <FormControl>
                                      <Input placeholder="john.doe" {...field} />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
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
              document from Firestore. To fully delete the user, you must also remove them from Firebase Authentication using a backend function.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className={buttonVariants({ variant: "destructive" })}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
