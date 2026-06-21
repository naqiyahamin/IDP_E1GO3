import {
  FlaskConical,
  Cpu,
  ClipboardList,
  UserCheck,
  Boxes,
  ListChecks,
  CalendarDays,
} from 'lucide-react';
import type { UserRole } from '../auth';

export type ActivePage =
  | 'laboratories'
  | 'equipment'
  | 'applications'
  | 'waiting-list'
  | 'calendar'
  | 'inventory'
  | 'staff';

interface SidebarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  userRole: UserRole;
}

export default function Sidebar({ activePage, onNavigate, userRole }: SidebarProps) {
  const navItems: { id: ActivePage; label: string; icon: React.ElementType }[] = [
    { id: 'laboratories', label: 'Laboratory List', icon: FlaskConical },
    { id: 'equipment', label: 'Equipment Availability', icon: Cpu },
    {
      id: 'applications',
      label: userRole === 'staff' ? 'Application Verification' : 'Application Status',
      icon: ClipboardList,
    },
  ];

  if (userRole === 'staff') {
    navItems.push(
      {
        id: 'waiting-list',
        label: 'Waiting List',
        icon: ListChecks,
      },
      {
        id: 'calendar',
        label: 'Equipment Calendar',
        icon: CalendarDays,
      },
      {
        id: 'inventory',
        label: 'Inventory Management',
        icon: Boxes,
      }
    );
  }

  navItems.push({ id: 'staff', label: 'Staff On Duty', icon: UserCheck });

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-utm-maroon-dark flex flex-col z-50">
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-utm-gold flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-utm-maroon-dark" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">UTM FKE</h1>
            <p className="text-utm-gold text-xs font-medium">Lab Inventory</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`sidebar-link w-full text-left ${
                isActive ? 'sidebar-link-active' : 'sidebar-link-inactive'
              }`}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-gray-400 text-xs">Faculty of Electrical Engineering</p>
        <p className="text-gray-500 text-[10px] mt-1">Universiti Teknologi Malaysia</p>
      </div>
    </aside>
  );
}
