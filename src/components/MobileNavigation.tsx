"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Home, BookOpen, Wallet, User, LogOut, ShieldCheck, MoreVertical, Banknote, UsersRound, MessageSquare, Archive, Settings, Activity } from "lucide-react";
import { getSession, clearSession } from "@/lib/session";

interface NavItem {
  path: string;
  label: string;
  shortLabel?: string;
  icon: any;
}

interface MobileNavProps {
  userRole?: string;
  userName?: string;
}

export default function MobileNavigation({}: MobileNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [currentAdminTab, setCurrentAdminTab] = useState('overview');

  const userRole = session?.role;
  const userName = session?.name;

  useEffect(() => {
    setIsMounted(true);
    const s = getSession();
    setSession(s);
  }, [pathname]);

  useEffect(() => {
    if (!isMounted || session?.role !== 'admin') return;
    
    // Sync current tab with URL if applicable
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab) {
      setCurrentAdminTab(tab);
    }
  }, [isMounted, session, pathname]);

  const handleLogout = () => {
    clearSession();
    setIsOpen(false);
    setShowMoreMenu(false);
    router.push("/");
  };

  const navigateTo = (path: string) => {
    setIsOpen(false);
    setShowMoreMenu(false);
    router.push(path);
  };

  // Define navigation items based on user role
  const getNavItems = (): NavItem[] => {
    if (!session) return [];

    switch (session.role) {
      case 'admin':
        return [
          { path: '/admin?students', label: 'Personnel', icon: UsersRound, shortLabel: 'Staff' },
        ];
      case 'responsible':
        return [
          { path: '/responsible', label: 'Librarian', icon: ShieldCheck, shortLabel: 'Staff' },
        ];
      case 'student-library':
        return [
          { path: '/student/library', label: 'Library', icon: BookOpen },
        ];
      default:
        return [];
    }
  };

  // Get more menu items for admin
  const getMoreItems = (): NavItem[] => {
    if (session?.role !== 'admin') return [];
    return [
      { path: '/admin?active-users', label: 'Active Users', icon: Activity, shortLabel: 'Users' },
      { path: '/admin?notifications', label: 'Messaging', icon: MessageSquare, shortLabel: 'Messages' },
      { path: '/admin?settings', label: 'Security Protocol', icon: Settings, shortLabel: 'Security' },
    ];
  };

  const navItems = getNavItems();
  const moreMenuItems = getMoreItems();

  // Don't show nav on login page, admin routes, or before mount
  if (pathname === '/' || pathname?.startsWith('/admin') || !isMounted) return null;

  const handleTabChange = (tabName: string) => {
    setCurrentAdminTab(tabName);
    router.push(`/admin?tab=${tabName}`);
    setShowMoreMenu(false);
  };

  return (
    <>
      {/* Mobile Navigation Bar - Fixed Bottom */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#020617]/95 backdrop-blur-xl border-t border-white/10 safe-area-bottom">
        <div className="flex items-center justify-around px-2 py-2">
          {session?.role === 'admin' ? (
            <>
              {/* Admin Navigation Tabs */}
              {[
                { id: 'students', label: '', icon: UsersRound },
              ].map((tab) => {
                const isActive = currentAdminTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex flex-col items-center space-y-0.5 px-2 py-1.5 rounded-lg transition-all flex-1 ${
                      isActive 
                        ? 'text-indigo-400 bg-indigo-500/10' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                    {tab.label && <span className="text-[8px] font-black uppercase tracking-wide">{tab.label}</span>}
                  </button>
                );
              })}
              
              {/* More Menu Button */}
              <div className="relative flex-1">
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className={`flex flex-col items-center space-y-0.5 px-2 py-1.5 rounded-lg transition-all w-full ${
                    showMoreMenu 
                      ? 'text-indigo-400 bg-indigo-500/10' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <MoreVertical className="w-5 h-5" />
                  <span className="text-[8px] font-black uppercase tracking-wide">More</span>
                </button>

                {/* More Menu Dropdown */}
                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0f172a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden min-w-[200px]"
                    >
                      <div className="p-2 space-y-1">
                        {/* Additional Admin Options */}
                        {[
                          { id: 'active-users', label: 'Active Users', icon: Activity },
                          { id: 'notifications', label: 'Messaging', icon: MessageSquare },
                          { id: 'settings', label: 'Security Protocol', icon: Settings },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id)}
                            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all text-left"
                          >
                            <item.icon className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs font-black uppercase tracking-wider text-gray-300">{item.label}</span>
                          </button>
                        ))}
                        
                        {/* Divider */}
                        <div className="h-px bg-white/10 my-1" />
                        
                        {/* Logout Option */}
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-rose-500/10 transition-all text-left"
                        >
                          <LogOut className="w-4 h-4 text-rose-500" />
                          <span className="text-xs font-black uppercase tracking-wider text-rose-500">Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <>
              {/* Non-admin navigation */}
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname.includes(item.path.split('?')[0]);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => navigateTo(item.path)}
                    className={`flex flex-col items-center space-y-0.5 px-2 py-1.5 rounded-lg transition-all flex-1 ${
                      isActive 
                        ? 'text-indigo-400 bg-indigo-500/10' 
                        : 'text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'scale-110' : ''}`} />
                    <span className="text-[8px] font-black uppercase tracking-wide">{item.shortLabel || item.label}</span>
                  </button>
                );
              })}
              
              {/* Logout Button for non-admin */}
              <button
                onClick={handleLogout}
                className="flex flex-col items-center space-y-0.5 px-2 py-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all flex-1"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-wide">Logout</span>
              </button>
            </>
          )}
        </div>
      </nav>

      {/* Desktop/Tablet Top Navigation */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 bg-[#020617]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto w-full px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-white italic">
                School Manager
              </span>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center space-x-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.path;
                
                return (
                  <button
                    key={item.path}
                    onClick={() => navigateTo(item.path)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                      isActive
                        ? 'text-indigo-400 bg-indigo-500/10'
                        : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* User Profile Info */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-8 h-8 bg-indigo-500/10 rounded-lg flex items-center justify-center font-black text-indigo-500 border border-indigo-500/20">
                  {session?.name?.[0].toUpperCase()}
                </div>
                <div className="hidden lg:block">
                  <p className="text-[10px] font-black text-white uppercase italic truncate max-w-[120px] leading-none mb-1">{session?.name}</p>
                  <span className={`px-2 py-0.5 rounded text-[6px] font-black uppercase tracking-widest border italic ${
                    session?.role === 'admin' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                    session?.role === 'responsible' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}>
                    {session?.role === 'student-library' ? 'Student' : session?.role}
                  </span>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 bg-rose-600/10 hover:bg-rose-600 text-rose-500 hover:text-white rounded-lg border border-rose-500/20 transition-all"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="text-xs font-black uppercase tracking-wider">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header with Menu Button (for pages with sidebar) */}
      {(userRole === 'admin' || userRole === 'responsible') && (
        <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-[#020617]/95 backdrop-blur-xl border-b border-white/5 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg flex items-center justify-center">
                <ShieldCheck className="w-4 h-4 text-white" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white italic">
                {userRole === 'admin' ? 'Admin Panel' : 'Library Terminal'}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 bg-rose-600/10 text-rose-500 rounded-lg border border-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Spacer for desktop nav */}
      <div className="hidden md:block h-16" />
      
      {/* Spacer for mobile elements */}
      <div className={`md:hidden ${(userRole === 'admin' || userRole === 'responsible') ? 'h-14' : 'h-20'}`} />
    </>
  );
}
