import type { Course } from '@/types';

export const getCourseLessonCount = (
  course?: Pick<Course, 'lessons' | '_count'> | null
): number => course?._count?.lessons ?? course?.lessons?.length ?? 0;

export const getCourseMaterialCount = (
  course?: Pick<Course, 'materials' | '_count'> | null
): number => course?._count?.materials ?? course?.materials?.length ?? 0;
