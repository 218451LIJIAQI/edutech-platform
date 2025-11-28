import { LessonType, CourseType } from '@prisma/client';
import prisma from '../config/database';
import {
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '../utils/errors';

/**
 * Course Service
 * Handles course and lesson management
 */
class CourseService {
  /**
   * Get all published courses with filters
   */
  async getAllCourses(filters: {
    category?: string;
    teacherId?: string;
    search?: string;
    courseType?: CourseType;
    minRating?: number;
    minPrice?: number;
    maxPrice?: number;
    sortBy?: 'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC';
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
  }) {
    const {
      category,
      teacherId,
      search,
      courseType,
      minRating,
      minPrice,
      maxPrice,
      sortBy = 'NEWEST',
      sortOrder = 'desc',
      page = 1,
      limit = 12,
    } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isPublished: true,
    };

    if (category) {
      // Prisma does not support mode on equals; use exact match for category
      where.category = { equals: category };
    }

    if (teacherId) {
      // Support both teacherProfileId and teacher userId filters
      where.OR = [
        { teacherProfileId: teacherId },
        { teacherProfile: { is: { userId: teacherId } } },
        ...(where.OR || []),
      ];
    }

    if (courseType) {
      where.courseType = courseType;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        ...(where.OR || []),
      ];
    }

    if (minRating !== undefined) {
      // Proper relational filter for nested field
      where.teacherProfile = { is: { averageRating: { gte: minRating } } };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.packages = {
        some: {
          ...(minPrice !== undefined ? { finalPrice: { gte: minPrice } } : {}),
          ...(maxPrice !== undefined ? { finalPrice: { lte: maxPrice } } : {}),
        },
      };
    }

    // Map sort to Prisma orderBy where possible
    let orderBy: any = undefined;
    if (sortBy === 'NEWEST') {
      orderBy = { createdAt: sortOrder };
    } else if (sortBy === 'RATING') {
      orderBy = { teacherProfile: { averageRating: 'desc' } }; // rating is always DESC
    } else if (sortBy === 'POPULARITY') {
      orderBy = { teacherProfile: { totalStudents: 'desc' } }; // popularity proxy
    }

    // Fetch data
    const [rawCourses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: limit,
        include: {
          teacherProfile: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  avatar: true,
                },
              },
            },
          },
          packages: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              finalPrice: true,
              discount: true,
            },
          },
          _count: {
            select: {
              lessons: true,
              materials: true,
            },
          },
        },
        ...(orderBy ? { orderBy } : { orderBy: { createdAt: 'desc' } }),
      }),
      prisma.course.count({ where }),
    ]);

    // Compute min package price and sort by price if requested (in-memory for current page)
    const courses = rawCourses.map((c) => ({
      ...c,
      minPackagePrice: c.packages.length
        ? Math.min(...c.packages.map((p) => p.finalPrice))
        : 0,
    }));

    if (sortBy === 'PRICE_ASC') {
      courses.sort((a, b) => (a.minPackagePrice || 0) - (b.minPackagePrice || 0));
    } else if (sortBy === 'PRICE_DESC') {
      courses.sort((a, b) => (b.minPackagePrice || 0) - (a.minPackagePrice || 0));
    }

    // Strip helper field before returning
    const sanitized = courses.map(({ minPackagePrice, ...rest }) => rest);

    return {
      courses: sanitized,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get course by ID
   */
  async getCourseById(courseId: string, userId?: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacherProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        lessons: {
          orderBy: { orderIndex: 'asc' },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            duration: true,
            orderIndex: true,
            isFree: true,
            videoUrl: true, // fetch and sanitize below
          },
        },
        packages: {
          where: { isActive: true },
        },
        materials: {
          select: {
            id: true,
            title: true,
            description: true,
            fileType: true,
            fileSize: true,
            isDownloadable: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    // Check if user has enrolled in this course
    let isEnrolled = false;
    if (userId) {
      const enrollment = await prisma.enrollment.findFirst({
        where: {
          userId,
          package: {
            courseId: course.id,
          },
          isActive: true,
        },
      });
      isEnrolled = !!enrollment;
    }

    // Sanitize lessons' videoUrl visibility: only expose for free lessons or when enrolled
    const lessons = course.lessons.map((l) => ({
      ...l,
      videoUrl: l.isFree || isEnrolled ? l.videoUrl : undefined,
    }));

    return {
      ...course,
      lessons,
      isEnrolled,
    };
  }

  /**
   * Create a new course (Teacher only)
   */
  async createCourse(
    userId: string,
    data: {
      title: string;
      description: string;
      category: string;
      courseType?: CourseType;
      thumbnail?: string;
      previewVideoUrl?: string;
    }
  ) {
    // Get teacher profile
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    const course = await prisma.course.create({
      data: {
        teacherProfileId: teacherProfile.id,
        ...data,
      },
      include: {
        teacherProfile: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    return course;
  }

  /**
   * Update course (Teacher only)
   */
  async updateCourse(
    userId: string,
    courseId: string,
    data: {
      title?: string;
      description?: string;
      category?: string;
      courseType?: CourseType;
      thumbnail?: string;
      previewVideoUrl?: string;
      isPublished?: boolean;
    }
  ) {
    await this.validateCourseOwnership(userId, courseId);

    const updated = await prisma.course.update({
      where: { id: courseId },
      data,
    });

    return updated;
  }

  /**
   * Delete course (Teacher only)
   */
  async deleteCourse(userId: string, courseId: string) {
    await this.validateCourseOwnership(userId, courseId);

    // Check if course has active enrollments
    const enrollmentCount = await prisma.enrollment.count({
      where: {
        package: {
          courseId,
        },
        isActive: true,
      },
    });

    if (enrollmentCount > 0) {
      throw new ValidationError(
        'Cannot delete course with active enrollments'
      );
    }

    await prisma.course.delete({
      where: { id: courseId },
    });

    return { message: 'Course deleted successfully' };
  }

  /**
   * Create lesson in a course
   */
  async createLesson(
    userId: string,
    courseId: string,
    data: {
      title: string;
      description?: string;
      type: LessonType;
      duration?: number;
      videoUrl?: string;
      isFree?: boolean;
    }
  ) {
    await this.validateCourseOwnership(userId, courseId);

    // Get the next order index
    const lastLesson = await prisma.lesson.findFirst({
      where: { courseId },
      orderBy: { orderIndex: 'desc' },
    });

    const orderIndex = lastLesson ? lastLesson.orderIndex + 1 : 1;

    const lesson = await prisma.lesson.create({
      data: {
        courseId,
        orderIndex,
        ...data,
      },
    });

    return lesson;
  }

  /**
   * Update lesson
   */
  async updateLesson(
    userId: string,
    lessonId: string,
    data: {
      title?: string;
      description?: string;
      type?: LessonType;
      duration?: number;
      videoUrl?: string;
      isFree?: boolean;
      orderIndex?: number;
    }
  ) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    await this.validateCourseOwnership(userId, lesson.courseId);

    const updated = await prisma.lesson.update({
      where: { id: lessonId },
      data,
    });

    return updated;
  }

  /**
   * Delete lesson
   */
  async deleteLesson(userId: string, lessonId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: { course: true },
    });

    if (!lesson) {
      throw new NotFoundError('Lesson not found');
    }

    await this.validateCourseOwnership(userId, lesson.courseId);

    await prisma.lesson.delete({
      where: { id: lessonId },
    });

    return { message: 'Lesson deleted successfully' };
  }

  /**
   * Create lesson package
   */
  async createPackage(
    userId: string,
    courseId: string,
    data: {
      name: string;
      description?: string;
      price: number;
      discount?: number;
      duration?: number;
      maxStudents?: number;
      features?: any;
    }
  ) {
    await this.validateCourseOwnership(userId, courseId);

    const price = data.price;
    const discount = data.discount || 0;
    const finalPrice = Math.max(0, price - discount);

    const lessonPackage = await prisma.lessonPackage.create({
      data: {
        courseId,
        ...data,
        discount,
        finalPrice,
      },
    });

    return lessonPackage;
  }

  /**
   * Update lesson package
   */
  async updatePackage(
    userId: string,
    packageId: string,
    data: {
      name?: string;
      description?: string;
      price?: number;
      discount?: number;
      duration?: number;
      maxStudents?: number;
      features?: any;
      isActive?: boolean;
    }
  ) {
    const lessonPackage = await prisma.lessonPackage.findUnique({
      where: { id: packageId },
      include: { course: true },
    });

    if (!lessonPackage) {
      throw new NotFoundError('Package not found');
    }

    await this.validateCourseOwnership(userId, lessonPackage.courseId);

    // Recalculate final price if price or discount changed
    let finalPrice = lessonPackage.finalPrice;
    if (data.price !== undefined || data.discount !== undefined) {
      const price = data.price !== undefined ? data.price : lessonPackage.price;
      const discount = data.discount !== undefined ? data.discount : lessonPackage.discount || 0;
      finalPrice = Math.max(0, price - discount);
    }

    const updated = await prisma.lessonPackage.update({
      where: { id: packageId },
      data: {
        ...data,
        finalPrice,
      },
    });

    return updated;
  }

  /**
   * Delete lesson package
   */
  async deletePackage(userId: string, packageId: string) {
    const lessonPackage = await prisma.lessonPackage.findUnique({
      where: { id: packageId },
      include: { course: true },
    });

    if (!lessonPackage) {
      throw new NotFoundError('Package not found');
    }

    await this.validateCourseOwnership(userId, lessonPackage.courseId);

    // Check if package has enrollments
    const enrollmentCount = await prisma.enrollment.count({
      where: { packageId, isActive: true },
    });

    if (enrollmentCount > 0) {
      throw new ValidationError(
        'Cannot delete package with active enrollments'
      );
    }

    await prisma.lessonPackage.delete({
      where: { id: packageId },
    });

    return { message: 'Package deleted successfully' };
  }

  /**
   * Upload material to course
   */
  async uploadMaterial(
    userId: string,
    courseId: string,
    data: {
      title: string;
      description?: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
      isDownloadable?: boolean;
    }
  ) {
    await this.validateCourseOwnership(userId, courseId);

    const material = await prisma.material.create({
      data: {
        courseId,
        ...data,
      },
    });

    return material;
  }

  /**
   * Update material
   */
  async updateMaterial(
    userId: string,
    materialId: string,
    data: {
      title?: string;
      description?: string;
      fileUrl?: string;
      fileType?: string;
      fileSize?: number;
      isDownloadable?: boolean;
    }
  ) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: { course: true },
    });

    if (!material) {
      throw new NotFoundError('Material not found');
    }

    await this.validateCourseOwnership(userId, material.courseId);

    const updated = await prisma.material.update({
      where: { id: materialId },
      data,
    });

    return updated;
  }

  /**
   * Delete material
   */
  async deleteMaterial(userId: string, materialId: string) {
    const material = await prisma.material.findUnique({
      where: { id: materialId },
      include: { course: true },
    });

    if (!material) {
      throw new NotFoundError('Material not found');
    }

    await this.validateCourseOwnership(userId, material.courseId);

    await prisma.material.delete({
      where: { id: materialId },
    });

    return { message: 'Material deleted successfully' };
  }

  /**
   * Get teacher's own courses
   */
  async getTeacherCourses(userId: string) {
    const teacherProfile = await prisma.teacherProfile.findUnique({
      where: { userId },
    });

    if (!teacherProfile) {
      throw new NotFoundError('Teacher profile not found');
    }

    const courses = await prisma.course.findMany({
      where: {
        teacherProfileId: teacherProfile.id,
      },
      include: {
        teacherProfile: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
        },
        packages: {
          select: {
            id: true,
            name: true,
            finalPrice: true,
            discount: true,
          },
        },
        lessons: {
          select: {
            id: true,
            title: true,
            type: true,
            duration: true,
          },
        },
        materials: {
          select: {
            id: true,
            title: true,
          },
        },
        _count: {
          select: {
            lessons: true,
            materials: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Add enrollment counts for each course
    const coursesWithEnrollments = await Promise.all(
      courses.map(async (course) => {
        const enrollmentCount = await prisma.enrollment.count({
          where: {
            package: {
              courseId: course.id,
            },
          },
        });

        return {
          ...course,
          _count: {
            ...course._count,
            enrollments: enrollmentCount,
          },
        };
      })
    );

    return coursesWithEnrollments;
  }

  /**
   * Get course categories
   */
  async getCategories() {
    const courses = await prisma.course.findMany({
      where: { isPublished: true },
      select: { category: true },
      distinct: ['category'],
    });

    return courses.map((c) => c.category);
  }

  /**
   * Validate course ownership
   */
  private async validateCourseOwnership(userId: string, courseId: string) {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacherProfile: true,
      },
    });

    if (!course) {
      throw new NotFoundError('Course not found');
    }

    if (course.teacherProfile.userId !== userId) {
      throw new AuthorizationError('You can only modify your own courses');
    }

    return course;
  }
}

export default new CourseService();
