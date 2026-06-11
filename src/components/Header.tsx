import { Bell, Search, LogOut } from 'lucide-react';
import type { ActivePage } from './Sidebar';
import type { AllowedUser } from '../auth';

const pageTitles: Record<ActivePage, string> = {
  laboratories: 'Laboratory List',
  equipment: 'Equipment Availability',
  applications: 'Application Status',
  staff: 'Staff On Duty',
};

interface HeaderProps {
  activePage: ActivePage;
  user: AllowedUser;
  onLogout: () => void;
}

export default function Header({ activePage, user, onLogout }: HeaderProps) {
  const initials = user.email.substring(0, 2).toUpperCase();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 sticky top-0 z-40">
      <div>
        <h2 className="text-lg font-bold text-gray-900">
          {pageTitles[activePage]}
        </h2>
        <p className="text-xs text-gray-500">
          Faculty of Electrical Engineering &mdash; Lab Management System
        </p>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-utm-maroon/30 focus:border-utm-maroon w-64 transition-all"
          />
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-600" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-utm-gold rounded-full" />
        </button>

        {/* User info + Logout */}
        <div className="flex items-center gap-3 pl-3 border-l border-gray-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-gray-900">{user.name}</p>
            <p className="text-[10px] text-gray-500">{user.email}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-utm-maroon flex items-center justify-center text-white text-sm font-semibold">
            {initials}
          </div>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}