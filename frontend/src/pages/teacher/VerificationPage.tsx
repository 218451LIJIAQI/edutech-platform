import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Upload, CheckCircle, Clock, XCircle, ArrowLeft, FileText } from 'lucide-react';
import { TeacherVerification, VerificationStatus } from '@/types';
import teacherService from '@/services/teacher.service';
import uploadService from '@/services/upload.service';
import FileUpload from '@/components/common/FileUpload';
import toast from 'react-hot-toast';

/**
 * Teacher Verification Page
 * Interface for teachers to submit verification documents
 */
const VerificationPage = () => {
  const navigate = useNavigate();

  const [verifications, setVerifications] = useState<TeacherVerification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [documentType, setDocumentType] = useState('');
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    setIsLoading(true);
    try {
      const data = await teacherService.getMyVerifications();
      setVerifications(data);
    } catch (error) {
      console.error('Failed to fetch verifications:', error);
      toast.error('Failed to load verifications');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentType) {
      toast.error('Please select a document type');
      return;
    }

    if (!documentFile) {
      toast.error('Please upload a document');
      return;
    }

    setIsSubmitting(true);
    try {
      // Upload document
      toast.loading('Uploading document...');
      const documentUrl = await uploadService.uploadVerificationDoc(documentFile);

      // Submit verification
      await teacherService.submitVerification(documentType, documentUrl);
      
      toast.success('Verification submitted successfully!');
      setShowForm(false);
      setDocumentType('');
      setDocumentFile(null);
      
      // Refresh verifications
      await fetchVerifications();
    } catch (error) {
      console.error('Failed to submit verification:', error);
      toast.error('Failed to submit verification. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case VerificationStatus.REJECTED:
        return <XCircle className="w-5 h-5 text-red-600" />;
      case VerificationStatus.PENDING:
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case VerificationStatus.APPROVED:
        return <span className="badge-success">Approved</span>;
      case VerificationStatus.REJECTED:
        return <span className="badge-error">Rejected</span>;
      case VerificationStatus.PENDING:
        return <span className="badge-warning">Pending Review</span>;
      default:
        return <span className="badge">Unknown</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="spinner"></div>
          <p className="text-gray-600 font-medium">Loading verification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <button
            onClick={() => navigate('/teacher')}
            className="btn-outline mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="mb-10">
            <h1 className="section-title mb-3 flex items-center">
              <div className="p-2 bg-primary-100 rounded-xl mr-4">
                <Shield className="w-8 h-8 text-primary-600" />
              </div>
              Teacher Verification
            </h1>
            <p className="section-subtitle">
              Verify your credentials to build trust with students and increase your visibility
            </p>
          </div>

          {/* Benefits Section */}
          <div className="card mb-8 bg-gradient-to-br from-primary-50 to-blue-50 border-2 border-primary-200 shadow-xl rounded-2xl">
            <h2 className="text-xl font-bold mb-4 text-gray-900">Benefits of Verification</h2>
            <ul className="space-y-3">
              {[
                'Verified badge on your profile',
                'Higher ranking in search results',
                'Increased student trust and enrollment',
                'Access to premium features',
              ].map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <div className="p-1 bg-primary-200 rounded-lg mr-3 mt-0.5">
                    <CheckCircle className="w-5 h-5 text-primary-700" />
                  </div>
                  <span className="text-gray-700 font-medium text-lg">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Verification Form */}
          {!showForm ? (
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-10 h-10 text-primary-600" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-gray-900">Submit Verification Documents</h3>
                <p className="text-gray-600 mb-8 text-lg">
                  Upload your teaching certificates, degrees, or identification documents
                </p>
                <button onClick={() => setShowForm(true)} className="btn-primary btn-lg">
                  <Upload className="w-5 h-5 mr-2" />
                  Start Verification
                </button>
              </div>
            </div>
          ) : (
            <div className="card shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Upload Verification Document</h2>
              <form onSubmit={handleSubmitVerification} className="space-y-6">
                {/* Document Type */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Document Type *
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="input"
                    required
                  >
                    <option value="">Select document type</option>
                    <option value="teaching_certificate">Teaching Certificate</option>
                    <option value="degree">Academic Degree</option>
                    <option value="professional_license">Professional License</option>
                    <option value="id_card">Government ID</option>
                    <option value="other">Other Certification</option>
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <FileUpload
                    label="Upload Document *"
                    accept="image/*,application/pdf"
                    maxSize={10}
                    onFileSelect={setDocumentFile}
                    preview={true}
                  />
                  <p className="text-xs text-gray-500 mt-2 font-medium">
                    Accepted formats: PDF, JPG, PNG (max 10MB)
                  </p>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 font-medium">Uploading...</span>
                      <span className="font-bold text-primary-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-300 rounded-full h-3">
                      <div
                        className="bg-gradient-to-r from-primary-600 to-primary-700 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Guidelines */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 rounded-xl p-5">
                  <p className="font-bold text-blue-900 mb-3">Document Guidelines:</p>
                  <ul className="text-sm text-blue-800 space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Ensure document is clear and legible</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>All information must be visible</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Document must be valid and not expired</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">✓</span>
                      <span>Photos should be well-lit and in focus</span>
                    </li>
                  </ul>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false);
                      setDocumentType('');
                      setDocumentFile(null);
                    }}
                    className="btn-outline"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !documentFile}
                    className="btn-primary btn-lg"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center">
                        <div className="spinner mr-2"></div>
                        Submitting...
                      </span>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Submit for Review
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Verification History */}
          {verifications.length > 0 && (
            <div className="card mt-8 shadow-xl border border-gray-100 rounded-2xl">
              <h2 className="text-2xl font-bold mb-6 text-gray-900">Verification History</h2>
              <div className="space-y-4">
                {verifications.map((verification) => (
                  <div
                    key={verification.id}
                    className="flex items-start justify-between p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:border-gray-300 transition-all"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="mt-1 p-2 bg-white rounded-lg">{getStatusIcon(verification.status)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-bold capitalize text-gray-900">
                            {verification.documentType.replace(/_/g, ' ')}
                          </h3>
                          {getStatusBadge(verification.status)}
                        </div>
                        <p className="text-sm text-gray-600 mb-1">
                          Submitted on{' '}
                          {new Date(verification.submittedAt).toLocaleDateString()}
                        </p>
                        {verification.reviewedAt && (
                          <p className="text-sm text-gray-600 mb-2">
                            Reviewed on{' '}
                            {new Date(verification.reviewedAt).toLocaleDateString()}
                          </p>
                        )}
                        {verification.reviewNotes && (
                          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 mb-1 font-semibold">Admin Notes:</p>
                            <p className="text-sm text-gray-700">
                              {verification.reviewNotes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                    <a
                      href={verification.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-sm btn-outline"
                    >
                      <FileText className="w-4 h-4 mr-1" />
                      View
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="card mt-8 shadow-xl border border-gray-100 rounded-2xl">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">Frequently Asked Questions</h2>
            <div className="space-y-5">
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-bold mb-2 text-gray-900">How long does verification take?</h3>
                <p className="text-sm text-gray-700">
                  Most verifications are reviewed within 2-3 business days.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-bold mb-2 text-gray-900">What documents are accepted?</h3>
                <p className="text-sm text-gray-700">
                  Teaching certificates, academic degrees, professional licenses, and
                  government-issued IDs.
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <h3 className="font-bold mb-2 text-gray-900">What if my verification is rejected?</h3>
                <p className="text-sm text-gray-700">
                  You can resubmit with a different or clearer document. Check the admin
                  notes for specific feedback.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerificationPage;

