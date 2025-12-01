import { useEffect, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Eye, AlertCircle, Loader, UserPlus, X } from 'lucide-react';
import teacherService from '@/services/teacher.service';
import { TeacherProfile, VerificationStatus, RegistrationStatus, TeacherVerification } from '@/types';

/**
 * Verification Teachers Management Page
 * Admin panel for reviewing teacher registrations and profile verifications
 */
const VerificationTeachersManagement = () => {
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

  // Shared UI state
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherProfile | null>(null);
  const [isProfileReviewModalOpen, setIsProfileReviewModalOpen] = useState(false);
  const [profileReviewStatus, setProfileReviewStatus] = useState<VerificationStatus>(VerificationStatus.APPROVED);
  const [profileReviewNotes, setProfileReviewNotes] = useState('');
  const [isSubmittingProfileReview, setIsSubmittingProfileReview] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch pending teacher registrations
  const fetchPendingRegistrations = useCallback(async () => {
    setIsLoadingRegistrations(true);
    try {
      const result = await teacherService.getPendingRegistrations({ page: regPage, limit: 10 });
      setPendingRegistrations(result.teachers || []);
      setRegTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch pending registrations:', error);
      setErrorMessage('Failed to load pending teacher registrations.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoadingRegistrations(false);
    }
  }, [regPage]);

  // Fetch pending extended profiles
  const fetchPendingProfiles = useCallback(async () => {
    setIsLoadingProfiles(true);
    try {
      const result = await teacherService.getPendingProfileVerifications({ page: profPage, limit: 10 });
      setPendingProfiles(result.teachers || []);
      setProfTotalPages(result.pagination?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch pending profiles:', error);
      setErrorMessage('Failed to load pending profile verifications.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoadingProfiles(false);
    }
  }, [profPage]);

  // Fetch pending certificates
  const fetchPendingCertificates = useCallback(async () => {
    setIsLoadingCertificates(true);
    try {
      const result = await teacherService.getPendingCertificateVerifications();
      setPendingCertificates(result || []);
    } catch (error) {
      console.error('Failed to fetch pending certificates:', error);
      setErrorMessage('Failed to load pending certificate verifications.');
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setIsLoadingCertificates(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'registrations') {
      fetchPendingRegistrations();
    } else if (activeTab === 'profiles') {
      fetchPendingProfiles();
    } else if (activeTab === 'certificates') {
      fetchPendingCertificates();
    }
  }, [activeTab, regPage, profPage, fetchPendingRegistrations, fetchPendingProfiles, fetchPendingCertificates]);

  // Approve/Reject Certificate
  const handleReviewCertificate = async (verificationId: string, status: 'APPROVED' | 'REJECTED') => {
    setCertSubmittingId(verificationId);
    try {
      await teacherService.reviewCertificateVerification(verificationId, status);
      setSuccessMessage(`Certificate ${status === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      setTimeout(() => setSuccessMessage(''), 5000);
      fetchPendingCertificates();
    } catch (error) {
      let msg = 'Failed to review certificate.';
      if (error instanceof Error) {
        if ('response' in error) {
          const responseError = error as { response?: { data?: { message?: string } } };
          msg = responseError.response?.data?.message || msg;
        } else {
          msg = error.message || msg;
        }
      }
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setCertSubmittingId(null);
    }
  };

  // Approve/Reject Registration
  const handleReviewRegistration = async (teacherProfileId: string, status: RegistrationStatus) => {
    setRegSubmittingId(teacherProfileId);
    try {
      await teacherService.reviewRegistration(teacherProfileId, status);
      setSuccessMessage(`Registration ${status === RegistrationStatus.APPROVED ? 'approved' : 'rejected'} successfully.`);
      setTimeout(() => setSuccessMessage(''), 5000);
      fetchPendingRegistrations();
    } catch (error) {
      let errorMessage = 'Failed to review registration.';
      if (error instanceof Error) {
        if ('response' in error) {
          const responseError = error as { response?: { data?: { message?: string } } };
          errorMessage = responseError.response?.data?.message || errorMessage;
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      setErrorMessage(errorMessage);
      setTimeout(() => setErrorMessage(''), 5000);
    } finally {
      setRegSubmittingId(null);
    }
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
      setSuccessMessage(`Profile ${profileReviewStatus === VerificationStatus.APPROVED ? 'approved' : 'rejected'} successfully.`);
      setTimeout(() => setSuccessMessage(''), 5000);
      setIsProfileReviewModalOpen(false);
      fetchPendingProfiles();
    } catch (error) {
      let errorMessage = 'Failed to review profile.';
      if (error instanceof Error) {
        if ('response' in error) {
          const responseError = error as { response?: { data?: { message?: string } } };
          errorMessage = responseError.response?.data?.message || errorMessage;
        } else {
          errorMessage = error.message || errorMessage;
        }
      }
      setErrorMessage(errorMessage);
      setTimeout(() => setErrorMessage(''), 5000);
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isProfileReviewModalOpen) {
        setIsProfileReviewModalOpen(false);
      }
    };

    if (isProfileReviewModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isProfileReviewModalOpen]);

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
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                Teacher <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Verification</span>
              </h1>
              <p className="text-gray-500 font-medium">Review teacher registrations and profiles</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          <button
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'registrations' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('registrations')}
          >
            Registrations
          </button>
          <button
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${activeTab === 'profiles' ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}
            onClick={() => setActiveTab('profiles')}
          >
            Profile Verifications
          </button>
          <button
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
                                <img src={t.user.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
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
                                onClick={() => handleReviewRegistration(t.id, RegistrationStatus.REJECTED)}
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
                    <button onClick={() => setRegPage(Math.max(1, regPage - 1))} disabled={regPage === 1} className="btn-outline">Previous</button>
                    <button onClick={() => setRegPage(Math.min(regTotalPages, regPage + 1))} disabled={regPage === regTotalPages} className="btn-outline">Next</button>
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
                      {pendingProfiles.map((teacher) => (
                        <tr key={teacher.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center space-x-3">
                              {teacher.user?.avatar ? (
                                <img src={teacher.user.avatar} alt={`${teacher.user.firstName} ${teacher.user.lastName}`} className="w-10 h-10 rounded-full object-cover" />
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
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Pagination */}
                <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                  <p className="text-sm text-gray-600">Page {profPage} of {profTotalPages}</p>
                  <div className="flex gap-2">
                    <button onClick={() => setProfPage(Math.max(1, profPage - 1))} disabled={profPage === 1} className="btn-outline">Previous</button>
                    <button onClick={() => setProfPage(Math.min(profTotalPages, profPage + 1))} disabled={profPage === profTotalPages} className="btn-outline">Next</button>
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
            {isLoadingCertificates ? (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center space-y-4">
                  <div className="spinner" />
                  <p className="text-gray-600 font-medium">Loading pending certificates...</p>
                </div>
              </div>
            ) : pendingCertificates.length > 0 ? (
              <div className="card shadow-xl border border-gray-100 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b border-gray-200">
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Teacher</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Document Type</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Document</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Submitted At</th>
                        <th className="px-6 py-4 text-left text-sm font-bold text-gray-900">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingCertificates.map((cert) => (
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
                            <a 
                              href={cert.documentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:underline flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" /> View Document
                            </a>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">{formatDate(cert.submittedAt)}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                disabled={certSubmittingId === cert.id}
                                onClick={() => handleReviewCertificate(cert.id, 'APPROVED')}
                                className="px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                type="button"
                              >
                                {certSubmittingId === cert.id ? <Loader className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                Approve
                              </button>
                              <button
                                disabled={certSubmittingId === cert.id}
                                onClick={() => handleReviewCertificate(cert.id, 'REJECTED')}
                                className="px-3 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                                type="button"
                              >
                                {certSubmittingId === cert.id ? <Loader className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
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
            )}
          </>
        )}
      </div>

      {/* Profile Review Modal */}
      {isProfileReviewModalOpen && selectedTeacher && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={handleBackdropClick}
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-review-title"
        >
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                    id="review-status"
                    value={profileReviewStatus} 
                    onChange={(e) => setProfileReviewStatus(e.target.value as VerificationStatus)} 
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
