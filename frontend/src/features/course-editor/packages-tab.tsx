import { DollarSign, Plus, Trash2 } from 'lucide-react';
import type { LessonPackage } from '@/types';

interface CourseEditorPackagesTabProps {
  courseExists: boolean;
  packages: LessonPackage[];
  onAddPackage: () => void;
  onEditPackage: (packageId: string) => void;
  onRequestDelete: (packageId: string, packageName: string) => void;
}

const toNumber = (value: number | string | null | undefined): number => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const parsedValue = Number(value.trim());

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
};

const formatCurrency = (value: number | string | null | undefined): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(toNumber(value));

export default function CourseEditorPackagesTab({
  courseExists,
  packages,
  onAddPackage,
  onEditPackage,
  onRequestDelete,
}: CourseEditorPackagesTabProps) {
  if (!courseExists) {
    return (
      <div className="rounded-xl bg-gray-50 px-6 py-12 text-center">
        <DollarSign className="mx-auto mb-4 h-16 w-16 text-gray-300" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-800">Save course details first</h2>
        <p className="mt-2 text-sm text-gray-600">
          Pricing packages can be added after the basic course information has been saved.
        </p>
      </div>
    );
  }

  return (
    <section aria-labelledby="course-packages-heading">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="course-packages-heading" className="text-xl font-bold text-gray-900">
            Pricing Packages
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Create clear package options so students can choose the most suitable offer.
          </p>
        </div>

        <button type="button" onClick={onAddPackage} className="btn-primary self-start sm:self-auto">
          <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
          Add Package
        </button>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-xl bg-gray-50 px-6 py-12 text-center">
          <DollarSign className="mx-auto mb-4 h-16 w-16 text-gray-300" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-gray-800">No packages yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Add at least one pricing package with a price, discount, and package features before
            publishing your course.
          </p>
          <button type="button" onClick={onAddPackage} className="btn-primary mt-6">
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Create Your First Package
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((pkg, index) => {
            const packageName = pkg.name?.trim() || `Package ${index + 1}`;
            const description = pkg.description?.trim();
            const price = toNumber(pkg.price);
            const finalPrice = toNumber(pkg.finalPrice);
            const discount = toNumber(pkg.discount);
            const hasDiscount = discount > 0 && finalPrice < price;

            return (
              <article
                key={pkg.id}
                className="flex h-full flex-col rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div className="flex-1">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">{packageName}</h3>
                      {description ? (
                        <p className="mt-1 line-clamp-3 text-sm text-gray-600">{description}</p>
                      ) : (
                        <p className="mt-1 text-sm text-gray-400">No description provided.</p>
                      )}
                    </div>
                  </div>

                  <div className="mb-5 rounded-lg bg-gray-50 p-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-3xl font-extrabold text-primary-600">
                        {formatCurrency(finalPrice)}
                      </span>
                      {hasDiscount ? (
                        <span className="text-sm font-medium text-gray-500 line-through">
                          {formatCurrency(price)}
                        </span>
                      ) : null}
                    </div>

                    {hasDiscount ? (
                      <p className="mt-2 text-sm font-medium text-green-700">
                        You save {formatCurrency(discount)}
                      </p>
                    ) : (
                      <p className="mt-2 text-sm text-gray-500">Standard package price</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 border-t border-gray-100 pt-4">
                  <button
                    type="button"
                    onClick={() => onEditPackage(pkg.id)}
                    className="btn-sm btn-outline flex-1"
                    aria-label={`Edit package: ${packageName}`}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onRequestDelete(pkg.id, packageName)}
                    className="btn-sm rounded-md p-2 text-red-600 transition hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                    title={`Delete package: ${packageName}`}
                    aria-label={`Delete package: ${packageName}`}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
