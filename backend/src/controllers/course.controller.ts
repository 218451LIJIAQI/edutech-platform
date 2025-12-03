import { Request, Response } from 'express';
import { LessonType, CourseType } from '@prisma/client';
import courseService from '../services/course.service';
import notificationService from '../services/notification.service';
import prisma from '../config/database';
import { NotFoundError, AuthorizationError, BadRequestError } from '../utils/errors';
import asyncHandler from '../utils/asyncHandler';

/**
 * Course Controller
 * Handles HTTP requests for course-related endpoints
 */
class CourseController {
  /**
   * Get all courses
   * GET /api/courses
   */
  getAllCourses = asyncHandler(async (req: Request, res: Response) => {
    const {
      category,
      teacherId,
      search,
      courseType,
      minRating,
      minPrice,
      maxPrice,
      sortBy,
      sortOrder,
      page,
      limit,
    } = req.query as Record<string, string>;

    const parsedCourseType = courseType && Object.values(CourseType).includes(courseType as CourseType)
      ? (courseType as CourseType)
      : undefined;

    type SortBy = 'NEWEST' | 'RATING' | 'POPULARITY' | 'PRICE_ASC' | 'PRICE_DESC';
    const allowedSortBy: readonly SortBy[] = ['NEWEST', 'RATING', 'POPULARITY', 'PRICE_ASC', 'PRICE_DESC'] as const;
    const parsedSortBy: SortBy | undefined = 
      sortBy && typeof sortBy === 'string' && allowedSortBy.includes(sortBy as SortBy) 
        ? (sortBy as SortBy) 
        : undefined;
    const parsedSortOrder: 'asc' | 'desc' | undefined = sortOrder === 'asc' || sortOrder === 'desc' ? (sortOrder as 'asc' | 'desc') : undefined;

    const result = await courseService.getAllCourses({
      category,
      teacherId,
      search,
      courseType: parsedCourseType,
      minRating: minRating ? parseFloat(minRating) : undefined,
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      sortBy: parsedSortBy,
      sortOrder: parsedSortOrder,
      page: page ? Math.max(1, parseInt(page, 10) || 1) : undefined,
      limit: limit ? Math.min(Math.max(1, parseInt(limit, 10) || 10), 100) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get course by ID
   * GET /api/courses/:id
   */
  getCourseById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Course ID is required');
    }
    const userId = req.user?.id;

    const course = await courseService.getCourseById(id.trim(), userId || undefined);

    res.status(200).json({
      status: 'success',
      data: course,
    });
  });

  /**
   * Create new course
   * POST /api/courses
   */
  createCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { title, description, category, courseType, thumbnail, previewVideoUrl } = req.body as {
      title: string;
      description: string;
      category: string;
      courseType?: CourseType | string;
      thumbnail?: string;
      previewVideoUrl?: string;
    };

    if (!title || !description || !category) {
      throw new BadRequestError('title, description and category are required');
    }

    const parsedCourseType = courseType && Object.values(CourseType).includes(courseType as CourseType)
      ? (courseType as CourseType)
      : undefined;

    const course = await courseService.createCourse(userId, {
      title,
      description,
      category,
      courseType: parsedCourseType,
      thumbnail,
      previewVideoUrl,
    });

    res.status(201).json({
      status: 'success',
      message: 'Course created successfully',
      data: course,
    });
  });

  /**
   * Update course
   * PUT /api/courses/:id
   */
  updateCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Course ID is required');
    }
    const { title, description, category, courseType, thumbnail, previewVideoUrl, isPublished } =
      req.body as {
        title?: string;
        description?: string;
        category?: string;
        courseType?: CourseType | string;
        thumbnail?: string;
        previewVideoUrl?: string;
        isPublished?: boolean;
      };

    const parsedCourseType = courseType && Object.values(CourseType).includes(courseType as CourseType)
      ? (courseType as CourseType)
      : undefined;

    const course = await courseService.updateCourse(userId, id.trim(), {
      title,
      description,
      category,
      courseType: parsedCourseType,
      thumbnail,
      previewVideoUrl,
      isPublished,
    });

    res.status(200).json({
      status: 'success',
      message: 'Course updated successfully',
      data: course,
    });
  });

  /**
   * Delete course
   * DELETE /api/courses/:id
   */
  deleteCourse = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Course ID is required');
    }

    const result = await courseService.deleteCourse(userId, id.trim());

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });

  /**
   * Create lesson in course
   * POST /api/courses/:id/lessons
   */
  createLesson = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id: courseId } = req.params;
    if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
      throw new BadRequestError('Course ID is required');
    }
    const { title, description, type, duration, videoUrl, isFree } = req.body as {
      title: string;
      description?: string;
      type: LessonType | string;
      duration?: number;
      videoUrl?: string;
      isFree?: boolean;
    };

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new BadRequestError('Lesson title is required');
    }

    const validLessonTypes = Object.values(LessonType);
    const parsedType = type && validLessonTypes.includes(type as LessonType) 
      ? (type as LessonType) 
      : undefined;
    
    if (!parsedType) {
      throw new BadRequestError(`Invalid lesson type. Must be one of: ${validLessonTypes.join(', ')}`);
    }

    const lesson = await courseService.createLesson(userId, courseId.trim(), {
      title: title.trim(),
      description,
      type: parsedType,
      duration,
      videoUrl,
      isFree,
    });

    res.status(201).json({
      status: 'success',
      message: 'Lesson created successfully',
      data: lesson,
    });
  });

  /**
   * Update lesson
   * PUT /api/courses/lessons/:id
   */
  updateLesson = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Lesson ID is required');
    }
    const { title, description, type, duration, videoUrl, isFree, orderIndex } =
      req.body as {
        title?: string;
        description?: string;
        type?: LessonType | string;
        duration?: number;
        videoUrl?: string;
        isFree?: boolean;
        orderIndex?: number;
      };

    const validLessonTypes = Object.values(LessonType);
    const parsedType = type && validLessonTypes.includes(type as LessonType) 
      ? (type as LessonType) 
      : undefined;

    if (type !== undefined && !parsedType) {
      throw new BadRequestError(`Invalid lesson type. Must be one of: ${validLessonTypes.join(', ')}`);
    }

    const lesson = await courseService.updateLesson(userId, id.trim(), {
      title: title?.trim(),
      description,
      type: parsedType,
      duration,
      videoUrl,
      isFree,
      orderIndex,
    });

    res.status(200).json({
      status: 'success',
      message: 'Lesson updated successfully',
      data: lesson,
    });
  });

  /**
   * Delete lesson
   * DELETE /api/courses/lessons/:id
   */
  deleteLesson = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Lesson ID is required');
    }

    const result = await courseService.deleteLesson(userId, id.trim());

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });

  /**
   * Create lesson package
   * POST /api/courses/:id/packages
   */
  createPackage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id: courseId } = req.params;
    if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
      throw new BadRequestError('Course ID is required');
    }
    const {
      name,
      description,
      price,
      discount,
      duration,
      maxStudents,
      features,
    } = req.body as {
      name: string;
      description?: string;
      price: number;
      discount?: number;
      duration?: number;
      maxStudents?: number;
      features?: string[];
    };

    if (!name || typeof name !== 'string' || !name.trim()) {
      throw new BadRequestError('Package name is required');
    }

    if (typeof price !== 'number' || price < 0) {
      throw new BadRequestError('Price must be a non-negative number');
    }

    if (discount !== undefined && typeof discount !== 'number') {
      throw new BadRequestError('Discount must be a number');
    }

    const lessonPackage = await courseService.createPackage(userId, courseId.trim(), {
      name: name.trim(),
      description,
      price,
      discount,
      duration,
      maxStudents,
      features,
    });

    res.status(201).json({
      status: 'success',
      message: 'Package created successfully',
      data: lessonPackage,
    });
  });

  /**
   * Update lesson package
   * PUT /api/courses/packages/:id
   */
  updatePackage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Package ID is required');
    }
    const {
      name,
      description,
      price,
      discount,
      duration,
      maxStudents,
      features,
      isActive,
    } = req.body as {
      name?: string;
      description?: string;
      price?: number;
      discount?: number;
      duration?: number;
      maxStudents?: number;
      features?: string[];
      isActive?: boolean;
    };

    if (name !== undefined && (!name || typeof name !== 'string' || !name.trim())) {
      throw new BadRequestError('Package name cannot be empty');
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      throw new BadRequestError('Price must be a non-negative number');
    }

    if (discount !== undefined && typeof discount !== 'number') {
      throw new BadRequestError('Discount must be a number');
    }

    const lessonPackage = await courseService.updatePackage(userId, id.trim(), {
      name: name?.trim(),
      description,
      price,
      discount,
      duration,
      maxStudents,
      features,
      isActive,
    });

    res.status(200).json({
      status: 'success',
      message: 'Package updated successfully',
      data: lessonPackage,
    });
  });

  /**
   * Delete lesson package
   * DELETE /api/courses/packages/:id
   */
  deletePackage = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Package ID is required');
    }

    const result = await courseService.deletePackage(userId, id.trim());

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });

  /**
   * Upload material to course
   * POST /api/courses/:id/materials
   */
  uploadMaterial = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id: courseId } = req.params;
    if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
      throw new BadRequestError('Course ID is required');
    }
    const { title, description, fileUrl, fileType, fileSize, isDownloadable } =
      req.body as {
        title: string;
        description?: string;
        fileUrl: string;
        fileType: string;
        fileSize: number;
        isDownloadable?: boolean;
      };

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new BadRequestError('Material title is required');
    }

    if (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.trim()) {
      throw new BadRequestError('File URL is required');
    }

    if (!fileType || typeof fileType !== 'string' || !fileType.trim()) {
      throw new BadRequestError('File type is required');
    }

    if (typeof fileSize !== 'number' || fileSize < 0) {
      throw new BadRequestError('File size must be a non-negative number');
    }

    const material = await courseService.uploadMaterial(userId, courseId.trim(), {
      title: title.trim(),
      description,
      fileUrl: fileUrl.trim(),
      fileType: fileType.trim(),
      fileSize,
      isDownloadable,
    });

    res.status(201).json({
      status: 'success',
      message: 'Material uploaded successfully',
      data: material,
    });
  });

  /**
   * Update material
   * PUT /api/courses/materials/:id
   */
  updateMaterial = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Material ID is required');
    }
    const { title, description, fileUrl, fileType, fileSize, isDownloadable } =
      req.body as {
        title?: string;
        description?: string;
        fileUrl?: string;
        fileType?: string;
        fileSize?: number;
        isDownloadable?: boolean;
      };

    if (title !== undefined && (!title || typeof title !== 'string' || !title.trim())) {
      throw new BadRequestError('Material title cannot be empty');
    }

    if (fileUrl !== undefined && (!fileUrl || typeof fileUrl !== 'string' || !fileUrl.trim())) {
      throw new BadRequestError('File URL cannot be empty');
    }

    if (fileType !== undefined && (!fileType || typeof fileType !== 'string' || !fileType.trim())) {
      throw new BadRequestError('File type cannot be empty');
    }

    if (fileSize !== undefined && (typeof fileSize !== 'number' || fileSize < 0)) {
      throw new BadRequestError('File size must be a non-negative number');
    }

    const material = await courseService.updateMaterial(userId, id.trim(), {
      title: title?.trim(),
      description,
      fileUrl: fileUrl?.trim(),
      fileType: fileType?.trim(),
      fileSize,
      isDownloadable,
    });

    res.status(200).json({
      status: 'success',
      message: 'Material updated successfully',
      data: material,
    });
  });

  /**
   * Delete material
   * DELETE /api/courses/materials/:id
   */
  deleteMaterial = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;
    const { id } = req.params;
    if (!id || typeof id !== 'string' || !id.trim()) {
      throw new BadRequestError('Material ID is required');
    }

    const result = await courseService.deleteMaterial(userId, id.trim());

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });

  /**
   * Get teacher's own courses
   * GET /api/courses/my-courses
   */
  getMyCourses = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const userId = req.user.id;

    const courses = await courseService.getTeacherCourses(userId);

    res.status(200).json({
      status: 'success',
      data: courses,
    });
  });

  /**
   * Get course categories
   * GET /api/courses/categories/all
   */
  getCategories = asyncHandler(async (_req: Request, res: Response) => {
    const categories = await courseService.getCategories();

    res.status(200).json({
      status: 'success',
      data: categories,
    });
  });
  /**
   * Send course notification to all enrolled students (Teacher only)
   * POST /api/courses/:id/notifications
   */
  sendCourseNotification = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      throw new BadRequestError('Authentication required');
    }
    const teacherUserId = req.user.id;
    const { id: courseId } = req.params;
    if (!courseId || typeof courseId !== 'string' || !courseId.trim()) {
      throw new BadRequestError('Course ID is required');
    }
    const { title, message, type } = req.body as { title?: string; message?: string; type?: string };

    if (!title || typeof title !== 'string' || !title.trim()) {
      throw new BadRequestError('Title is required');
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new BadRequestError('Message is required');
    }

    // Verify course ownership
    const course = await prisma.course.findUnique({
      where: { id: courseId.trim() },
      include: {
        teacherProfile: { select: { userId: true } },
      },
    });

    if (!course) throw new NotFoundError('Course not found');
    if (course.teacherProfile.userId !== teacherUserId) {
      throw new AuthorizationError('You can only notify students of your own course');
    }

    // Find active enrollments (students) for this course
    const enrollments = await prisma.enrollment.findMany({
      where: {
        isActive: true,
        package: { courseId },
      },
      select: { userId: true },
    });

    const userIds = Array.from(new Set(enrollments.map((e) => e.userId)));

    if (userIds.length > 0) {
      await notificationService.createBulkNotifications(
        userIds,
        title.trim(),
        message.trim(),
        type?.trim() || 'COURSE_ANNOUNCEMENT'
      );
    }

    res.status(201).json({
      status: 'success',
      message: 'Notification sent',
      data: { recipients: userIds.length },
    });
  });
}

export default new CourseController();
