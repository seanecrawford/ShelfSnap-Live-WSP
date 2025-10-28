
import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Briefcase, CheckSquare, Calendar, Users, BarChart, DollarSign,
  HeartHandshake, UserCheck, MessageSquare, GraduationCap, Settings, ChevronDown,
  X, Sparkles, Package
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const navigationGroups = [
  {
    title: 'Operations',
    items: [
      { to: '/project-management', icon: Briefcase, label: 'Project Management' },
      { to: '/task-board', icon: CheckSquare, label: 'Task Board' },
      { to: '/scheduling', icon: Calendar, label: 'Scheduling' },
      { to: '/resource-overview', icon: Users, label: 'Resource Overview' },
    ],
  },
  {
    title: 'Business Suite',
    items: [
      { to: '/analytics', icon: BarChart, label: 'Analytics' },
      { to: '/finance-hub', icon: DollarSign, label: 'Finance Hub' },
      { to: '/team-management', icon: UserCheck, label: 'Team Management' },
      { to: '/human-resources', icon: HeartHandshake, label: 'Human Resources' },
    ],
  },
  {
    title: 'Company Tools',
    items: [
      { to: '/communication-hub', icon: MessageSquare, label: 'Communication Hub' },
      { to: '/work-suite-academy', icon: GraduationCap, label: 'Work Suite Academy' },
    ],
  },
  {
    title: 'Modules',
    items: [
      { to: '/boardroom', icon: Users, label: 'Boardroom AI' },
      { to: '/shelfsnap', icon: Package, label: 'ShelfSnap' },
    ],
  },
];

const NavItem = ({ item, onClick }) => (
  <NavLink
    to={item.to}
    onClick={onClick}
    className={({ isActive }) =>
      cn(
        "flex items-center gap-3.5 px-4 py-2.5 rounded-lg transition-all text-sm font-medium",
        "hover:bg-slate-800/60",
        isActive ? "bg-blue-500/10 text-blue-300" : "text-slate-400 hover:text-slate-200"
      )
    }
  >
    <item.icon className="w-5 h-5" />
    <span>{item.label}</span>
  </NavLink>
);

const SidebarContent = ({ onClose, currentUser }) => {
  const [openSections, setOpenSections] = useState(['Operations', 'Business Suite', 'Company Tools', 'Modules']);

  const toggleSection = (title) => {
    setOpenSections(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    );
  };

  return (
    <>
      <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0 h-16">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="font-bold text-lg text-white">Work Suite</h2>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white" aria-label="Close sidebar">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-grow overflow-y-auto p-4 space-y-6">
        <NavItem item={{ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' }} onClick={onClose} />

        <div className="space-y-4">
          {navigationGroups.map(group => (
            <Collapsible key={group.title} open={openSections.includes(group.title)} onOpenChange={() => toggleSection(group.title)}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 text-xs font-semibold tracking-wider uppercase text-slate-500 hover:text-slate-400 transition-colors">
                {group.title}
                <ChevronDown className={cn("w-4 h-4 transition-transform", openSections.includes(group.title) && "rotate-180")} />
              </CollapsibleTrigger>
              <CollapsibleContent asChild>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="space-y-1 mt-2 overflow-hidden pl-2"
                >
                  {group.items.map(item => <NavItem key={item.to} item={item} onClick={onClose} />)}
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-800 mt-auto flex-shrink-0 space-y-4">
        <div className="flex items-center gap-3 px-4 py-2">
          <Avatar>
            <AvatarFallback className="bg-slate-700 text-slate-300">
              {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="text-left overflow-hidden">
            <p className="text-sm font-medium text-white truncate">{currentUser?.name}</p>
            <p className="text-xs text-slate-400 truncate">{currentUser?.email}</p>
          </div>
        </div>
        <NavItem item={{ to: '/settings', icon: Settings, label: 'System' }} onClick={onClose} />
      </div>
    </>
  );
};


const Sidebar = ({ isOpen, onClose, currentUser }) => {
  return (
    <>
      {/* Mobile Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              aria-hidden="true"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed top-0 left-0 z-50 h-full w-64 bg-slate-900 border-r border-slate-800 flex flex-col lg:hidden"
            >
              <SidebarContent onClose={onClose} currentUser={currentUser} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 fixed top-0 left-0 h-full bg-slate-900 border-r border-slate-800">
        <SidebarContent onClose={() => {}} currentUser={currentUser} />
      </aside>
    </>
  );
};

export default Sidebar;
