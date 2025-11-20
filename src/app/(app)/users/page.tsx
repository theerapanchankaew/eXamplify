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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
  } from '@/components/ui/dropdown-menu'

const users = [
    {
        name: 'Liam Johnson',
        email: 'liam@example.com',
        role: 'Student',
        status: 'Active',
        avatarUrl: 'https://picsum.photos/seed/u1/40/40',
        initials: 'LJ',
        lastLogin: '2023-07-01T10:00:00Z',
    },
    {
        name: 'Olivia Smith',
        email: 'olivia@example.com',
        role: 'Admin',
        status: 'Active',
        avatarUrl: 'https://picsum.photos/seed/u2/40/40',
        initials: 'OS',
        lastLogin: '2023-07-02T12:30:00Z',
    },
    {
        name: 'Noah Williams',
        email: 'noah@example.com',
        role: 'Instructor',
        status: 'Inactive',
        avatarUrl: 'https://picsum.photos/seed/u3/40/40',
        initials: 'NW',
        lastLogin: '2023-06-15T14:00:00Z',
    },
    {
        name: 'Emma Brown',
        email: 'emma@example.com',
        role: 'Student',
        status: 'Active',
        avatarUrl: 'https://picsum.photos/seed/u4/40/40',
        initials: 'EB',
        lastLogin: '2023-07-03T09:00:00Z',
    },
    {
        name: 'James Jones',
        email: 'james@example.com',
        role: 'Instructor',
        status: 'Active',
        avatarUrl: 'https://picsum.photos/seed/u5/40/40',
        initials: 'JJ',
        lastLogin: '2023-07-03T11:00:00Z',
    },
]

export default function UsersPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>Manage your users and view their activity.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="hidden md:table-cell">Last Login</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map(user => (
              <TableRow key={user.email}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="hidden h-9 w-9 sm:flex" data-ai-hint="person face">
                      <AvatarImage src={user.avatarUrl} alt="Avatar" />
                      <AvatarFallback>{user.initials}</AvatarFallback>
                    </Avatar>
                    <div className="grid gap-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={user.status === 'Active' ? 'default' : 'secondary'}>{user.status}</Badge>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                    {new Date(user.lastLogin).toLocaleDateString()}
                </TableCell>
                <TableCell>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
