import { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import courseService from '@/services/course.service';
import toast from 'react-hot-toast';

interface PackageModalProps {
  courseId: string;
  packageId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface PackageFormData {
  name: string;
  description: string;
  price: number | string;
  discount: number | string;
  duration: number | string;
  maxStudents: number | string;
}

const PackageModal: React.FC<PackageModalProps> = ({
  courseId,
  packageId,
  onClose,
  onSuccess,
}) => {
  const isEditMode = !!packageId;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeature, setNewFeature] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<PackageFormData>({
    defaultValues: {
      price: 0,
      discount: 0,
      duration: 30,
      maxStudents: 100,
    },
  });

  const price = watch('price');
  const discount = watch('discount');
  const priceNum = typeof price === 'string' ? parseFloat(price) || 0 : price || 0;
  const discountNum = typeof discount === 'string' ? parseFloat(discount) || 0 : discount || 0;
  const finalPrice = Math.max(0, priceNum - discountNum);

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFeatures([...features, newFeature.trim()]);
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setFeatures(features.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: PackageFormData) => {
    if (features.length === 0) {
      toast.error('Please add at least one feature');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert string values to numbers
      const price = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
      const discount = typeof data.discount === 'string' ? parseFloat(data.discount) : data.discount;
      const duration = typeof data.duration === 'string' ? parseInt(data.duration, 10) : data.duration;
      const maxStudents = typeof data.maxStudents === 'string' ? parseInt(data.maxStudents, 10) : data.maxStudents;

      const packageData = {
        ...data,
        price,
        discount,
        duration,
        maxStudents,
        features,
      };

      if (isEditMode) {
        await courseService.updatePackage(packageId, packageData);
        toast.success('Package updated successfully!');
      } else {
        await courseService.createPackage(courseId, packageData);
        toast.success('Package created successfully!');
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save package:', error);
      const message = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { message?: string } } }).response?.data?.message 
        : error instanceof Error 
        ? error.message 
        : undefined;
      toast.error(message || 'Failed to save package');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {isEditMode ? 'Edit Package' : 'Create New Package'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Package Name *
            </label>
            <input
              type="text"
              {...register('name', { required: 'Name is required' })}
              className="input"
              placeholder="e.g., Basic, Premium, Ultimate"
            />
            {errors.name && (
              <p className="text-red-600 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              {...register('description')}
              rows={3}
              className="input"
              placeholder="Describe what's included in this package"
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                {...register('price', { required: 'Price is required', min: 0 })}
                className="input"
                placeholder="99.99"
              />
              {errors.price && (
                <p className="text-red-600 text-sm mt-1">{errors.price.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Discount ($)
              </label>
              <input
                type="number"
                step="0.01"
                {...register('discount', { min: 0 })}
                className="input"
                placeholder="10.00"
              />
            </div>
          </div>

          {/* Final Price Display */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Final Price:</span>
              <span className="text-2xl font-bold text-primary-600">
                ${finalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Duration and Max Students */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Access Duration (days)
              </label>
              <input
                type="number"
                {...register('duration', { min: 1 })}
                className="input"
                placeholder="30"
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave blank for lifetime access
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Students
              </label>
              <input
                type="number"
                {...register('maxStudents', { min: 1 })}
                className="input"
                placeholder="100"
              />
              <p className="text-xs text-gray-500 mt-1">
                For live sessions
              </p>
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Package Features *
            </label>
            
            {/* Feature Input */}
            <div className="flex items-center space-x-2 mb-3">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                className="input flex-1"
                placeholder="e.g., Lifetime access, Certificate of completion"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add
              </button>
            </div>

            {/* Features List */}
            {features.length > 0 ? (
              <ul className="space-y-2">
                {features.map((feature, index) => (
                  <li
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm">{feature}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                No features added yet. Add at least one feature.
              </p>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-outline"
            >
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? (
                <>
                  <div className="spinner mr-2"></div>
                  Saving...
                </>
              ) : isEditMode ? (
                'Update Package'
              ) : (
                'Create Package'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PackageModal;

