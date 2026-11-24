import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import clientLogger from '@/utils/logger';
import { CheckCircle, XCircle, Clock, Eye, AlertCircle, Loader, UserPlus, X, Zap, Shield, RefreshCcw } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import adminService, { type AutoVerificationStats } from '@/services/admin.service';
import { TeacherProfile, VerificationStatus, RegistrationStatus, TeacherVerification } from '@/types';
import { extractErrorMessage } from '@/utils/error-handler';
import { formatDate, parseStringArray } from '@/utils/helpers';
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

const VerificationTeachersManagement = () => {
  usePageTitle('Teacher Verification Management');
  const { setManagedTimeout, clearAllManagedTimeouts } = useTimeoutManager();
  const profileReviewModalRef = useRef<HTMLDivElement | null>(null);
  const profileReviewStatusRef = useRef<HTMLSelectElement | null>(null);
  const registrationRejectModalRef = useRef<HTMLDivElement | null>(null);
  const registrationRejectNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const certificateRejectModalRef = useRef<HTMLDivElement | null>(null);
  const certificateRejectNotesRef = useRef<HTMLTextAreaElement | null>(null);
  const regRequestRef = useRef(0);
  const profRequestRef = useRef(0);
  const certRequestRef = useRef(0);
  const autoStatsRequestRef = useRef(0);

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const activeTab: 'registrations' | 'profiles' | 'certificates' =
    requestedTab === 'profiles' || requestedTab === 'certificates'
      ? requestedTab
      : 'registrations';
  const setActiveTab = useCallback(
    (nextTab: 'registrations' | 'profiles' | 'certificates') => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (nextTab === 'registrations') {
            next.delete('tab');
          } else {
            next.set('tab', nextTab);
          }
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // Registrations
  const [pendingRegistrations, setPendingRegistrations] = useState<TeacherProfile[]>([]);
  const [regPage, setRegPage] = useState(1);
  const [regTotalPages, setRegTotalPages] = useState(1);
  const [isLoadingRegistrations, setIsLoadingRegistrations] = useState(true);
  const [regLoadError, setRegLoadError] = useState<string | null>(null);
  const [regSubmittingAction, setRegSubmittingAction] = useState<{
    id: string;
    status: ReviewRegistrationStatus;
  } | null>(null);

  // Profiles (extended profile verifications)
  const [pendingProfiles, setPendingProfiles] = useState<TeacherProfile[]>([]);
  const [profPage, setProfPage] = useState(1);
  const [profTotalPages, setProfTotalPages] = useState(1);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(true);
  const [profLoadError, setProfLoadError] = useState<string | null>(null);

  // Certificates (document verifications)
  const [pendingCertificates, setPendingCertificates] = useState<TeacherVerification[]>([]);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(true);
  const [certLoadError, setCertLoadError] = useState<string | null>(null);
  const [certSubmittingAction, setCertSubmittingAction] = useState<{
    id: string;
    status: ReviewVerificationStatus;
  } | null>(null);

  // Auto-verification stats
  const [autoVerificationStats, setAutoVerificationStats] = useState<AutoVerificationStats | null>(null);
  const [certFilter, setCertFilter] = useState<'all' | 'needs_review'>('all');

  // Shared UI state
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [registrationRejectTarget, setRegistrationRejectTarget] = useState<TeacherProfile | null>(null);
  const [registrationRejectNotes, setRegistrationRejectNotes] = useState('');
  const [certificateRejectTarget, setCertificateRejectTarget] = useState<TeacherVerification | null>(null);
  const [certificateRejectNotes, setCertificateRejectNotes] = useState('');
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

  const fetchPendingRegistrations = useCallback(async () => {
    const requestId = ++regRequestRef.current;
    setIsLoadingRegistrations(true);
    setRegLoadError(null);
    try {
      const result = await teacherService.getPendingRegistrations({ page: regPage, limit: 10 });
      if (requestId !== regRequestRef.current) {
        return;
      }
      const totalPages = Math.max(1, result.pagination?.totalPages || 1);
      if ((result.teachers || []).length === 0 && regPage > totalPages) {
        setRegPage(totalPages);
        return;
      }
      setPendingRegistrations(result.teachers || []);
      setRegTotalPages(totalPages);
    } catch (error) {
      if (requestId !== regRequestRef.current) {
        return;
      }
      clientLogger.error('Failed to fetch pending registrations:', error);
      const message = extractErrorMessage(error, 'Failed to load pending teacher registrations.');
      setRegLoadError(message);
      showTemporaryError(message);
    } finally {
      if (requestId === regRequestRef.current) {
        setIsLoadingRegistrations(false);
      }
    }
  }, [regPage, showTemporaryError]);

  const fetchPendingProfiles = useCallback(async () => {
    const requestId = ++profRequestRef.current;
    setIsLoadingProfiles(true);
    setProfLoadError(null);
    try {
      const result = await teacherService.getPendingProfileVerifications({ page: profPage, limit: 10 });
      if (requestId !== profRequestRef.current) {
        return;
      }
      const totalPages = Math.max(1, result.pagination?.totalPages || 1);
      if ((result.teachers || []).length === 0 && profPage > totalPages) {
        setProfPage(totalPages);
        return;
      }
      setPendingProfiles(result.teachers || []);
      setProfTotalPages(totalPages);
    } catch (error) {
      if (requestId !== profRequestRef.current) {
        return;
      }
      clientLogger.error('Failed to fetch pending profiles:', error);
      const message = extractErrorMessage(error, 'Failed to load pending profile verifications.');
      setProfLoadError(message);
      showTemporaryError(message);
    } finally {
      if (requestId === profRequestRef.current) {
        setIsLoadingProfiles(false);
      }
    }
  }, [profPage, showTemporaryError]);

  const fetchPendingCertificates = useCallback(async () => {
    const requestId = ++certRequestRef.current;
    setIsLoadingCertificates(true);
    setCertLoadError(null);
    try {
      const result = await teacherService.getPendingCertificateVerifications();
      if (requestId !== certRequestRef.current) {
        return;
      }
      setPendingCertificates(result || []);
    } catch (error) {
      if (requestId !== certRequestRef.current) {
        return;
      }
      clientLogger.error('Failed to fetch pending certificates:', error);
      const message = extractErrorMessage(error, 'Failed to load pending certificate verifications.');
      setCertLoadError(message);
      showTemporaryError(message);
    } finally {
      if (requestId === certRequestRef.current) {
        setIsLoadingCertificates(false);
      }
    }
  }, [showTemporaryError]);

  const fetchAutoVerificationStats = useCallback(async () => {
    const requestId = ++autoStatsRequestRef.current;
    try {
      const stats = await adminService.getAutoVerificationStats();
      if (requestId !== autoStatsRequestRef.current) {
        return;
      }
      setAutoVerificationStats(stats);
    } catch (error) {
      clientLogger.error('Failed to fetch auto-verification stats:', error);
    }
  }, []);

  const hasLoadedInitialCertBadgeRef = useRef(false);
  useEffect(() => {
    if (!hasLoadedInitialCertBadgeRef.current && activeTab !== 'certificates') {
      hasLoadedInitialCertBadgeRef.current = true;
      void fetchPendingCertificates();
    }
  }, [activeTab, fetchPendingCertificates]);

  useEffect(() => {
    if (activeTab === 'registrations') {
      void fetchPendingRegistrations();
    } else if (activeTab === 'profiles') {
      void fetchPendingProfiles();
    } else if (activeTab === 'certificates') {
      hasLoadedInitialCertBadgeRef.current = true;
      void fetchPendingCertificates();
      void fetchAutoVerificationStats();
    }
  }, [activeTab, regPage, profPage, fetchPendingRegistrations, fetchPendingProfiles, fetchPendingCertificates, fetchAutoVerificationStats]);

  useEffect(() => {
    return () => {
      regRequestRef.current += 1;
      profRequestRef.current += 1;
      certRequestRef.current += 1;
      autoStatsRequestRef.current += 1;
    };
  }, []);

  const handleReviewCertificate = async (
    verificationId: string,
    status: ReviewVerificationStatus,
    reviewNotes?: string
  ): Promise<boolean> => {
    if (certSubmittingAction) return false;
    setCertSubmittingAction({ id: verificationId, status });
    try {
      await teacherService.reviewCertificateVerification(verificationId, status, reviewNotes);
      showTemporarySuccess(`Certificate ${status === VerificationStatus.APPROVED ? 'approved' : 'rejected'}.`);
      await fetchPendingCertificates();
      return true;
    } catch (error) {
      showTemporaryError(extractErrorMessage(error, 'Failed to review certificate.'));
      return false;
    } finally {
      setCertSubmittingAction(null);
    }
  };

  const openCertificateRejectModal = (certificate: TeacherVerification) => {
    setCertificateRejectTarget(certificate);
    setCertificateRejectNotes('');
  };

  const closeCertificateRejectModal = useCallback(() => {
    if (certSubmittingAction) return;
    setCertificateRejectTarget(null);
    setCertificateRejectNotes('');
  }, [certSubmittingAction]);

  const submitCertificateReject = async () => {
    if (!certificateRejectTarget) {
      return;
    }

    const notes = certificateRejectNotes.trim();
    if (!notes) {
      showTemporaryError('Review notes are required when rejecting a certificate.');
      return;
    }

    const succeeded = await handleReviewCertificate(
      certificateRejectTarget.id,
      VerificationStatus.REJECTED,
      notes
    );
    if (succeeded) {
      setCertificateRejectTarget(null);
      setCertificateRejectNotes('');
    }
  };

  const handleReviewRegistration = async (
    teacherProfileId: string,
    status: ReviewRegistrationStatus,
    reviewNotes?: string
  ): Promise<boolean> => {
    if (regSubmittingAction) return false;
    setRegSubmittingAction({ id: teacherProfileId, status });
    try {
      await teacherService.reviewRegistration(teacherProfileId, status, reviewNotes);
      showTemporarySuccess(`Registration ${status === RegistrationStatus.APPROVED ? 'approved' : 'rejected'}.`);
      await fetchPendingRegistrations();
      return true;
    } catch (error) {
      showTemporaryError(extractErrorMessage(error, 'Failed to review registration.'));
      return false;
    } finally {
      setRegSubmittingAction(null);
    }
  };

  const openRegistrationRejectModal = (teacher: TeacherProfile) => {
    setRegistrationRejectTarget(teacher);
    setRegistrationRejectNotes('');
  };

  const closeRegistrationRejectModal = useCallback(() => {
    if (regSubmittingAction) return;
    setRegistrationRejectTarget(null);
    setRegistrationRejectNotes('');
  }, [regSubmittingAction]);

  const submitRegistrationReject = async () => {
    if (!registrationRejectTarget) {
      return;
    }

    const notes = registrationRejectNotes.trim();
    if (!notes) {
      showTemporaryError('Review notes are required when rejecting a registration.');
      return;
    }

    const succeeded = await handleReviewRegistration(
      registrationRejectTarget.id,
      RegistrationStatus.REJECTED,
      notes
    );
    if (succeeded) {
      setRegistrationRejectTarget(null);
      setRegistrationRejectNotes('');
    }
  };

  const openProfileReviewModal = (teacher: TeacherProfile) => {
    setSelectedTeacher(teacher);
    setProfileReviewStatus(VerificationStatus.APPROVED);
    setProfileReviewNotes('');
    setIsProfileReviewModalOpen(true);
  };

  const submitProfileReview = async () => {
    if (!selectedTeacher || isSubmittingProfileReview) return;

    const trimmedNotes = profileReviewNotes.trim();
    if (profileReviewStatus === VerificationStatus.REJECTED && !trimmedNotes) {
      showTemporaryError('Review notes are required when rejecting a profile.');
      return;
    }

    setIsSubmittingProfileReview(true);
    try {
      await teacherService.reviewTeacherProfile(
        selectedTeacher.id,
        profileReviewStatus,
        trimmedNotes || undefined
      );
      showTemporarySuccess(`Profile ${profileReviewStatus === VerificationStatus.APPROVED ? 'approved' : 'rejected'}.`);
      setIsProfileReviewModalOpen(false);
      await fetchPendingProfiles();
    } catch (error) {
      showTemporaryError(extractErrorMessage(error, 'Failed to review profile.'));
    } finally {
      setIsSubmittingProfileReview(false);
    }
  };

  const selectedTeacherCertificatePhotos = parseStringArray(
    selectedTeacher?.certificatePhotos,
    { allowSingleStringFallback: true }
  );
  const selectedTeacherDisplayPhoto = selectedTeacher
    ? getTeacherDisplayPhoto(selectedTeacher)
    : undefined;
  const selectedTeacherSpecialties = parseStringArray(selectedTeacher?.specialties);
  const selectedTeacherLanguages = parseStringArray(selectedTeacher?.languages);

  const closeProfileReviewModal = useCallback(() => {
    if (!isSubmittingProfileReview) {
      setIsProfileReviewModalOpen(false);
    }
  }, [isSubmittingProfileReview]);

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
    onClose: closeProfileReviewModal,
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

  useOverlayAccessibility({
    isOpen: Boolean(certificateRejectTarget),
    containerRef: certificateRejectModalRef,
    initialFocusRef: certificateRejectNotesRef,
    onClose: closeCertificateRejectModal,
    trapFocus: true,
    lockBodyScroll: true,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-primary-50/10 to-indigo-50/20 py-8 relative">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900">
                Teacher <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Verification</span>
              </h1>
              <p className="text-gray-500 font-medium">Review teacher registrations, extended profiles, and credentials</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Teacher verification sections"
          className="flex flex-wrap items-center gap-2 mb-6"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'registrations'}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'registrations' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('registrations')}
          >
            Registrations
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'profiles'}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'profiles' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('profiles')}
          >
            Profile Verifications
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'certificates'}
            className={`px-4 py-2 rounded-lg font-semibold transition-all tabular-nums ${activeTab === 'certificates' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('certificates')}
          >
            Certificates ({pendingCertificates.length})
          </button>
        </div>

        {successMessage && (
          <div role="status" className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start space-x-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-green-800">{successMessage}</p>
          </div>
        )}
        {errorMessage && (
          <div role="alert" className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
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
            ) : regLoadError ? (
              <div role="alert" className="card text-center py-14 space-y-3 border border-red-200 bg-red-50">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
                <h2 className="text-xl font-bold text-red-900">Unable to load pending registrations</h2>
                <p className="text-sm text-red-800">{regLoadError}</p>
                <button
                  type="button"
                  onClick={() => void fetchPendingRegistrations()}
                  className="btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Retry
                </button>
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
                      {pendingRegistrations.map((t) => {
                        const isApproving =
                          regSubmittingAction?.id === t.id &&
                          regSubmittingAction.status === RegistrationStatus.APPROVED;
                        const isRejecting =
                          regSubmittingAction?.id === t.id &&
                          regSubmittingAction.status === RegistrationStatus.REJECTED;
                        const isRowBusy = regSubmittingAction?.id === t.id;

                        return (
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
                            <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">{formatDate(t.createdAt)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  disabled={isRowBusy}
                                  onClick={() => void handleReviewRegistration(t.id, RegistrationStatus.APPROVED)}
                                  className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                  type="button"
                                  aria-label={`Approve registration for ${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim()}
                                >
                                  {isApproving ? <Loader className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                  Approve
                                </button>
                                <button
                                  disabled={isRowBusy}
                                  onClick={() => openRegistrationRejectModal(t)}
                                  className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                  type="button"
                                  aria-label={`Reject registration for ${t.user?.firstName ?? ''} ${t.user?.lastName ?? ''}`.trim()}
                                >
                                  {isRejecting ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                  Reject
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between tabular-nums">
                  <p className="text-sm text-gray-600">Page {regPage} of {regTotalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setRegPage(Math.max(1, regPage - 1))} disabled={regPage === 1} className="btn-outline btn-sm">Previous</button>
                    <button type="button" onClick={() => setRegPage(Math.min(regTotalPages, regPage + 1))} disabled={regPage === regTotalPages} className="btn-outline btn-sm">Next</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-16 shadow-xl border border-gray-100 rounded-2xl">
                <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No pending registrations</h2>
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
            ) : profLoadError ? (
              <div role="alert" className="card text-center py-14 space-y-3 border border-red-200 bg-red-50">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
                <h2 className="text-xl font-bold text-red-900">Unable to load pending profiles</h2>
                <p className="text-sm text-red-800">{profLoadError}</p>
                <button
                  type="button"
                  onClick={() => void fetchPendingProfiles()}
                  className="btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Retry
                </button>
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
                        const specialties = parseStringArray(teacher.specialties);

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
                                {specialties.slice(0, 2).map((spec: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-xs font-medium">{spec}</span>
                                ))}
                                {specialties.length > 2 && (
                                  <span className="text-xs text-gray-600 tabular-nums">+{specialties.length - 2} more</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">{formatDate(teacher.profileSubmittedAt)}</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-yellow-600" />
                                <span className="text-sm font-medium text-yellow-700">Pending</span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => openProfileReviewModal(teacher)}
                                className="btn-primary btn-sm flex items-center gap-2"
                                type="button"
                                aria-label={`Review profile for ${teacher.user?.firstName ?? ''} ${teacher.user?.lastName ?? ''}`.trim()}
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
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between tabular-nums">
                  <p className="text-sm text-gray-600">Page {profPage} of {profTotalPages}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setProfPage(Math.max(1, profPage - 1))} disabled={profPage === 1} className="btn-outline btn-sm">Previous</button>
                    <button type="button" onClick={() => setProfPage(Math.min(profTotalPages, profPage + 1))} disabled={profPage === profTotalPages} className="btn-outline btn-sm">Next</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card text-center py-16 shadow-xl border border-gray-100 rounded-2xl">
                <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No pending profiles</h2>
                <p className="text-gray-600">Teacher profile submissions awaiting review will appear here.</p>
              </div>
            )}
          </>
        )}

        {/* Certificates Tab */}
        {activeTab === 'certificates' && (
          <>
            {autoVerificationStats && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 tabular-nums">
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
            ) : certLoadError ? (
              <div role="alert" className="card text-center py-14 space-y-3 border border-red-200 bg-red-50">
                <AlertCircle className="w-12 h-12 text-red-600 mx-auto" />
                <h2 className="text-xl font-bold text-red-900">Unable to load pending certificates</h2>
                <p className="text-sm text-red-800">{certLoadError}</p>
                <button
                  type="button"
                  onClick={() => void fetchPendingCertificates()}
                  className="btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Retry
                </button>
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
                        {filteredCertificates.map((cert) => {
                          const documentAccessUrl = cert.accessUrl ?? cert.documentUrl;
                          const isApproving =
                            certSubmittingAction?.id === cert.id &&
                            certSubmittingAction.status === VerificationStatus.APPROVED;
                          const isRejecting =
                            certSubmittingAction?.id === cert.id &&
                            certSubmittingAction.status === VerificationStatus.REJECTED;
                          const isRowBusy = certSubmittingAction?.id === cert.id;

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
                              <td className="px-6 py-4 text-sm text-gray-600">
                                <p className="font-medium text-gray-900 capitalize">
                                  {cert.documentType.replace(/_/g, ' ')}
                                </p>
                                {cert.reviewNotes ? (
                                  <p className="mt-1 text-xs text-amber-700">{cert.reviewNotes}</p>
                                ) : null}
                              </td>
                              <td className="px-6 py-4">
                                {cert.verificationMethod === 'AUTO' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                    <Zap className="w-3 h-3" /> Auto-Flagged
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
                                    onClick={() => void handleOpenCertificateDocument(documentAccessUrl)}
                                    className="text-primary-600 hover:underline flex items-center gap-1 font-medium text-sm"
                                  >
                                    <Eye className="w-4 h-4" /> View Document
                                  </button>
                                ) : (
                                  <span className="text-sm font-medium text-amber-700">
                                    File unavailable
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-sm text-gray-600 tabular-nums">{formatDate(cert.submittedAt)}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    disabled={isRowBusy}
                                    onClick={() => void handleReviewCertificate(cert.id, VerificationStatus.APPROVED)}
                                    className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                    type="button"
                                  >
                                    {isApproving ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    Approve
                                  </button>
                                  <button
                                    disabled={isRowBusy}
                                    onClick={() => openCertificateRejectModal(cert)}
                                    className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                    type="button"
                                  >
                                    {isRejecting ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                    Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="card text-center py-16 shadow-xl border border-gray-100 rounded-2xl space-y-3">
                  <Clock className="w-16 h-16 text-yellow-600 mx-auto mb-2" />
                  <h2 className="text-2xl font-bold text-gray-900">
                    {pendingCertificates.length > 0 && certFilter === 'needs_review'
                      ? 'No auto-flagged certificates'
                      : 'No pending certificates'}
                  </h2>
                  <p className="text-gray-600">
                    {pendingCertificates.length > 0 && certFilter === 'needs_review'
                      ? 'All remaining pending certificates were submitted for standard manual review.'
                      : 'Certificate submissions awaiting review will appear here.'}
                  </p>
                  {pendingCertificates.length > 0 && certFilter === 'needs_review' && (
                    <button
                      type="button"
                      onClick={() => setCertFilter('all')}
                      className="btn-secondary btn-sm"
                    >
                      Show All Pending Certificates
                    </button>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>

      {/* Registration Rejection Modal */}
      {registrationRejectTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center z-modal p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeRegistrationRejectModal();
              }
            }}
          >
            <div
              ref={registrationRejectModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="registration-reject-title"
              tabIndex={-1}
              className="bg-white rounded-2xl shadow-modal max-w-lg w-full overflow-hidden"
            >
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <h2 id="registration-reject-title" className="text-xl font-bold text-white">Reject Registration</h2>
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
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500 tabular-nums">
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
                  regSubmittingAction?.id === registrationRejectTarget.id ||
                  registrationRejectNotes.trim().length === 0
                }
              >
                {regSubmittingAction?.id === registrationRejectTarget.id ? (
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
        </div>,
          document.body
        )}

      {/* Certificate Rejection Modal */}
      {certificateRejectTarget &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center z-modal p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeCertificateRejectModal();
              }
            }}
          >
            <div
              ref={certificateRejectModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="certificate-reject-title"
              tabIndex={-1}
              className="bg-white rounded-2xl shadow-modal max-w-lg w-full overflow-hidden"
            >
            <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 flex items-center justify-between">
              <h2 id="certificate-reject-title" className="text-xl font-bold text-white">Reject Certificate</h2>
              <button
                type="button"
                onClick={closeCertificateRejectModal}
                className="text-white hover:text-gray-200 transition-colors"
                aria-label="Close certificate rejection modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-600">Teacher &amp; Document</p>
                <p className="font-semibold text-gray-900">
                  {certificateRejectTarget.teacherProfile?.user?.firstName} {certificateRejectTarget.teacherProfile?.user?.lastName}
                </p>
                <p className="text-sm text-gray-600 capitalize">{certificateRejectTarget.documentType.replace(/_/g, ' ')}</p>
              </div>

              <div>
                <label htmlFor="certificate-reject-notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection reason <span className="text-red-600">*</span>
                </label>
                <textarea
                  ref={certificateRejectNotesRef}
                  id="certificate-reject-notes"
                  value={certificateRejectNotes}
                  onChange={(e) => setCertificateRejectNotes(e.target.value)}
                  className="input min-h-[120px] py-2"
                  maxLength={500}
                  placeholder="Explain why this document was rejected so the teacher can upload a valid replacement."
                />
                <div className="mt-1 flex items-center justify-between text-xs text-gray-500 tabular-nums">
                  <span>Required for rejected certificates.</span>
                  <span>{certificateRejectNotes.length}/500</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 bg-gray-50 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                className="btn-outline"
                onClick={closeCertificateRejectModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                onClick={() => void submitCertificateReject()}
                disabled={
                  certSubmittingAction?.id === certificateRejectTarget.id ||
                  certificateRejectNotes.trim().length === 0
                }
              >
                {certSubmittingAction?.id === certificateRejectTarget.id ? (
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
        </div>,
          document.body
        )}

      {/* Profile Review Modal */}
      {isProfileReviewModalOpen &&
        selectedTeacher &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center z-modal p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                closeProfileReviewModal();
              }
            }}
          >
            <div
              ref={profileReviewModalRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="profile-review-title"
              aria-describedby="profile-review-description"
              tabIndex={-1}
              className="bg-white rounded-2xl shadow-modal max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
            <div className="sticky top-0 bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-4 flex items-center justify-between">
              <h2 id="profile-review-title" className="text-2xl font-bold text-white">Review Teacher Profile</h2>
              <button
                onClick={closeProfileReviewModal}
                disabled={isSubmittingProfileReview}
                className="text-white hover:text-gray-200 transition-colors disabled:opacity-50"
                aria-label="Close profile review modal"
                type="button"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

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

              {selectedTeacherSpecialties.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeacherSpecialties.map((spec: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">{spec}</span>
                    ))}
                  </div>
                </div>
              )}

              {selectedTeacherLanguages.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-2">Languages</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTeacherLanguages.map((lang: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-medium">{lang}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>

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
                  placeholder={
                    profileReviewStatus === VerificationStatus.REJECTED
                      ? 'Rejection notes (required)'
                      : 'Review notes (optional)'
                  }
                  value={profileReviewNotes}
                  onChange={(e) => setProfileReviewNotes(e.target.value)}
                  maxLength={500}
                  aria-label="Review notes"
                />
              </div>
              <div className="flex gap-4 justify-end">
                <button
                  onClick={closeProfileReviewModal}
                  disabled={isSubmittingProfileReview}
                  className="btn-outline"
                  type="button"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void submitProfileReview()}
                  disabled={
                    isSubmittingProfileReview ||
                    (profileReviewStatus === VerificationStatus.REJECTED && !profileReviewNotes.trim())
                  }
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  type="button"
                >
                  {isSubmittingProfileReview ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : profileReviewStatus === VerificationStatus.APPROVED ? (
                    <>
                      <CheckCircle className="w-4 h-4" /> Approve
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
        </div>,
          document.body
        )}
    </div>
  );
};

export default VerificationTeachersManagement;
