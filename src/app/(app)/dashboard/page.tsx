import {
  Activity,
  ArrowUpRight,
  BookOpen,
  CircleDollarSign,
  Users,
} from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OverviewChart } from '@/components/dashboard/overview-chart';

export default function DashboardPage() {
  return (
    <div className="flex min-h-screen w-full flex-col">
      <main className="flex flex-1 flex-col gap-4 md:gap-8">
        <div className="grid gap-4 md:grid-cols-2 md:gap-8 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <CircleDollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs text-muted-foreground">
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+2350</div>
              <p className="text-xs text-muted-foreground">
                +180.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Courses</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+120</div>
              <p className="text-xs text-muted-foreground">+19 from last month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Exams</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+573</div>
              <p className="text-xs text-muted-foreground">
                +201 since last hour
              </p>
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-4 md:gap-8 lg:grid-cols-2 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <OverviewChart />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Recent Enrollments</CardTitle>
              <CardDescription>
                26 enrollments this month.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="flex items-center">
                  <Avatar className="h-9 w-9" data-ai-hint="person face">
                    <AvatarImage
                      src="https://picsum.photos/seed/p1/40/40"
                      alt="Avatar"
                    />
                    <AvatarFallback>OM</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Olivia Martin
                    </p>
                    <p className="text-sm text-muted-foreground">
                      olivia.martin@email.com
                    </p>
                  </div>
                  <div className="ml-auto font-medium">+$1,999.00</div>
                </div>
                <div className="flex items-center">
                  <Avatar className="flex h-9 w-9 items-center justify-center space-y-0 border" data-ai-hint="person face">
                    <AvatarImage
                      src="https://picsum.photos/seed/p2/40/40"
                      alt="Avatar"
                    />
                    <AvatarFallback>JL</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Jackson Lee
                    </p>
                    <p className="text-sm text-muted-foreground">
                      jackson.lee@email.com
                    </p>
                  </div>
                  <div className="ml-auto font-medium">+$39.00</div>
                </div>
                <div className="flex items-center">
                  <Avatar className="h-9 w-9" data-ai-hint="person face">
                    <AvatarImage
                      src="https://picsum.photos/seed/p3/40/40"
                      alt="Avatar"
                    />
                    <AvatarFallback>IN</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Isabella Nguyen
                    </p>
                    <p className="text-sm text-muted-foreground">
                      isabella.nguyen@email.com
                    </p>
                  </div>
                  <div className="ml-auto font-medium">+$299.00</div>
                </div>
                <div className="flex items-center">
                  <Avatar className="h-9 w-9" data-ai-hint="person face">
                    <AvatarImage
                      src="https://picsum.photos/seed/p4/40/40"
                      alt="Avatar"
                    />
                    <AvatarFallback>WK</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      William Kim
                    </p>
                    <p className="text-sm text-muted-foreground">
                      will@email.com
                    </p>
                  </div>
                  <div className="ml-auto font-medium">+$99.00</div>
                </div>
                <div className="flex items-center">
                  <Avatar className="h-9 w-9" data-ai-hint="person face">
                    <AvatarImage
                      src="https://picsum.photos/seed/p5/40/40"
                      alt="Avatar"
                    />
                    <AvatarFallback>SD</AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      Sofia Davis
                    </p>
                    <p className="text-sm text-muted-foreground">
                      sofia.davis@email.com
                    </p>
                  </div>
                  <div className="ml-auto font-medium">+$39.00</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
