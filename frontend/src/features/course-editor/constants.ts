import type { LucideIcon } from 'lucide-react';
import {
  DollarSign,
  FileText,
  PlayCircle,
  Radio,
  Sparkles,
  Upload,
  Video,
} from 'lucide-react';

import { CourseType } from '@/types';
import type { CourseEditorTabId } from './types';

export interface CourseEditorTab {
  id: CourseEditorTabId;
  label: string;
  icon: LucideIcon;
}

export const courseEditorTabs = [
  { id: 'basic', label: 'Basic Info', icon: FileText },
  { id: 'lessons', label: 'Lessons', icon: PlayCircle },
  { id: 'packages', label: 'Pricing', icon: DollarSign },
  { id: 'materials', label: 'Materials', icon: Upload },
] as const satisfies readonly CourseEditorTab[];

export const courseCategories = [
  'Programming',
  'Business',
  'Design',
  'Marketing',
  'Photography',
  'Music',
  'Language',
  'Other',
] as const;

export type CourseCategory = (typeof courseCategories)[number];

export const courseTypeOptions = [
  {
    value: CourseType.LIVE,
    label: 'Live Sessions',
    description: 'Real-time online classes with students.',
  },
  {
    value: CourseType.RECORDED,
    label: 'Recorded',
    description: 'Pre-recorded video lessons that students can watch anytime.',
  },
  {
    value: CourseType.HYBRID,
    label: 'Hybrid',
    description: 'A combination of live sessions and recorded learning content.',
  },
] as const;

export const courseTypeHighlights = [
  {
    icon: Radio,
    label: 'Live sessions',
    iconClassName: 'text-red-500',
  },
  {
    icon: Video,
    label: 'Recorded lessons',
    iconClassName: 'text-blue-500',
  },
  {
    icon: Sparkles,
    label: 'Mixed experience',
    iconClassName: 'text-purple-500',
  },
] as const satisfies readonly {
  icon: LucideIcon;
  label: string;
  iconClassName: string;
}[];