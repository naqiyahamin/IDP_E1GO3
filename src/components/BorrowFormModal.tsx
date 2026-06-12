import { useState, useMemo } from 'react';
import { ArrowLeft, Send, Image as ImageIcon, X } from 'lucide-react';
import { useAppState } from '../context';

interface BorrowFormProps {
  equipmentCode: string;
  currentUserEmail: string;
  onSubmit: (data: BorrowFormData, photoAttachment?: string) => Promise<boolean>;
  onBack: () => void;
}

export interface BorrowFormData {
  fullName: string;
  yearCourse: string;
  duration: string;
  returnTime: string;
  dateBorrow: string;
  phoneNumber: string;
  emailAddress: string;
}

const VALIDATORS: Record<keyof BorrowFormData, (v: string, context?: string) => string | null> = {
  fullName: (v, emailAddress = '') => {
    if (!v.trim()) return 'Required';
    if (!/^[A-Za-z0-9\s]+$/.test(v)) return 'Only alphanumeric characters and spaces allowed';

    if (emailAddress.trim().toLowerCase().endsWith('@graduate.utm.my')) {
      const emailPrefix = emailAddress.trim().split('@')[0].toUpperCase();
      const isTestAccount = /^STUDENT\d+$/.test(emailPrefix);

      if (!isTestAccount && !v.toUpperCase().includes(emailPrefix)) {
        return `Security verification failed: Name must match your email identity ("${emailPrefix.toLowerCase()}")`;
      }
    }

    return null;
  },

  yearCourse: (v) => {
    if (!v.trim()) return 'Required';

    if (!/^\d\s*[\/\-]\s*[A-Za-z]+$/.test(v) && !/^\d\s*[A-Za-z]+$/.test(v)) {
      if (!/^\d\s*[\/\s]\s*[A-Za-z0-9]+$/.test(v)) {
        return 'Format example: 3 SKEE or 3/SKELH';
      }
    }

    return null;
  },

  duration: (v) => {
    if (!v.trim()) return 'Required';
    return null;
  },

  returnTime: (v) => {
    if (!v) return 'Required';
    return null;
  },

  dateBorrow: (v) => {
    if (!v) return 'Required';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Select a valid date';
    return null;
  },

  phoneNumber: (v) => {
    if (!v.trim()) return 'Required';

    const digits = v.replace(/\D/g, '');
    if (digits.length < 9 || digits.length > 12) {
      return 'Must be a valid active phone length sequence';
    }

    return null;
  },

  emailAddress: (v) => {
    if (!v.trim()) return 'Required';

    if (!/^[^\s@]+@graduate\.utm\.my$/.test(v) && !/^[^\s@]+@utm\.my$/.test(v)) {
      return 'Must end with @graduate.utm.my or @utm.my';
    }

    return null;
  },
};

export default function BorrowForm({
  equipmentCode,
  currentUserEmail,
  onSubmit,
  onBack,
}: BorrowFormProps) {
  const { getLastSubmittedForm } = useAppState();

  const [form, setForm] = useState<BorrowFormData>(() => {
    const savedForm = getLastSubmittedForm?.();

    return {
      fullName: savedForm?.fullName || '',
      yearCourse: savedForm?.yearCourse || '',
      duration: '',
      returnTime: '16:00',
      dateBorrow: new Date().toISOString().split('T')[0],
      phoneNumber: savedForm?.phoneNumber || '',
      emailAddress: currentUserEmail || savedForm?.emailAddress || '',
    };
  });

  const [photoAttachment, setPhotoAttachment] = useState<string>('');
  const [touched, setTouched] = useState<Partial<Record<keyof BorrowFormData, boolean>>>({});
  const [submitFeedback, setSubmitFeedback] = useState<'idle' | 'success' | 'error'>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const errors = useMemo(() => {
    const e: Partial<Record<keyof BorrowFormData, string>> = {};

    for (const key of Object.keys(form) as (keyof BorrowFormData)[]) {
      const err =
        key === 'fullName'
          ? VALIDATORS.fullName(form.fullName, form.emailAddress)
          : VALIDATORS[key](form[key]);

      if (err) e[key] = err;
    }

    return e;
  }, [form]);

  const allValid = Object.keys(errors).length === 0;

  const handleBlur = (field: keyof BorrowFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setPhotoAttachment(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const clearPhotoAttachment = () => {
    setPhotoAttachment('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setTouched({
      fullName: true,
      yearCourse: true,
      duration: true,
      returnTime: true,
      dateBorrow: true,
      phoneNumber: true,
      emailAddress: true,
    });

    if (!allValid || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setSubmitFeedback('idle');

      const success = await onSubmit(form, photoAttachment || undefined);

      if (success) {
        setSubmitFeedback('success');
        setTimeout(() => onBack(), 1500);
      } else {
        setSubmitFeedback('error');
      }
    } catch (error) {
      console.error('Borrow request submission failed:', error);
      setSubmitFeedback('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (field: keyof BorrowFormData) =>
    `w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-utm-maroon/30 focus:border-utm-maroon transition-all ${
      touched[field] && errors[field]
        ? 'border-red-300 bg-red-50/50'
        : 'border-gray-200 bg-white'
    }`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          type="button"
          disabled={isSubmitting}
          className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-gray-900">Borrow Equipment Form</h3>
          <p className="text-xs text-gray-500">
            Target Hardware Code:{' '}
            <span className="font-mono font-semibold text-utm-maroon">
              {equipmentCode}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden max-w-lg shadow-sm">
        <form onSubmit={handleSubmit} className="p-6 space-y-4" noValidate>
          <div className="text-[11px] font-bold tracking-wider text-gray-400 uppercase border-b border-gray-100 pb-1.5 mb-2">
            Personal Information Registry
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={form.fullName}
              disabled={isSubmitting}
              onChange={(e) =>
                setForm({ ...form, fullName: e.target.value.toUpperCase() })
              }
              onBlur={() => handleBlur('fullName')}
              className={fieldClass('fullName')}
              placeholder="e.g. AHMAD RAZIF"
            />
            {touched.fullName && errors.fullName && (
              <p className="text-[10px] text-red-500 mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Year / Course
            </label>
            <input
              type="text"
              value={form.yearCourse}
              disabled={isSubmitting}
              onChange={(e) =>
                setForm({ ...form, yearCourse: e.target.value.toUpperCase() })
              }
              onBlur={() => handleBlur('yearCourse')}
              className={fieldClass('yearCourse')}
              placeholder="e.g. 3 SKEE or 3/SKELH"
            />
            {touched.yearCourse && errors.yearCourse && (
              <p className="text-[10px] text-red-500 mt-1">{errors.yearCourse}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Duration
              </label>
              <input
                type="text"
                value={form.duration}
                disabled={isSubmitting}
                onChange={(e) =>
                  setForm({ ...form, duration: e.target.value.toUpperCase() })
                }
                onBlur={() => handleBlur('duration')}
                className={fieldClass('duration')}
                placeholder="e.g. 1 DAY or 2 HOURS"
              />
              {touched.duration && errors.duration && (
                <p className="text-[10px] text-red-500 mt-1">{errors.duration}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Return Time
              </label>
              <input
                type="time"
                value={form.returnTime}
                disabled={isSubmitting}
                onChange={(e) =>
                  setForm({ ...form, returnTime: e.target.value })
                }
                onBlur={() => handleBlur('returnTime')}
                className={fieldClass('returnTime')}
              />
              {touched.returnTime && errors.returnTime && (
                <p className="text-[10px] text-red-500 mt-1">
                  {errors.returnTime}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Date Borrow
            </label>
            <input
              type="date"
              value={form.dateBorrow}
              disabled={isSubmitting}
              onChange={(e) =>
                setForm({ ...form, dateBorrow: e.target.value })
              }
              onBlur={() => handleBlur('dateBorrow')}
              className={fieldClass('dateBorrow')}
            />
            {touched.dateBorrow && errors.dateBorrow && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.dateBorrow}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              value={form.phoneNumber}
              disabled={isSubmitting}
              onChange={(e) =>
                setForm({ ...form, phoneNumber: e.target.value })
              }
              onBlur={() => handleBlur('phoneNumber')}
              className={fieldClass('phoneNumber')}
              placeholder="e.g. 0123456789"
            />
            {touched.phoneNumber && errors.phoneNumber && (
              <p className="text-[10px] text-red-500 mt-1">
                {errors.phoneNumber}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={form.emailAddress}
              disabled
              className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200 outline-none"
              placeholder="name@graduate.utm.my"
            />
            <p className="text-[10px] text-emerald-600 mt-1 font-medium">
              ✓ Locked to your active authenticated student session credentials.
            </p>
          </div>

          <div className="pt-3 border-t border-gray-100">
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-gray-400" />
              <span>Attach Verification Document / Photo (Optional)</span>
            </label>

            <div className="space-y-3">
              <input
                type="file"
                accept="image/*"
                disabled={isSubmitting}
                onChange={handleFileChange}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-utm-maroon/10 file:text-utm-maroon hover:file:bg-utm-maroon/20 file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              />

              {photoAttachment && (
                <div className="relative inline-block border border-gray-200 rounded-xl bg-gray-50 p-1.5 pr-8 max-w-[200px]">
                  <img
                    src={photoAttachment}
                    alt="Borrow verification snapshot attachment"
                    className="w-full h-auto max-h-32 object-contain rounded-lg"
                  />

                  <button
                    type="button"
                    onClick={clearPhotoAttachment}
                    disabled={isSubmitting}
                    className="absolute top-1 right-1 w-5 h-5 bg-gray-900/80 text-white rounded-full flex items-center justify-center hover:bg-gray-900 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {submitFeedback === 'success' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-xs font-semibold">
              <Send className="w-3.5 h-3.5" />
              Application submitted successfully!
            </div>
          )}

          {submitFeedback === 'error' && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
              <X className="w-3.5 h-3.5" />
              Failed to submit application. Please try again.
            </div>
          )}

          <button
            type="submit"
            disabled={!allValid || isSubmitting || submitFeedback === 'success'}
            className={`w-full flex items-center justify-center gap-2 font-semibold text-sm py-2.5 rounded-lg transition-colors cursor-pointer ${
              allValid && !isSubmitting && submitFeedback !== 'success'
                ? 'bg-utm-maroon text-white hover:bg-utm-maroon-dark shadow-sm'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Submitting...' : 'Submit Borrow Request'}
          </button>
        </form>

        <div className="px-6 py-3 bg-utm-maroon/5 border-t border-utm-maroon/10">
          <p className="text-[11px] text-utm-maroon font-medium leading-relaxed">
            Please remember to update form before the due date to avoid your name from
            being blacklisted by the system.
          </p>
        </div>
      </div>
    </div>
  );
}