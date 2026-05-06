import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from 'react';
import { AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';

import adminService from '@/services/admin.service';
import { UserRole, type User } from '@/types';
import { useOverlayAccessibility } from '@/hooks';
import clientLogger from '@/utils/logger';
import { extractErrorMessage, extractFieldErrors } from '@/utils/error-handler';

interface ExtendedUser extends User {
  phone?: string;
  address?: string;
  department?: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  user?: ExtendedUser;
  onClose: () => void;
  onSuccess: () => void;
}

interface UserFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  department: string;
  role: UserRole;
}

type FormErrors = Partial<Record<keyof UserFormData, string>> & Record<string, string>;

const DEFAULT_FORM_DATA: UserFormData = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  address: '',
  department: '',
  role: UserRole.STUDENT,
};

const ROLE_OPTIONS = [
  { value: UserRole.STUDENT, label: 'Student' },
  { value: UserRole.TEACHER, label: 'Teacher' },
];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;
const PHONE_PATTERN = /^[+()0-9\s-]{7,20}$/;

const buildFormDataFromUser = (user?: ExtendedUser): UserFormData => {
  if (!user) {
    return DEFAULT_FORM_DATA;
  }

  return {
    email: user.email ?? '',
    password: '',
    firstName: user.firstName ?? '',
    lastName: user.lastName ?? '',
    phone: user.phone ?? '',
    address: user.address ?? '',
    department: user.department ?? '',
    role: user.role ?? UserRole.STUDENT,
  };
};

const ErrorMessage = ({ id, message }: { id: string; message?: string }) => {
  if (!message) return null;

  return (
    <p
      id={id}
      className="mt-1 flex items-center gap-1 text-sm text-red-500"
      role="alert"
    >
      <AlertCircle className="h-4 w-4" />
      {message}
    </p>
  );
};

/**
 * UserFormModal
 *
 * Displays a modal form for creating a new user or editing an existing user.
 */
const UserFormModal = ({
  isOpen,
  user,
  onClose,
  onSuccess,
}: UserFormModalProps) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);
  const firstNameInputRef = useRef<HTMLInputElement | null>(null);

  const fieldIdPrefix = useId();

  const [formData, setFormData] = useState<UserFormData>(DEFAULT_FORM_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  const isEditing = Boolean(user);

  const modalTitle = isEditing ? 'Edit User' : 'Create New User';
  const modalDescription = isEditing
    ? 'Update the selected user information.'
    : 'Create a new platform user.';

  const initialFocusRef = isEditing ? firstNameInputRef : emailInputRef;

  const fieldIds = useMemo(
    () => ({
      email: `${fieldIdPrefix}-email`,
      password: `${fieldIdPrefix}-password`,
      firstName: `${fieldIdPrefix}-first-name`,
      lastName: `${fieldIdPrefix}-last-name`,
      phone: `${fieldIdPrefix}-phone`,
      address: `${fieldIdPrefix}-address`,
      department: `${fieldIdPrefix}-department`,
      role: `${fieldIdPrefix}-role`,
      title: `${fieldIdPrefix}-title`,
      description: `${fieldIdPrefix}-description`,
    }),
    [fieldIdPrefix]
  );

  useEffect(() => {
    if (!isOpen) return;

    setFormData(buildFormDataFromUser(user));
    setErrors({});
    setIsLoading(false);
  }, [isOpen, user]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    onClose();
  }, [isLoading, onClose]);

  useOverlayAccessibility({
    isOpen,
    containerRef: modalRef,
    initialFocusRef,
    onClose: handleClose,
    trapFocus: true,
    lockBodyScroll: true,
  });

  const clearFieldError = useCallback((field: keyof UserFormData) => {
    setErrors((currentErrors) => {
      if (!currentErrors[field]) return currentErrors;

      const nextErrors = { ...currentErrors };
      delete nextErrors[field];
      return nextErrors;
    });
  }, []);

  const handleTextInputChange =
    (field: keyof Omit<UserFormData, 'role'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setFormData((currentData) => ({
        ...currentData,
        [field]: event.target.value,
      }));

      clearFieldError(field);
    };

  const handleRoleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setFormData((currentData) => ({
      ...currentData,
      role: event.target.value as UserRole,
    }));

    clearFieldError('role');
  };

  const getInputClassName = (field: keyof UserFormData, disabled = false) => {
    return `w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:opacity-70 ${
      errors[field] ? 'border-red-500' : 'border-gray-300'
    } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;
  };

  const validateForm = useCallback(() => {
    const nextErrors: FormErrors = {};

    const email = formData.email.trim().toLowerCase();
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const phone = formData.phone.trim();

    if (!email) {
      nextErrors.email = 'Email is required.';
    } else if (!EMAIL_PATTERN.test(email)) {
      nextErrors.email = 'Please enter a valid email address.';
    }

    if (!isEditing) {
      if (!formData.password) {
        nextErrors.password = 'Password is required.';
      } else if (formData.password.length < 8) {
        nextErrors.password = 'Password must be at least 8 characters.';
      } else if (!PASSWORD_PATTERN.test(formData.password)) {
        nextErrors.password =
          'Password must include uppercase, lowercase, and a number.';
      }
    }

    if (!firstName) {
      nextErrors.firstName = 'First name is required.';
    }

    if (!lastName) {
      nextErrors.lastName = 'Last name is required.';
    }

    if (phone && !PHONE_PATTERN.test(phone)) {
      nextErrors.phone = 'Please enter a valid phone number.';
    }

    if (formData.role !== UserRole.STUDENT && formData.role !== UserRole.TEACHER) {
      nextErrors.role = 'This form can only manage student or teacher accounts.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [formData, isEditing]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isLoading) return;

    if (!validateForm()) {
      toast.error('Please fix the errors in the form.');
      return;
    }

    const cleanedData = {
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      firstName: formData.firstName.trim(),
      lastName: formData.lastName.trim(),
      phone: formData.phone.trim() || undefined,
      address: formData.address.trim() || undefined,
      department: formData.department.trim() || undefined,
      role: formData.role,
    };

    setIsLoading(true);

    try {
      if (user) {
        await adminService.updateUser(user.id, {
          firstName: cleanedData.firstName,
          lastName: cleanedData.lastName,
          phone: cleanedData.phone,
          address: cleanedData.address,
          department: cleanedData.department,
          role: cleanedData.role,
        });

        toast.success('User updated successfully.');
      } else {
        await adminService.createUser(cleanedData);
        toast.success('User created successfully.');
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      clientLogger.error(`Failed to ${isEditing ? 'update' : 'create'} user:`, error);

      const apiErrors = extractFieldErrors(error);

      if (Object.keys(apiErrors).length > 0) {
        setErrors(apiErrors);
      }

      toast.error(
        extractErrorMessage(error, `Failed to ${isEditing ? 'update' : 'create'} user`)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={fieldIds.title}
        aria-describedby={fieldIds.description}
        aria-busy={isLoading}
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-6">
          <h2 id={fieldIds.title} className="text-xl font-bold text-gray-900">
            {modalTitle}
          </h2>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="rounded-md text-gray-500 transition-colors hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Close user form modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p id={fieldIds.description} className="sr-only">
            {modalDescription}
          </p>

          <div>
            <label
              htmlFor={fieldIds.email}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Email <span className="text-red-500">*</span>
            </label>

            <input
              ref={emailInputRef}
              id={fieldIds.email}
              type="email"
              value={formData.email}
              onChange={handleTextInputChange('email')}
              disabled={isEditing || isLoading}
              className={getInputClassName('email', isEditing)}
              placeholder="user@example.com"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? `${fieldIds.email}-error` : undefined}
            />

            <ErrorMessage id={`${fieldIds.email}-error`} message={errors.email} />
          </div>

          {!isEditing && (
            <div>
              <label
                htmlFor={fieldIds.password}
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Password <span className="text-red-500">*</span>
              </label>

              <input
                id={fieldIds.password}
                type="password"
                value={formData.password}
                onChange={handleTextInputChange('password')}
                disabled={isLoading}
                className={getInputClassName('password')}
                placeholder="Enter password"
                minLength={8}
                autoComplete="new-password"
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password
                    ? `${fieldIds.password}-error`
                    : `${fieldIds.password}-hint`
                }
              />

              <p id={`${fieldIds.password}-hint`} className="mt-1 text-xs text-gray-500">
                Use at least 8 characters with uppercase, lowercase, and a number.
              </p>

              <ErrorMessage
                id={`${fieldIds.password}-error`}
                message={errors.password}
              />
            </div>
          )}

          <div>
            <label
              htmlFor={fieldIds.firstName}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              First Name <span className="text-red-500">*</span>
            </label>

            <input
              ref={firstNameInputRef}
              id={fieldIds.firstName}
              type="text"
              value={formData.firstName}
              onChange={handleTextInputChange('firstName')}
              disabled={isLoading}
              className={getInputClassName('firstName')}
              placeholder="John"
              autoComplete="given-name"
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={
                errors.firstName ? `${fieldIds.firstName}-error` : undefined
              }
            />

            <ErrorMessage
              id={`${fieldIds.firstName}-error`}
              message={errors.firstName}
            />
          </div>

          <div>
            <label
              htmlFor={fieldIds.lastName}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Last Name <span className="text-red-500">*</span>
            </label>

            <input
              id={fieldIds.lastName}
              type="text"
              value={formData.lastName}
              onChange={handleTextInputChange('lastName')}
              disabled={isLoading}
              className={getInputClassName('lastName')}
              placeholder="Doe"
              autoComplete="family-name"
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={
                errors.lastName ? `${fieldIds.lastName}-error` : undefined
              }
            />

            <ErrorMessage
              id={`${fieldIds.lastName}-error`}
              message={errors.lastName}
            />
          </div>

          <div>
            <label
              htmlFor={fieldIds.phone}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Phone
            </label>

            <input
              id={fieldIds.phone}
              type="tel"
              value={formData.phone}
              onChange={handleTextInputChange('phone')}
              disabled={isLoading}
              className={getInputClassName('phone')}
              placeholder="+60 12-345 6789"
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? `${fieldIds.phone}-error` : undefined}
            />

            <ErrorMessage id={`${fieldIds.phone}-error`} message={errors.phone} />
          </div>

          <div>
            <label
              htmlFor={fieldIds.address}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Address
            </label>

            <input
              id={fieldIds.address}
              type="text"
              value={formData.address}
              onChange={handleTextInputChange('address')}
              disabled={isLoading}
              className={getInputClassName('address')}
              placeholder="123 Main St, City, State"
              autoComplete="street-address"
            />
          </div>

          <div>
            <label
              htmlFor={fieldIds.department}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Department
            </label>

            <input
              id={fieldIds.department}
              type="text"
              value={formData.department}
              onChange={handleTextInputChange('department')}
              disabled={isLoading}
              className={getInputClassName('department')}
              placeholder="Engineering"
              autoComplete="organization-title"
            />
          </div>

          <div>
            <label
              htmlFor={fieldIds.role}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Role
            </label>

            <select
              id={fieldIds.role}
              value={formData.role}
              onChange={handleRoleChange}
              disabled={isLoading}
              className={getInputClassName('role')}
              aria-invalid={Boolean(errors.role)}
              aria-describedby={errors.role ? `${fieldIds.role}-error` : undefined}
            >
              {ROLE_OPTIONS.map((roleOption) => (
                <option key={roleOption.value} value={roleOption.value}>
                  {roleOption.label}
                </option>
              ))}
            </select>

            <ErrorMessage id={`${fieldIds.role}-error`} message={errors.role} />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserFormModal;
