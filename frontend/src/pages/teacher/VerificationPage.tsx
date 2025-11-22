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
      toast.info('Uploading document...');
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <button
            onClick={() => navigate('/teacher')}
            className="btn-outline mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center">
              <Shield className="w-8 h-8 mr-3 text-primary-600" />
              Teacher Verification
            </h1>
            <p className="text-gray-600">
              Verify your credentials to build trust with students and increase your visibility
            </p>
          </div>

          {/* Benefits Section */}
          <div className="card mb-6 bg-gradient-to-br from-primary-50 to-blue-50 border-primary-200">
            <h2 className="text-lg font-bold mb-3">Benefits of Verification</h2>
            <ul className="space-y-2">
              {[
                'Verified badge on your profile',
                'Higher ranking in search results',
                'Increased student trust and enrollment',
                'Access to premium features',
              ].map((benefit, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle className="w-5 h-5 text-primary-600 mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Verification Form */}
          {!showForm ? (
            <div className="card">
              <div className="text-center py-8">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Submit Verification Documents</h3>
                <p className="text-gray-600 mb-6">
                  Upload your teaching certificates, degrees, or identification documents
                </p>
                <button onClick={() => setShowForm(true)} className="btn-primary">
                  <Upload className="w-4 h-4 mr-2" />
                  Start Verification
                </button>
              </div>
            </div>
          ) : (
            <div className="card">
              <h2 className="text-xl font-bold mb-6">Upload Verification Document</h2>
              <form onSubmit={handleSubmitVerification} className="space-y-6">
                {/* Document Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
                  <p className="text-xs text-gray-500 mt-1">
                    Accepted formats: PDF, JPG, PNG (max 10MB)
                  </p>
                </div>

                {/* Upload Progress */}
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Uploading...</span>
                      <span className="font-semibold">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Guidelines */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="font-medium text-blue-900 mb-2">Document Guidelines:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Ensure document is clear and legible</li>
                    <li>• All information must be visible</li>
                    <li>• Document must be valid and not expired</li>
                    <li>• Photos should be well-lit and in focus</li>
                  </ul>
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-4">
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
                    className="btn-primary"
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
            <div className="card mt-6">
              <h2 className="text-xl font-bold mb-4">Verification History</h2>
              <div className="space-y-3">
                {verifications.map((verification) => (
                  <div
                    key={verification.id}
                    className="flex items-start justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="mt-1">{getStatusIcon(verification.status)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-medium capitalize">
                            {verification.documentType.replace(/_/g, ' ')}
                          </h3>
                          {getStatusBadge(verification.status)}
                        </div>
                        <p className="text-sm text-gray-600">
                          Submitted on{' '}
                          {new Date(verification.submittedAt).toLocaleDateString()}
                        </p>
                        {verification.reviewedAt && (
                          <p className="text-sm text-gray-600">
                            Reviewed on{' '}
                            {new Date(verification.reviewedAt).toLocaleDateString()}
                          </p>
                        )}
                        {verification.reviewNotes && (
                          <div className="mt-2 p-2 bg-white rounded border">
                            <p className="text-xs text-gray-500 mb-1">Admin Notes:</p>
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
          <div className="card mt-6">
            <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-medium mb-1">How long does verification take?</h3>
                <p className="text-sm text-gray-600">
                  Most verifications are reviewed within 2-3 business days.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1">What documents are accepted?</h3>
                <p className="text-sm text-gray-600">
                  Teaching certificates, academic degrees, professional licenses, and
                  government-issued IDs.
                </p>
              </div>
              <div>
                <h3 className="font-medium mb-1">What if my verification is rejected?</h3>
                <p className="text-sm text-gray-600">
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

