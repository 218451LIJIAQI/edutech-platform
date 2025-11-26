import { Request, Response } from 'express';
import { VerificationStatus, RegistrationStatus } from '@prisma/client';
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
      // Only apply isVerified filter if the query param is provided
      isVerified: typeof isVerified === 'string' ? isVerified === 'true' : undefined,
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

  /**
   * Submit extended profile for review
   * POST /api/teachers/me/profile/submit
   */
  submitExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      selfIntroduction,
      educationBackground,
      teachingExperience,
      awards,
      specialties,
      teachingStyle,
      languages,
      yearsOfExperience,
      profilePhoto,
      certificatePhotos,
    } = req.body;

    const profile = await teacherService.submitExtendedProfile(userId, {
      selfIntroduction,
      educationBackground,
      teachingExperience,
      awards,
      specialties,
      teachingStyle,
      languages,
      yearsOfExperience,
      profilePhoto,
      certificatePhotos,
    });

    res.status(201).json({
      status: 'success',
      message: 'Profile submitted for review successfully',
      data: profile,
    });
  });

  /**
   * Get extended profile
   * GET /api/teachers/me/profile/extended
   */
  getExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;

    const profile = await teacherService.getExtendedProfile(userId);

    res.status(200).json({
      status: 'success',
      data: profile,
    });
  });

  /**
   * Update extended profile (for approved teachers)
   * PUT /api/teachers/me/profile/update
   */
  updateExtendedProfile = asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const {
      selfIntroduction,
      educationBackground,
      teachingExperience,
      awards,
      specialties,
      teachingStyle,
      languages,
      yearsOfExperience,
      profilePhoto,
      certificatePhotos,
    } = req.body;

    const profile = await teacherService.updateExtendedProfile(userId, {
      selfIntroduction,
      educationBackground,
      teachingExperience,
      awards,
      specialties,
      teachingStyle,
      languages,
      yearsOfExperience,
      profilePhoto,
      certificatePhotos,
    });

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully and submitted for review',
      data: profile,
    });
  });

  /**
   * Get all teachers pending profile verification (Admin only)
   * GET /api/teachers/admin/pending-profiles
   */
  getPendingProfileVerifications = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;

    const result = await teacherService.getPendingProfileVerifications(
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 10
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Review teacher extended profile (Admin only)
   * PUT /api/teachers/admin/profiles/:id/review
   */
  reviewTeacherProfile = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { status, reviewNotes } = req.body;

    const profile = await teacherService.reviewTeacherProfile(
      id,
      adminId,
      status as VerificationStatus,
      reviewNotes
    );

    res.status(200).json({
      status: 'success',
      message: 'Teacher profile reviewed successfully',
      data: profile,
    });
  });

  /**
   * Get all verified teachers (for student view)
   * GET /api/teachers/verified
   */
  getVerifiedTeachers = asyncHandler(async (req: Request, res: Response) => {
    const { search, page, limit } = req.query;

    const result = await teacherService.getVerifiedTeachers({
      search: search as string,
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 10,
    });

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });
  /**
   * Get pending teacher registrations (Admin only)
   * GET /api/teachers/admin/pending-registrations
   */
  getPendingRegistrations = asyncHandler(async (req: Request, res: Response) => {
    const { page, limit } = req.query;

    const result = await teacherService.getPendingRegistrations(
      page ? parseInt(page as string) : 1,
      limit ? parseInt(limit as string) : 10
    );

    res.status(200).json({
      status: 'success',
      data: result,
    });
  });

  /**
   * Review teacher registration (Admin only)
   * PUT /api/teachers/admin/registrations/:id/review
   */
  reviewRegistration = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const adminId = req.user!.id;
    const { status } = req.body;

    const updated = await teacherService.reviewRegistration(
      id,
      adminId,
      status as RegistrationStatus
    );

    res.status(200).json({
      status: 'success',
      message: 'Teacher registration reviewed successfully',
      data: updated,
    });
  });
}

export default new TeacherController();

