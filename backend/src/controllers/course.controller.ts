import { Request, Response } from 'express';
import { LessonType } from '@prisma/client';
import courseService from '../services/course.service';
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
    const { category, teacherId, search, minRating, maxPrice, page, limit } =
      req.query;

    const result = await courseService.getAllCourses({
      category: category as string,
      teacherId: teacherId as string,
      search: search as string,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice as string) : undefined,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
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
    const userId = req.user?.id;

    const course = await courseService.getCourseById(id, userId);

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
    const userId = req.user!.id;
    const { title, description, category, courseType, thumbnail, previewVideoUrl } = req.body;

    const course = await courseService.createCourse(userId, {
      title,
      description,
      category,
      courseType,
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
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, description, category, courseType, thumbnail, previewVideoUrl, isPublished } =
      req.body;

    const course = await courseService.updateCourse(userId, id, {
      title,
      description,
      category,
      courseType,
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
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await courseService.deleteCourse(userId, id);

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
    const userId = req.user!.id;
    const { id: courseId } = req.params;
    const { title, description, type, duration, videoUrl, isFree } = req.body;

    const lesson = await courseService.createLesson(userId, courseId, {
      title,
      description,
      type: type as LessonType,
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
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, description, type, duration, videoUrl, isFree, orderIndex } =
      req.body;

    const lesson = await courseService.updateLesson(userId, id, {
      title,
      description,
      type,
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
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await courseService.deleteLesson(userId, id);

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
    const userId = req.user!.id;
    const { id: courseId } = req.params;
    const {
      name,
      description,
      price,
      discount,
      duration,
      maxStudents,
      features,
    } = req.body;

    const lessonPackage = await courseService.createPackage(userId, courseId, {
      name,
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
    const userId = req.user!.id;
    const { id } = req.params;
    const {
      name,
      description,
      price,
      discount,
      duration,
      maxStudents,
      features,
      isActive,
    } = req.body;

    const lessonPackage = await courseService.updatePackage(userId, id, {
      name,
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
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await courseService.deletePackage(userId, id);

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
    const userId = req.user!.id;
    const { id: courseId } = req.params;
    const { title, description, fileUrl, fileType, fileSize, isDownloadable } =
      req.body;

    const material = await courseService.uploadMaterial(userId, courseId, {
      title,
      description,
      fileUrl,
      fileType,
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
    const userId = req.user!.id;
    const { id } = req.params;
    const { title, description, fileUrl, fileType, fileSize, isDownloadable } =
      req.body;

    const material = await courseService.updateMaterial(userId, id, {
      title,
      description,
      fileUrl,
      fileType,
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
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await courseService.deleteMaterial(userId, id);

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
    const userId = req.user!.id;

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
}

export default new CourseController();

