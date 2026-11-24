import { VerificationStatus } from "@prisma/client";
import prisma from "../../config/database";
import { NotFoundError } from "../../utils/errors";
import { ensureCourseCanBeSafelyDeleted } from "../course.service";
import { attachEnrollmentCountsToCourses } from "../course/course-service-helpers";
import {
  adminCourseListInclude,
  adminVerificationListInclude,
  buildAdminCourseWhere,
  buildAdminVerificationWhere,
} from "./admin-user-helpers";
import { buildPaginationMeta, normalizePagination } from "../shared/pagination";

export const getAllAdminCourses = async (
  filters: {
    isPublished?: boolean;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {},
) => {
  const { isPublished, category, search, page = 1, limit = 20 } = filters;
  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });
  const where = buildAdminCourseWhere({ isPublished, category, search });

  const [rawCourses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: adminCourseListInclude,
      orderBy: { createdAt: "desc" },
    }),
    prisma.course.count({ where }),
  ]);

  const courses = await attachEnrollmentCountsToCourses(rawCourses);

  return {
    courses,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};

export const updateAdminCourseStatus = async (
  courseId: string,
  isPublished: boolean,
) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  return prisma.course.update({
    where: { id: courseId },
    data: { isPublished },
  });
};

export const deleteAdminCourse = async (courseId: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });

  if (!course) {
    throw new NotFoundError("Course not found");
  }

  await ensureCourseCanBeSafelyDeleted(courseId);
  await prisma.course.delete({ where: { id: courseId } });

  return { message: "Course deleted successfully" };
};

export const getAllAdminVerifications = async (
  filters: {
    status?: VerificationStatus;
    page?: number;
    limit?: number;
  } = {},
) => {
  const { status, page = 1, limit = 20 } = filters;
  const pagination = normalizePagination(page, limit, {
    defaultLimit: 20,
    maxLimit: 100,
  });
  const where = buildAdminVerificationWhere(status);

  const [verifications, total] = await Promise.all([
    prisma.teacherVerification.findMany({
      where,
      skip: pagination.skip,
      take: pagination.limit,
      include: adminVerificationListInclude,
      orderBy: { submittedAt: "desc" },
    }),
    prisma.teacherVerification.count({ where }),
  ]);

  return {
    verifications,
    pagination: buildPaginationMeta(total, pagination.page, pagination.limit),
  };
};
