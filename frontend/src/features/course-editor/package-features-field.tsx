import { useId, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface PackageFeaturesFieldProps {
  features: string[];
  onChange: (features: string[]) => void;
}

const normalizeFeature = (value: string): string => value.trim().replace(/\s+/g, ' ');

export default function PackageFeaturesField({
  features,
  onChange,
}: PackageFeaturesFieldProps) {
  const inputId = useId();
  const helpTextId = useId();
  const [draftFeature, setDraftFeature] = useState('');

  const normalizedDraftFeature = normalizeFeature(draftFeature);
  const hasDuplicateFeature = features.some(
    (feature) => normalizeFeature(feature).toLowerCase() === normalizedDraftFeature.toLowerCase()
  );

  const handleAddFeature = () => {
    if (!normalizedDraftFeature || hasDuplicateFeature) {
      return;
    }

    onChange([...features, normalizedDraftFeature]);
    setDraftFeature('');
  };

  const handleRemoveFeature = (featureIndex: number) => {
    onChange(features.filter((_, index) => index !== featureIndex));
  };

  const canAddFeature = Boolean(normalizedDraftFeature) && !hasDuplicateFeature;

  return (
    <div>
      <label htmlFor={inputId} className="mb-2 block text-sm font-medium text-gray-700">
        Package Features *
      </label>

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={inputId}
          type="text"
          value={draftFeature}
          onChange={(event) => setDraftFeature(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              handleAddFeature();
            }
          }}
          className="input flex-1"
          placeholder="e.g., Lifetime access, Certificate of completion"
          aria-describedby={helpTextId}
        />
        <button
          type="button"
          onClick={handleAddFeature}
          disabled={!canAddFeature}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Add package feature"
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          Add
        </button>
      </div>

      <p id={helpTextId} className="mb-3 text-xs text-gray-500">
        Add clear benefits included in this package. Press Enter or click Add after each feature.
      </p>

      {hasDuplicateFeature ? (
        <p className="mb-3 text-sm font-medium text-red-600" role="alert">
          This feature has already been added.
        </p>
      ) : null}

      {features.length > 0 ? (
        <ul className="space-y-2" aria-label="Package features">
          {features.map((feature, index) => {
            const displayFeature = normalizeFeature(feature) || `Feature ${index + 1}`;

            return (
              <li
                key={`${displayFeature}-${index}`}
                className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 p-3"
              >
                <span className="text-sm text-gray-800">{displayFeature}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveFeature(index)}
                  className="rounded-md p-1 text-red-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                  title={`Remove feature: ${displayFeature}`}
                  aria-label={`Remove feature: ${displayFeature}`}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="rounded-lg bg-gray-50 px-4 py-5 text-center text-sm text-gray-500">
          No features added yet. Add at least one feature to describe what students will receive.
        </p>
      )}
    </div>
  );
}
