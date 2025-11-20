import type { NavItem } from '@/lib/types';
import {
  LayoutGrid,
  Users,
  BookOpen,
  FileQuestion,
  GitMerge,
  Calendar,
  GraduationCap,
  Award,
  BarChart2,
  MessageSquare,
  Settings,
  User,
  CreditCard,
} from 'lucide-react';

type Role = 'Admin' | 'Instructor' | 'Student';

const allMenuItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutGrid,
    roles: ['Admin', 'Instructor', 'Student'],
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    roles: ['Admin'],
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
    roles: ['Admin', 'Instructor', 'Student'],
  },
  {
    label: 'Courses',
    href: '/courses',
    icon: BookOpen,
    roles: ['Admin', 'Instructor', 'Student'],
  },
  {
    label: 'Exams',
    href: '/exams',
    icon: FileQuestion,
    roles: ['Admin', 'Instructor', 'Student'],
  },
  {
    label: 'Roadmap',
    href: '/roadmap',
    icon: GitMerge,
    roles: ['Admin', 'Student'],
  },
  {
    label: 'Schedule',
    href: '/schedule',
    icon: Calendar,
    roles: ['Admin', 'Instructor', 'Student'],
  },
  {
    label: 'Master Courses',
    href: '/master-courses',
    icon: GraduationCap,
    roles: ['Admin', 'Instructor'],
  },
  {
    label: 'Certificates',
    href: '/certificates',
    icon: Award,
    roles: ['Admin', 'Student'],
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart2,
    roles: ['Admin'],
  },
  {
    label: 'Community',
    href: '/community',
    icon: MessageSquare,
    roles: ['Admin', 'Instructor', 'Student'],
  },
  {
    label: 'Billing',
    href: '/billing',
    icon: CreditCard,
    roles: ['Admin', 'Student'],
  },
];

export const getMenuItems = (role?: Role): NavItem[] => {
  if (!role) {
    return [];
  }
  return allMenuItems.filter(item => item.roles?.includes(role));
};


export const settingsItem: NavItem = {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['Admin', 'Instructor', 'Student'],
}
