import { Request, Response } from 'express';
import { VerificationStatus } from '@prisma/client';
import teacherService from '../services/teacher.service';
import asyncHandler from '../utils/asyncHandler';

/**
 * Teacher Controller
 * Handles HTTP requests for teacher-related endpoints
 */
class TeacherController {
  /**
   * Get all teachers
   * GET /api/teachers
   */
  getAllTeachers = asyncHandler(async (req: Request, res: Response) => {
    const {
      isVerified,
      category,
      minRating,
      search,
      page,
      limit,
    } = req.query;

    const result = await teacherService.getAllTeachers({
      isVerified: isVerified === 'true',
      category: category as string,
      minRating: minRating ? parseFloat(minRating as string) : undefined,
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Get teacher by ID
   * GET /api/teachers/:id
   */
  getTeacherById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const teacher = await teacherService.getTeacherById(id);

    res.status(200).json({
      status: 'success',
      data: teacher,
    });
  });

  /**
   * Get current teacher's profile
   * GET /api/teachers/me/profile
   */
  getMyProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const teacher = await teacherService.getTeacherByUserId(userId);

    res.status(200).json({
      status: 'success',
      data: teacher,
    });
  });

  /**
   * Update teacher profile
   * PUT /api/teachers/me/profile
   */
  updateProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { bio, headline, hourlyRate } = req.body;

    const teacher = await teacherService.updateTeacherProfile(userId, {
      bio,
      headline,
      hourlyRate,
    });

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: teacher,
    });
  });

  /**
   * Add certification
   * POST /api/teachers/me/certifications
   */
  addCertification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { title, issuer, issueDate, expiryDate, credentialId, credentialUrl } =
      req.body;

    const certification = await teacherService.addCertification(userId, {
      title,
      issuer,
      issueDate: new Date(issueDate),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      credentialId,
      credentialUrl,
    });

    res.status(201).json({
      status: 'success',
      message: 'Certification added successfully',
      data: certification,
    });
  });

  /**
   * Delete certification
   * DELETE /api/teachers/me/certifications/:id
   */
  deleteCertification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { id } = req.params;

    const result = await teacherService.deleteCertification(userId, id);

    res.status(200).json({
      status: 'success',
      message: result.message,
    });
  });

  /**
   * Submit verification document
   * POST /api/teachers/me/verifications
   */
  submitVerification = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const { documentType, documentUrl } = req.body;

    const verification = await teacherService.submitVerification(
      userId,
      documentType,
      documentUrl
    );

    res.status(201).json({
      status: 'success',
      message: 'Verification submitted successfully',
      data: verification,
    });
  });

  /**
   * Get teacher's verifications
   * GET /api/teachers/me/verifications
   */
  getMyVerifications = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const verifications = await teacherService.getVerifications(userId);

    res.status(200).json({
      status: 'success',
      data: verifications,
    });
  });

  /**
   * Get teacher statistics
   * GET /api/teachers/me/stats
   */
  getMyStats = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const stats = await teacherService.getTeacherStats(userId);

    res.status(200).json({
      status: 'success',
      data: stats,
    });
  });

  /**
   * Get all pending verifications (Admin only)
   * GET /api/teachers/verifications/pending
   */
  getPendingVerifications = asyncHandler(async (_req: Request, res: Response) => {
    const verifications = await teacherService.getPendingVerifications();

    res.status(200).json({
      status: 'success',
      data: verifications,
    });
  });

  /**
   * Review verification (Admin only)
   * PUT /api/teachers/verifications/:id/review
   */
  reviewVerification = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { status, reviewNotes } = req.body;

    const verification = await teacherService.reviewVerification(
      id,
      adminId,
      status as VerificationStatus,
      reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Verification reviewed successfully',
      data: verification,
    });
  });
}

export default new TeacherController();

