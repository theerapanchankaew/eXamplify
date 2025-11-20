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
} from 'lucide-react';

export const menuItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutGrid,
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
  },
    {
    label: 'Profile',
    href: '/profile',
    icon: User,
  },
  {
    label: 'Courses',
    href: '/courses',
    icon: BookOpen,
  },
  {
    label: 'Exams',
    href: '/exams',
    icon: FileQuestion,
  },
  {
    label: 'Roadmap',
    href: '/roadmap',
    icon: GitMerge,
  },
  {
    label: 'Schedule',
    href: '/schedule',
    icon: Calendar,
  },
  {
    label: 'Master Courses',
    href: '/master-courses',
    icon: GraduationCap,
  },
  {
    label: 'Certificates',
    href: '/certificates',
    icon: Award,
  },
  {
    label: 'Reports',
    href: '/reports',
    icon: BarChart2,
  },
  {
    label: 'Community',
    href: '/community',
    icon: MessageSquare,
  },
];

export const settingsItem: NavItem = {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
}
