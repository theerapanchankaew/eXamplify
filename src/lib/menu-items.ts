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
  Building,
} from 'lucide-react';

type Role = 'Admin' | 'Instructor' | 'Student';
export type MenuCategory = {
  label: string;
  items: NavItem[];
  roles: Role[];
};

const allMenuItems: MenuCategory[] = [
    {
        label: 'Management',
        roles: ['Admin'],
        items: [
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
                label: 'Reports',
                href: '/reports',
                icon: BarChart2,
                roles: ['Admin'],
            },
        ]
    },
    {
        label: 'Content',
        roles: ['Admin', 'Instructor'],
        items: [
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
                label: 'Master Courses',
                href: '/master-courses',
                icon: GraduationCap,
                roles: ['Admin', 'Instructor'],
              },
        ]
    },
    {
        label: 'Student Tools',
        roles: ['Admin', 'Student'],
        items: [
            {
                label: 'Roadmap',
                href: '/roadmap',
                icon: GitMerge,
                roles: ['Admin', 'Student'],
              },
              {
                label: 'Certificates',
                href: '/certificates',
                icon: Award,
                roles: ['Admin', 'Student'],
              },
        ]
    },
    {
        label: 'General',
        roles: ['Admin', 'Instructor', 'Student'],
        items: [
            {
                label: 'Profile',
                href: '/profile',
                icon: User,
                roles: ['Admin', 'Instructor', 'Student'],
            },
            {
                label: 'Schedule',
                href: '/schedule',
                icon: Calendar,
                roles: ['Admin', 'Instructor', 'Student'],
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
        ]
    }
];

export const getMenuItems = (role?: Role): MenuCategory[] => {
  if (!role) {
    return [];
  }
  
  // Filter categories based on role
  const userCategories = allMenuItems.filter(category => category.roles.includes(role));

  // Filter items within each category based on role
  return userCategories.map(category => ({
    ...category,
    items: category.items.filter(item => item.roles?.includes(role))
  })).filter(category => category.items.length > 0); // Only return categories that have items for the user's role
};


export const settingsItem: NavItem = {
    label: 'Settings',
    href: '/settings',
    icon: Settings,
    roles: ['Admin', 'Instructor', 'Student'],
}
