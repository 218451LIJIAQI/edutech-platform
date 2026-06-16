import { useEffect, useState, useCallback, useRef } from 'react';
import clientLogger from '@/utils/logger';
import { CheckCircle, XCircle, Clock, Eye, AlertCircle, Loader, UserPlus, X, Zap, Shield } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import adminService, { type AutoVerificationStats } from '@/services/admin.service';
import { TeacherProfile, VerificationStatus, RegistrationStatus, TeacherVerification } from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { useOverlayAccessibility, usePageTitle, useTimeoutManager } from '@/hooks';
import {
  buildTeacherCertificateAssetAccessUrl,
  openProtectedAsset,
} from '@/utils/protected-assets';
import { getTeacherDisplayPhoto } from '@/utils/asset-normalizers';

type ReviewVerificationStatus =
  | VerificationStatus.APPROVED
  | VerificationStatus.REJECTED;
type ReviewRegistrationStatus =
  | RegistrationStatus.APPROVED
  | RegistrationStatus.REJECTED;

/**
 * Verification Teachers Management Page
 * Admin panel for reviewing teacher registrations and profile verifications
 */
const VerificationTeachersManagement = () => {
  usePageTitle('Teacher Verification Management');
  const { setManagedTimeout, clearAllManagedTimeouts } = useTimeoutManager();
  const profileReviewModalRef = useRef<HTMLDivElement | null>(null);
  const profileReviewStatusRef = useRef<HTMLSelectElement | null>(null);
  const registrationRejectModalRef = useRef<HTMLDivElement | null>(null);
  const registrationRejectNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const [activeTab, setActiveTab] = useState<'registrations' | 'profiles' | 'certificates'>('registrations');

  // Registrations
  const [pendingRegistrations, setPendingRegistrations] = useState<TeacherProfile[]>([]);
  const [regPage, setRegPage] = useState(1);
  const [regTotalPages, setRegTotalPages] = useState(1);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(true);
  const [regSubmittingId, setRegSubmittingId] = useState<string | null>(null);

  // Profiles (extended profile verifications)
  const [pendingProfiles, setPendingProfiles] = useState<TeacherProfile[]>([]);
  const [profPage, setProfPage] = useState(1);
  const [profTotalPages, setProfTotalPages] = useState(1);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);

  // Certificates (document verifications)
  const [pendingCertificates, setPendingCertificates] = useState<TeacherVerification[]>([]);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(true);
  const [certSubmittingId, setCertSubmittingId] = useState<string | null>(null);

  // Auto-verification stats
  const [autoVerificationStats, setAutoVerificationStats] = useState<AutoVerificationStats | null>(null);
  const [certFilter, setCertFilter] = useState<'all' | 'needs_review'>('all');

  // Shared UI state
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [registrationRejectTarget, setRegistrationRejectTarget] = useState<TeacherProfile | null>(null);
  const [registrationRejectNotes, setRegistrationRejectNotes] = useState('');
  const [isProfileReviewModalOpen, setIsProfileReviewModalOpen] = useState(false);
  const [profileReviewStatus, setProfileReviewStatus] = useState<ReviewVerificationStatus>(VerificationStatus.APPROVED);
  const [profileReviewNotes, setProfileReviewNotes] = useState('');
  const [isSubmittingProfileReview, setIsSubmittingProfileReview] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const showTemporarySuccess = useCallback((message: string) => {
    clearAllManagedTimeouts();
    setSuccessMessage(message);
    setErrorMessage('');
    setManagedTimeout(() => setSuccessMessage(''), 5000);
  }, [clearAllManagedTimeouts, setManagedTimeout]);

  const showTemporaryError = useCallback((message: string) => {
    clearAllManagedTimeouts();
    setErrorMessage(message);
    setSuccessMessage('');
    setManagedTimeout(() => setErrorMessage(''), 5000);
  }, [clearAllManagedTimeouts, setManagedTimeout]);

  // Fetch pending teacher registrations
  const fetchPendingRegistrations = useCallback(async () => {
    setIsLoadingRegistrations(true);
    try {
      const result = await teacherService.getPendingRegistrations({ page: regPage, limit: 10 });
      setPendingRegistrations(result.teachers || []);
      setRegTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      clientLogger.error('Failed to fetch pending registrations:', error);
      showTemporaryError(extractErrorMessage(error, 'Failed to load pending teacher registrations.'));
    } finally {
      setIsLoadingRegistrations(false);
    }
  }, [regPage, showTemporaryError]);

  // Fetch pending extended profiles
  const fetchPendingProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    try {
      const result = await teacherService.getPendingProfileVerifications({ page: profPage, limit: 10 });
      setPendingProfiles(result.teachers || []);
      setProfTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      clientLogger.error('Failed to fetch pending profiles:', error);
      showTemporaryError(extractErrorMessage(error, 'Failed to load pending profile verifications.'));
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [profPage, showTemporaryError]);

  // Fetch pending certificates
  const fetchPendingCertificates = useCallback(async () => {
    setIsLoadingCertificates(true);
    try {
      const result = await teacherService.getPendingCertificateVerifications();
      setPendingCertificates(result || []);
    } catch (error) {
      clientLogger.error('Failed to fetch pending certificates:', error);
      showTemporaryError(extractErrorMessage(error, 'Failed to load pending certificate verifications.'));
    } finally {
      setIsLoadingCertificates(false);
    }
  }, [showTemporaryError]);

  // Fetch auto-verification stats
  const fetchAutoVerificationStats = useCallback(async () => {
    try {
      const stats = await adminService.getAutoVerificationStats();
      setAutoVerificationStats(stats);
    } catch (error) {
      clientLogger.error('Failed to fetch auto-verification stats:', error);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchPendingRegistrations();
    } else if (activeTab === 'profiles') {
      fetchPendingProfiles();
    } else if (activeTab === 'certificates') {
      fetchPendingCertificates();
      fetchAutoVerificationStats();
    }
  }, [activeTab, regPage, profPage, fetchPendingRegistrations, fetchPendingProfiles, fetchPendingCertificates, fetchAutoVerificationStats]);

  // Approve/Reject Certificate
  const handleReviewCertificate = async (
    verificationId: string,
    status: ReviewVerificationStatus
  ) => {
    setCertSubmittingId(verificationId);
    try {
      await teacherService.reviewCertificateVerification(verificationId, status);
      showTemporarySuccess(`Certificate ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      fetchPendingCertificates();
    } catch (error) {
      showTemporaryError(extractErrorMessage(error, 'Failed to review certificate.'));
    } finally {
      setCertSubmittingId(null);
    }
  };

  // Approve/Reject Registration
  const handleReviewRegistration = async (
    teacherProfileId: string,
    status: ReviewRegistrationStatus,
    reviewNotes?: string
  ) => {
    setRegSubmittingId(teacherProfileId);
    try {
      await teacherService.reviewRegistration(teacherProfileId, status, reviewNotes);
      showTemporarySuccess(`Registration ${status === RegistrationStatus.APPROVED ? 'approved' : 'rejected'} successfully.`);
      fetchPendingRegistrations();
    } catch (error) {
      showTemporaryError(extractErrorMessage(error, 'Failed to review registration.'));
    } finally {
      setRegSubmittingId(null);
    }
  };

  const openRegistrationRejectModal = (teacher: TeacherProfile) => {
    setRegistrationRejectTarget(teacher);
    setRegistrationRejectNotes('');
  };

  const closeRegistrationRejectModal = () => {
    setRegistrationRejectTarget(null);
    setRegistrationRejectNotes('');
  };

  const submitRegistrationReject = async () => {
    if (!registrationRejectTarget) {
      return;
    }

    const notes = registrationRejectNotes.trim();

    if (!notes) {
      showTemporaryError('Review notes are required when rejecting a registration.');
      return;
    }

    await handleReviewRegistration(
      registrationRejectTarget.id,
      RegistrationStatus.REJECTED,
      notes
    );
    closeRegistrationRejectModal();
  };

  // Open Profile Review Modal
  const openProfileReviewModal = (teacher: TeacherProfile) => {
    setSelectedTeacher(teacher);
    setProfileReviewStatus(VerificationStatus.APPROVED);
    setProfileReviewNotes('');
    setIsProfileReviewModalOpen(true);
  };

  // Submit Profile Review
  const submitProfileReview = async () => {
    if (!selectedTeacher) return;
    setIsSubmittingProfileReview(true);
    try {
      await teacherService.reviewTeacherProfile(selectedTeacher.id, profileReviewStatus, profileReviewNotes);
      showTemporarySuccess(`Profile ${profileReviewStatus === VerificationStatus.APPROVED ? 'approved' : 'rejected'} successfully.`);
      setIsProfileReviewModalOpen(false);
      fetchPendingProfiles();
    } catch (error) {
      showTemporaryError(extractErrorMessage(error, 'Failed to review profile.'));
    } finally {
      setIsSubmittingProfileReview(false);
    }
  };

  // Helpers
  const parseField = useCallback((field: string | string[] | undefined): string[] => {
    if (!field) return [];
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return Array.isArray(field) ? field : [];
  }, []);

  const parseAssetList = useCallback((field: string | string[] | undefined): string[] => {
    if (!field) {
      return [];
    }

    if (Array.isArray(field)) {
      return field
        .map((item) => item.trim())
        .filter(Boolean);
    }

    const trimmedField = field.trim();
    if (!trimmedField) {
      return [];
    }

    if (/^[\[{]/.test(trimmedField)) {
      try {
        const parsed = JSON.parse(trimmedField);
        return Array.isArray(parsed)
          ? parsed
              .filter((item): item is string => typeof item === 'string')
              .map((item) => item.trim())
              .filter(Boolean)
          : [];
      } catch {
        return [];
      }
    }

    return [trimmedField];
  }, []);

  const selectedTeacherCertificatePhotos = parseAssetList(selectedTeacher?.certificatePhotos);
  const selectedTeacherDisplayPhoto = selectedTeacher
    ? getTeacherDisplayPhoto(selectedTeacher)
    : undefined;

  const formatDate = useCallback((date: string | Date | undefined): string => {
    if (!date) return 'N/A';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) return 'N/A';
      return dateObj.toLocaleDateString();
    } catch {
      return 'N/A';
    }
  }, []);

  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsProfileReviewModalOpen(false);
    }
  }, []);

  const handleRegistrationRejectBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeRegistrationRejectModal();
    }
  }, []);

  const handleOpenCertificateDocument = useCallback(async (assetUrl: string) => {
    try {
      await openProtectedAsset(assetUrl);
    } catch (error) {
      clientLogger.error('Failed to open certificate document:', error);
      showTemporaryError(extractErrorMessage(error, 'Failed to open document.'));
    }
  }, [showTemporaryError]);

  const handleOpenTeacherCertificateAsset = useCallback(async (assetUrl: string) => {
    const accessUrl = buildTeacherCertificateAssetAccessUrl(assetUrl);

    if (!accessUrl) {
      showTemporaryError('Certificate file URL is invalid.');
      return;
    }

    try {
      await openProtectedAsset(accessUrl);
    } catch (error) {
      clientLogger.error('Failed to open submitted certificate file:', error);
      showTemporaryError(extractErrorMessage(error, 'Failed to open certificate file.'));
    }
  }, [showTemporaryError]);

  useOverlayAccessibility({
    isOpen: isProfileReviewModalOpen,
    containerRef: profileReviewModalRef,
    initialFocusRef: profileReviewStatusRef,
    onClose: () => setIsProfileReviewModalOpen(false),
    trapFocus: true,
    lockBodyScroll: true,
  });

  useOverlayAccessibility({
    isOpen: Boolean(registrationRejectTarget),
    containerRef: registrationRejectModalRef,
    initialFocusRef: registrationRejectNotesRef,
    onClose: closeRegistrationRejectModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Teacher <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Verification</span>
              </h1>
              <p className="text-gray-500 font-medium">Review teacher registrations and profiles</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'registrations' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('registrations')}
          >
            Registrations
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'profiles' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('profiles')}
          >
            Profile Verifications
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'certificates' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('certificates')}
          >
            Certificates ({pendingCertificates.length})
          </button>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{errorMessage}</p>
          </div>
        )}

        {/* Registrations Tab */}
        {activeTab === 'registrations' && (
          <>
            {isLoadingRegistrations ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="spinner" />
                  <p className="text-gray-600 font-medium">Loading pending registrations...</p>
                </div>
              </div>
            ) : pendingRegistrations.length > 0 ? (
              <div className="card shadow-xl border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Teacher</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Registered At</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRegistrations.map((t) => (
                        <tr key={t.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {t.user?.avatar ? (
                                <img src={t.user.avatar} alt={`${t.user.firstName} ${t.user.lastName}`} className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                                  {t.user?.firstName?.[0]}{t.user?.lastName?.[0]}
                                </div>
                              )}
                              <div>
                                <p className="font-semibold text-gray-900">{t.user?.firstName} {t.user?.lastName}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{t.user?.email}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatDate(t.createdAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={regSubmittingId === t.id}
                                onClick={() => handleReviewRegistration(t.id, RegistrationStatus.APPROVED)}
                                className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                type="button"
                                aria-label="Approve registration"
                              >
                                {regSubmittingId === t.id ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                Approve
                              </button>
                              <button
                                disabled={regSubmittingId === t.id}
                                onClick={() => openRegistrationRejectModal(t)}
                                className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                type="button"
                                aria-label="Reject registration"
                              >
                                {regSubmittingId === t.id ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">Page {regPage} of {regTotalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setRegPage(Math.max(1, regPage - 1))} disabled={regPage === 1} className="btn-outline">Previous</button>
                    <button type="button" onClick={() => setRegPage(Math.min(regTotalPages, regPage + 1))} disabled={regPage === regTotalPages} className="btn-outline">Next</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-16 shadow-xl border border-gray-100 rounded-2xl">
                <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No pending registrations</h3>
                <p className="text-gray-600">New teacher registrations will appear here.</p>
              </div>
            )}
          </>
        )}

        {/* Profiles Tab */}
        {activeTab === 'profiles' && (
          <>
            {isLoadingProfiles ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="spinner" />
                  <p className="text-gray-600 font-medium">Loading pending profiles...</p>
                </div>
              </div>
            ) : pendingProfiles.length > 0 ? (
              <div className="card shadow-xl border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Teacher</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Email</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Specialties</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Submitted</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Status</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingProfiles.map((teacher) => {
                        const displayPhoto = getTeacherDisplayPhoto(teacher);

                        return (
                          <tr key={teacher.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-3">
                                {displayPhoto ? (
                                  <img src={displayPhoto} alt={`${teacher.user?.firstName ?? ''} ${teacher.user?.lastName ?? ''}`.trim()} className="w-10 h-10 rounded-full object-cover" />
                                ) : (
                                  <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                                    {teacher.user?.firstName?.[0]}{teacher.user?.lastName?.[0]}
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-gray-900">{teacher.user?.firstName} {teacher.user?.lastName}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{teacher.user?.email}</td>
                            <td className="px-6 py-4">
                              <div className="flex flex-wrap gap-1">
                                {parseField(teacher.specialties).slice(0, 2).map((spec: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">{spec}</span>
                                ))}
                                {parseField(teacher.specialties).length > 2 && (
                                  <span className="text-xs text-gray-600">+{parseField(teacher.specialties).length - 2} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600">{formatDate(teacher.profileSubmittedAt)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-600">Pending</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => openProfileReviewModal(teacher)}
                                className="btn-primary flex items-center gap-2 text-sm"
                                type="button"
                                aria-label="Review profile"
                              >
                                <Eye className="w-4 h-4" /> Review
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">Page {profPage} of {profTotalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setProfPage(Math.max(1, profPage - 1))} disabled={profPage === 1} className="btn-outline">Previous</button>
                    <button type="button" onClick={() => setProfPage(Math.min(profTotalPages, profPage + 1))} disabled={profPage === profTotalPages} className="btn-outline">Next</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-16 shadow-xl border border-gray-100 rounded-2xl">
                <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No pending profiles</h3>
                <p className="text-gray-600">Teacher profile submissions awaiting review will appear here.</p>
              </div>
            )}
          </>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <>
            {/* Auto-Verification Stats Banner */}
            {autoVerificationStats && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-semibold text-blue-700 uppercase">Total Processed</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">{autoVerificationStats.totalProcessed}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-semibold text-green-700 uppercase">Auto-Approved</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">{autoVerificationStats.autoApproved}</p>
                </div>
                <div className="bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 uppercase">Needs Review</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-900">{autoVerificationStats.flaggedForReview}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-700 uppercase">Approval Rate</span>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">{autoVerificationStats.autoApprovalRate}%</p>
                </div>
              </div>
            )}

            {/* Filter Toggle */}
            <div className="mb-4 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCertFilter('needs_review')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  certFilter === 'needs_review'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Needs Manual Review
              </button>
              <button
                type="button"
                onClick={() => setCertFilter('all')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  certFilter === 'all'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Show All
              </button>
            </div>

            {isLoadingCertificates ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="spinner" />
                  <p className="text-gray-600 font-medium">Loading pending certificates...</p>
                </div>
              </div>
            ) : (() => {
              const filteredCertificates = certFilter === 'needs_review'
                ? pendingCertificates.filter((c) => c.verificationMethod === 'AUTO')
                : pendingCertificates;

              return filteredCertificates.length > 0 ? (
              <div className="card shadow-xl border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Teacher</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Document Type</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Method</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Document</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Submitted At</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCertificates.map((cert) => (
                        (() => {
                          const documentAccessUrl =
                            cert.accessUrl ?? cert.documentUrl;

                          return (
                            <tr key={cert.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">
                                    {cert.teacherProfile?.user?.firstName?.[0]}{cert.teacherProfile?.user?.lastName?.[0]}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-900">{cert.teacherProfile?.user?.firstName} {cert.teacherProfile?.user?.lastName}</p>
                                    <p className="text-sm text-gray-500">{cert.teacherProfile?.user?.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{cert.documentType}</td>
                              <td className="px-6 py-4">
                                {cert.verificationMethod === 'AUTO' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
                                    <Zap className="w-3 h-3" /> Auto
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
                                    <Shield className="w-3 h-3" /> Manual
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                {documentAccessUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void handleOpenCertificateDocument(
                                        documentAccessUrl
                                      )
                                    }
                                    className="text-primary-600 hover:underline flex items-center gap-1"
                                  >
                                    <Eye className="w-4 h-4" /> View Document
                                  </button>
                                ) : (
                                  <span className="text-sm font-medium text-amber-700">
                                    File unavailable
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600">{formatDate(cert.submittedAt)}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={certSubmittingId === cert.id}
                                    onClick={() => handleReviewCertificate(cert.id, VerificationStatus.APPROVED)}
                                    className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                    type="button"
                                  >
                                    {certSubmittingId === cert.id ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Approve
                                  </button>
                                  <button
                                    disabled={certSubmittingId === cert.id}
                                    onClick={() => handleReviewCertificate(cert.id, VerificationStatus.REJECTED)}
                                    className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                    type="button"
                                  >
                                    {certSubmittingId === cert.id ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })()
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card text-center py-16 shadow-xl border border-gray-100 rounded-2xl">
                <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No pending certificates</h3>
                <p className="text-gray-600">Certificate submissions awaiting review will appear here.</p>
              </div>
            );
            })()}
          </>
        )}
      </div>

      {/* Registration Rejection Modal */}
      {registrationRejectTarget && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onMouseDown={handleRegistrationRejectBackdropClick}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-labelledby="registration-reject-title"
        >
          <div
            ref={registrationRejectModalRef}
            tabIndex={-1}
            className="bg-white rounded-lg shadow-xl max-w-lg w-full overflow-hidden"
          >
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <h2 id="registration-reject-title" className="text-xl font-bold">Reject Registration</h2>
              <button
                type="button"
                onClick={closeRegistrationRejectModal}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Close registration rejection modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Teacher</p>
                <p className="font-semibold text-gray-900">
                  {registrationRejectTarget.user?.firstName} {registrationRejectTarget.user?.lastName}
                </p>
                <p className="text-sm text-gray-600">{registrationRejectTarget.user?.email}</p>
              </div>

              <div>
                <label htmlFor="registration-reject-notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  ref={registrationRejectNotesRef}
                  id="registration-reject-notes"
                  value={registrationRejectNotes}
                  onChange={(e) => setRegistrationRejectNotes(e.target.value)}
                  className="input min-h-[120px] py-2"
                  maxLength={500}
                  placeholder="Explain what the teacher needs to fix before registering again."
                />
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
                  <span>Required for rejected registrations.</span>
                  <span>{registrationRejectNotes.length}/500</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-outline"
                onClick={closeRegistrationRejectModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => void submitRegistrationReject()}
                disabled={
                  regSubmittingId === registrationRejectTarget.id ||
                  registrationRejectNotes.trim().length === 0
                }
              >
                {regSubmittingId === registrationRejectTarget.id ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Rejecting...
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> Reject
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Review Modal */}
      {isProfileReviewModalOpen && selectedTeacher && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onMouseDown={handleBackdropClick}
          role="dialog"
          tabIndex={-1}
          aria-modal="true"
          aria-labelledby="profile-review-title"
          aria-describedby="profile-review-description"
        >
          <div
            ref={profileReviewModalRef}
            tabIndex={-1}
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          >
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4 flex items-center justify-between">
              <h2 id="profile-review-title" className="text-2xl font-bold">Review Teacher Profile</h2>
              <button
                onClick={() => setIsProfileReviewModalOpen(false)}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Close profile review modal"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <p id="profile-review-description" className="sr-only">
                Review the teacher profile details and choose whether to approve or reject the submission.
              </p>
              {selectedTeacherDisplayPhoto && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Submitted Profile Photo</h3>
                  <img
                    src={selectedTeacherDisplayPhoto}
                    alt={`${selectedTeacher.user?.firstName ?? 'Teacher'} ${selectedTeacher.user?.lastName ?? ''}`.trim()}
                    className="h-40 w-40 rounded-2xl object-cover border border-gray-200 shadow-sm"
                  />
                </div>
              )}

              {selectedTeacherCertificatePhotos.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Submitted Certificate Files</h3>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {selectedTeacherCertificatePhotos.map((photo, index) => (
                      <button
                        key={`${photo}-${index}`}
                        type="button"
                        onClick={() => void handleOpenTeacherCertificateAsset(photo)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm font-semibold text-primary-700 hover:border-primary-300 hover:bg-primary-50"
                      >
                        <span>Certificate file {index + 1}</span>
                        <Eye className="h-4 w-4 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Teacher Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-3">Teacher Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-semibold text-gray-900">{selectedTeacher.user?.firstName} {selectedTeacher.user?.lastName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">{selectedTeacher.user?.email}</p>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              {selectedTeacher.selfIntroduction && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Self Introduction</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedTeacher.selfIntroduction}</p>
                </div>
              )}

              {selectedTeacher.educationBackground && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Education Background</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedTeacher.educationBackground}</p>
                </div>
              )}

              {selectedTeacher.teachingExperience && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Teaching Experience</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedTeacher.teachingExperience}</p>
                </div>
              )}

              {/* Specialties */}
              {parseField(selectedTeacher.specialties).length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {parseField(selectedTeacher.specialties).map((spec: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">{spec}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {parseField(selectedTeacher.languages).length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {parseField(selectedTeacher.languages).map((lang: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">{lang}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 space-y-4">
              <div className="flex gap-4">
                <label htmlFor="review-status" className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  Status:
                  <select
                    ref={profileReviewStatusRef}
                    id="review-status"
                    value={profileReviewStatus}
                    onChange={(e) => setProfileReviewStatus(e.target.value as ReviewVerificationStatus)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value={VerificationStatus.APPROVED}>Approve</option>
                    <option value={VerificationStatus.REJECTED}>Reject</option>
                  </select>
                </label>
                <input
                  type="text"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Review notes (optional)"
                  value={profileReviewNotes}
                  onChange={(e) => setProfileReviewNotes(e.target.value)}
                  aria-label="Review notes"
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={() => setIsProfileReviewModalOpen(false)}
                  className="btn-outline"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={submitProfileReview}
                  disabled={isSubmittingProfileReview}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  {isSubmittingProfileReview ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>
                      {profileReviewStatus === VerificationStatus.APPROVED ? (
                        <>
                          <CheckCircle className="w-4 h-4" /> Approve
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" /> Reject
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationTeachersManagement;
