import type { NavItem } from '@/lib/types';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  FileQuestion,
  GitMerge,
  Calendar,
  GraduationCap,
  Award,
  BarChart3,
  MessageSquare,
  Settings,
  User,
  Wallet,
  ShoppingCart,
  CalendarClock,
  Library,
  Target,
  Home,
  Upload,
} from 'lucide-react';


type Role = 'Admin' | 'Instructor' | 'Student';
export type MenuCategory = {
  label: string;
  items: NavItem[];
  roles: Role[];
};

const allMenuItems: MenuCategory[] = [
  // Main Navigation - Always visible first
  {
    label: 'Main',
    roles: ['Admin', 'Instructor', 'Student'],
    items: [
      {
        label: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['Admin', 'Instructor', 'Student'],
      },
      {
        label: 'Marketplace',
        href: '/marketplace',
        icon: ShoppingCart,
        roles: ['Admin', 'Instructor', 'Student'],
      },
    ]
  },

  // Learning - Student focused
  {
    label: 'Learning',
    roles: ['Admin', 'Instructor', 'Student'],
    items: [
      {
        label: 'My Courses',
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
        icon: Target,
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

  // Schedule & Bookings
  {
    label: 'Schedule',
    roles: ['Admin', 'Instructor', 'Student'],
    items: [
      {
        label: 'My Schedule',
        href: '/schedule',
        icon: Calendar,
        roles: ['Admin', 'Instructor', 'Student'],
      },
      {
        label: 'My Bookings',
        href: '/my-bookings',
        icon: CalendarClock,
        roles: ['Admin', 'Student'],
      },
    ]
  },

  // Admin & Management
  {
    label: 'Management',
    roles: ['Admin', 'Instructor'],
    items: [
      {
        label: 'Users',
        href: '/users',
        icon: Users,
        roles: ['Admin'],
      },
      {
        label: 'Master Courses',
        href: '/master-courses',
        icon: Library,
        roles: ['Admin', 'Instructor'],
      },
      {
        label: 'Exam Schedules',
        href: '/admin/schedules',
        icon: CalendarClock,
        roles: ['Admin', 'Instructor'],
      },
      {
        label: 'Analytics',
        href: '/reports',
        icon: BarChart3,
        roles: ['Admin'],
      },
      {
        label: 'Import Data',
        href: '/admin/import',
        icon: Upload,
        roles: ['Admin'],
      },
      {
        label: 'Manage Exams',
        href: '/admin/exams',
        icon: FileQuestion,
        roles: ['Admin', 'Instructor'],
      },
    ]
  },

  // Community & Account
  {
    label: 'Account',
    roles: ['Admin', 'Instructor', 'Student'],
    items: [
      {
        label: 'Profile',
        href: '/profile',
        icon: User,
        roles: ['Admin', 'Instructor', 'Student'],
      },
      {
        label: 'Wallet',
        href: '/billing',
        icon: Wallet,
        roles: ['Admin', 'Student'],
      },
      {
        label: 'Community',
        href: '/community',
        icon: MessageSquare,
        roles: ['Admin', 'Instructor', 'Student'],
      },
    ]
  }
];

export const getMenuItems = (role?: string): MenuCategory[] => {
  if (!role) {
    return [];
  }

  // Normalize role to Title Case to match the defined types
  const normalizedRole = role.charAt(0).toUpperCase() + role.slice(1).toLowerCase() as Role;

  // Filter categories based on role
  const userCategories = allMenuItems.filter(category => category.roles.includes(normalizedRole));

  // Filter items within each category based on role
  return userCategories.map(category => ({
    ...category,
    items: category.items.filter(item => item.roles?.includes(normalizedRole))
  })).filter(category => category.items.length > 0); // Only return categories that have items for the user's role
};


export const settingsItem: NavItem = {
  label: 'Settings',
  href: '/settings',
  icon: Settings,
  roles: ['Admin', 'Instructor', 'Student'],
}
