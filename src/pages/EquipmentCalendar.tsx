import { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Package, UserCheck } from 'lucide-react';
import { useAppState, formatExpectedReturnAt, getExpectedReturnAt } from '../context';
import type { UserRole } from '../auth';

interface EquipmentCalendarProps {
  userRole: UserRole;
  currentUserEmail?: string;
}

type CalendarEventType = 'PENDING_APPROVAL' | 'WAITING_LIST' | 'ACTIVE_DUE' | 'RETURN_REVIEW' | 'RETURNED';

interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  detail: string;
  equipmentCode: string;
  studentName: string;
  type: CalendarEventType;
}

function toDateKey(value: string | Date): string {
  if (!value) return '';

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toISOString().split('T')[0];
  }

  if (Number.isNaN(value.getTime())) return '';
  return value.toISOString().split('T')[0];
}

function getMonthDays(year: number, month: number) {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const days = [];

  for (let i = 0; i < first.getDay(); i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= last.getDate(); day += 1) {
    days.push(new Date(year, month, day));
  }

  return days;
}

function eventStyles(type: CalendarEventType): string {
  switch (type) {
    case 'PENDING_APPROVAL':
      return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'WAITING_LIST':
      return 'bg-amber-50 text-amber-700 border-amber-100';
    case 'ACTIVE_DUE':
      return 'bg-red-50 text-red-700 border-red-100';
    case 'RETURN_REVIEW':
      return 'bg-orange-50 text-orange-700 border-orange-100';
    case 'RETURNED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  }
}

export default function EquipmentCalendar({
  userRole,
  currentUserEmail = '',
}: EquipmentCalendarProps) {
  const { applicationQueue, equipmentRows } = useAppState();
  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()));

  const cleanUserEmail = currentUserEmail.trim().toLowerCase();
  const isStaff = userRole === 'staff';

  const visibleApplications = useMemo(() => {
    if (isStaff) return applicationQueue;
    return applicationQueue.filter(
      (app) => app.formData.emailAddress.trim().toLowerCase() === cleanUserEmail
    );
  }, [applicationQueue, isStaff, cleanUserEmail]);

  const events = useMemo<CalendarEvent[]>(() => {
    const generatedEvents: CalendarEvent[] = [];

    visibleApplications.forEach((app) => {
      const studentName = app.formData.fullName;
      const equipmentCode = app.finalEquipmentCode || app.originalEquipmentCode || app.equipmentCode;

      if (app.stage === 'PENDING' && app.waitingListReason) {
        generatedEvents.push({
          id: `${app.id}-waiting`,
          date: toDateKey(app.submittedAt) || app.formData.dateBorrow,
          title: 'Waiting List',
          detail: app.waitingListReason,
          equipmentCode,
          studentName,
          type: 'WAITING_LIST',
        });
        return;
      }

      if (app.stage === 'PENDING') {
        generatedEvents.push({
          id: `${app.id}-pending`,
          date: toDateKey(app.submittedAt) || app.formData.dateBorrow,
          title: 'Borrow Approval',
          detail: 'Application waiting for staff approval.',
          equipmentCode,
          studentName,
          type: 'PENDING_APPROVAL',
        });
        return;
      }

      if (app.stage === 'ACTIVE_BORROW') {
        const expectedReturnAt = getExpectedReturnAt(app);

        generatedEvents.push({
          id: `${app.id}-due`,
          date: expectedReturnAt ? toDateKey(expectedReturnAt) : app.formData.dateBorrow,
          title: 'Expected Return',
          detail: formatExpectedReturnAt(app),
          equipmentCode,
          studentName,
          type: 'ACTIVE_DUE',
        });
        return;
      }

      if (app.stage === 'RETURN_PENDING') {
        generatedEvents.push({
          id: `${app.id}-return-review`,
          date: toDateKey(app.returnSubmittedAt || '') || app.returnDetails?.dateReturned || app.formData.dateBorrow,
          title: 'Return Review',
          detail: 'Student submitted return proof. Staff verification required.',
          equipmentCode,
          studentName,
          type: 'RETURN_REVIEW',
        });
        return;
      }

      if (app.stage === 'HISTORICAL' && app.status === 'RETURNED') {
        generatedEvents.push({
          id: `${app.id}-returned`,
          date: app.returnDetails?.dateReturned || toDateKey(app.returnVerifiedAt || '') || app.formData.dateBorrow,
          title: 'Returned',
          detail: 'Return verified and archived.',
          equipmentCode,
          studentName,
          type: 'RETURNED',
        });
      }
    });

    return generatedEvents.filter((event) => event.date);
  }, [visibleApplications]);

  const eventsByDate = useMemo(() => {
    const grouped: Record<string, CalendarEvent[]> = {};
    events.forEach((event) => {
      if (!grouped[event.date]) grouped[event.date] = [];
      grouped[event.date].push(event);
    });
    return grouped;
  }, [events]);

  const selectedDateEvents = eventsByDate[selectedDate] || [];
  const monthDays = getMonthDays(cursorDate.getFullYear(), cursorDate.getMonth());
  const monthLabel = cursorDate.toLocaleDateString('en-MY', {
    month: 'long',
    year: 'numeric',
  });

  const summary = {
    pending: events.filter((event) => event.type === 'PENDING_APPROVAL').length,
    waiting: events.filter((event) => event.type === 'WAITING_LIST').length,
    activeDue: events.filter((event) => event.type === 'ACTIVE_DUE').length,
    returnReview: events.filter((event) => event.type === 'RETURN_REVIEW').length,
  };

  const moveMonth = (offset: number) => {
    setCursorDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-[10px] text-gray-400 font-bold uppercase">Pending Approval</div>
          <div className="text-2xl font-black text-blue-700">{summary.pending}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-[10px] text-gray-400 font-bold uppercase">Waiting List</div>
          <div className="text-2xl font-black text-amber-700">{summary.waiting}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-[10px] text-gray-400 font-bold uppercase">Due Returns</div>
          <div className="text-2xl font-black text-red-700">{summary.activeDue}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="text-[10px] text-gray-400 font-bold uppercase">Return Review</div>
          <div className="text-2xl font-black text-orange-700">{summary.returnReview}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-utm-maroon" />
              <div>
                <h2 className="text-lg font-bold text-gray-900">Equipment Tracking Calendar</h2>
                <p className="text-xs text-gray-500">
                  Borrow approvals, waiting list entries, due returns, and return reviews.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="min-w-[160px] text-center font-bold text-gray-800">
                {monthLabel}
              </div>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 bg-gray-50 text-[10px] text-gray-500 font-bold uppercase border-b border-gray-200">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="px-3 py-2 border-r border-gray-100 last:border-r-0">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {monthDays.map((day, index) => {
              const dateKey = day ? toDateKey(day) : '';
              const dayEvents = dateKey ? eventsByDate[dateKey] || [] : [];
              const isSelected = dateKey === selectedDate;

              return (
                <button
                  key={day ? dateKey : `blank-${index}`}
                  type="button"
                  disabled={!day}
                  onClick={() => day && setSelectedDate(dateKey)}
                  className={`min-h-[120px] p-2 border-r border-b border-gray-100 text-left align-top disabled:bg-gray-50 disabled:cursor-default ${
                    isSelected ? 'bg-utm-maroon/5 ring-2 ring-inset ring-utm-maroon/30' : 'hover:bg-gray-50'
                  }`}
                >
                  {day && (
                    <>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-gray-700">{day.getDate()}</span>
                        {dayEvents.length > 0 && (
                          <span className="text-[10px] bg-gray-900 text-white px-1.5 py-0.5 rounded-full">
                            {dayEvents.length}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map((event) => (
                          <div
                            key={event.id}
                            className={`truncate border rounded px-1.5 py-0.5 text-[10px] font-bold ${eventStyles(event.type)}`}
                          >
                            {event.equipmentCode} {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] text-gray-400 font-bold">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Selected Day</h3>
            <p className="text-xs text-gray-500">{selectedDate}</p>
          </div>

          <div className="divide-y divide-gray-100">
            {selectedDateEvents.length === 0 ? (
              <div className="p-6 text-center text-gray-400 italic text-sm">
                No tracking events for this day.
              </div>
            ) : (
              selectedDateEvents.map((event) => (
                <div key={event.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`border rounded px-2 py-0.5 text-[10px] font-bold ${eventStyles(event.type)}`}>
                      {event.title}
                    </span>
                    <span className="font-mono text-xs font-bold text-gray-700">
                      {event.equipmentCode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-900">
                    <UserCheck className="w-3 h-3 text-gray-400" />
                    {event.studentName}
                  </div>
                  <div className="flex items-start gap-1 text-[11px] text-gray-500 leading-relaxed">
                    <Clock className="w-3 h-3 mt-0.5 text-gray-400" />
                    <span>{event.detail}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-600">
              <Package className="w-4 h-4 text-gray-400" />
              Tracking {equipmentRows.length} equipment rows and {events.length} workflow events.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
