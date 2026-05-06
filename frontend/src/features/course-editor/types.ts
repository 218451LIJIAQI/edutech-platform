import type { CourseType } from '@/types';

export type CourseEditorTabId = 'basic' | 'lessons' | 'packages' | 'materials';

export type MediaSourceType = 'upload' | 'link';
export type MaterialSourceType = MediaSourceType;

export type NumericFormValue = number | string;

export interface CourseFormData {
  title: string;
  description: string;
  category: string;
  courseType: CourseType;
  thumbnail?: string;
  previewVideoUrl?: string;
}

export interface PackageFormData {
  name: string;
  description: string;
  price: NumericFormValue;
  discount: NumericFormValue;
  duration: NumericFormValue;
  maxStudents: NumericFormValue;
}

export interface MaterialFormData {
  title: string;
  description: string;
  isDownloadable: boolean;
}

export type PendingDeleteKind = 'lesson' | 'package' | 'material';

export interface PendingDeleteTarget {
  kind: PendingDeleteKind;
  id: string;
  label: string;
}

export type PendingDeleteItem = PendingDeleteTarget | null;
