"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { 
  BookOpen, LogOut, Clock, Calendar, 
  Search, BookCopy, Bookmark, History, User, ArrowLeft, CheckCircle2, ShieldCheck, Activity, Package, Layers, Zap, Hexagon, Command, Cpu,
  Bell, Info, ChevronRight, Filter, AlertTriangle, Star
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { getSession, clearSession } from "@/lib/session";
import { validateSession } from "@/lib/session-validation";

export default function StudentLibraryDashboard() {
  const router = useRouter();
  const [sessionData, setSessionData] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [libSettings, setLibSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"dashboard" | "browse" | "history">("dashboard");
  const [searchQuery, setSearchQuery] = useState("");
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [reservationStatus, setReservationStatus] = useState<{[key: string]: string}>({});

  useEffect(() => {
    const validateAndFetchData = async () => {
      const initialSession = getSession();
      if (!initialSession) {
        router.push("/");
        return;
      }
      
      const isValid = await validateSession();
      const currentSessionData = getSession();
      if (!isValid || currentSessionData?.role !== 'student-library') {
        clearSession();
        router.push("/");
        return;
      }
      
      setSessionData(currentSessionData);
      if (currentSessionData?.id) fetchData(currentSessionData.id);
    };
    
    validateAndFetchData();
  }, []);

  const fetchData = async (userId: string) => {
    try {
      const { data: settings } = await supabase.from('library_settings').select('*, school_fonts(*)').eq('id', 'global').single();
      if (settings) setLibSettings(settings);

      const { data: books } = await supabase.from('books').select('*').order('title');
      setAllBooks(books || []);

      // Fetch loans
      const { data: borrowed } = await supabase
         .from('library_logs')
         .select('*, books(*)')
         .eq('student_id', userId)
         .is('return_date', null);
      
      // Fetch activity (Full Timeline)
      const { data: hist } = await supabase
         .from('library_logs')
         .select('*, books(*)')
         .eq('student_id', userId)
         .order('borrow_date', { ascending: false });

      setLoans(borrowed || []);
      setActivity(hist || []);

      // Fetch reservations
      const { data: res } = await supabase
         .from('library_reservations')
         .select('*, books(*)')
         .eq('student_id', userId)
         .not('status', 'eq', 'fulfilled');
      setReservations(res || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleOrder = async (bookId: string) => {
    const freshSession = getSession();
    if (!freshSession?.id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('library_reservations')
        .insert([{ student_id: freshSession.id, book_id: bookId, status: 'pending' }]);
      
      if (error) throw error;
      setReservationStatus(prev => ({ ...prev, [bookId]: 'pending' }));
      alert('✅ Reservation request submitted!');
      fetchData(freshSession.id);
    } catch (err: any) { 
      console.error(err);
      alert('❌ Failed to reserve book.');
    }
    finally { setLoading(false); }
  };

  const handleLogout = () => {
    clearSession();
    router.push("/");
  };

  const getStatusBadge = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return { label: 'Overdue', color: 'rose' };
    if (diff <= 3) return { label: 'Due Soon', color: 'amber' };
    return { label: 'Reading', color: 'emerald' };
  };

  const getCountdown = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diff < 0) return `${Math.abs(diff)} days overdue`;
    if (diff === 0) return "Due today";
    return `${diff} days left`;
  };

  const filteredBooks = allBooks.filter(b => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = 
      b.title.toLowerCase().includes(searchLower) || 
      b.author?.toLowerCase().includes(searchLower) ||
      b.book_id.toLowerCase().includes(searchLower) ||
      b.publisher?.toLowerCase().includes(searchLower) ||
      b.category?.toLowerCase().includes(searchLower) ||
      b.isbn?.toLowerCase().includes(searchLower) ||
      b.description?.toLowerCase().includes(searchLower);
    
    const matchesAvailability = showOnlyAvailable ? b.status === 'available' : true;
    return matchesSearch && matchesAvailability;
  });

  return (
    <div className={`min-h-screen bg-[#020617] text-white font-sans selection:bg-indigo-500/30 overflow-x-hidden pb-16 md:pb-24 ${libSettings?.school_fonts?.font_family ? 'library-context' : ''}`} style={libSettings?.school_fonts?.font_family ? ({ '--lib-font': libSettings.school_fonts.font_family } as any) : {}}>
      <style dangerouslySetInnerHTML={{ __html: libSettings?.school_fonts?.css_data || "" }} />
      
      <div className="fixed inset-0 pointer-events-none z-0">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600/[0.03] blur-[100px] rounded-full -mr-32 -mt-32" />
         <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/[0.02] blur-[100px] rounded-full -ml-32 -mb-32" />
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-8 relative z-10">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white/[0.02] border border-white/5 p-6 rounded-3xl backdrop-blur-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-all duration-1000" />
          
          <div className="flex items-center space-x-6 relative z-10">
            <div className="relative">
               <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center shadow-xl group-hover:scale-105 transition-transform duration-500">
                  <span className="text-2xl font-black text-white italic">{sessionData?.name?.[0].toUpperCase()}</span>
               </div>
               <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#020617] border border-white/10 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
               </div>
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter uppercase italic leading-none mb-1">{sessionData?.name}</h1>
              <div className="flex items-center space-x-2">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-500 italic">Identity Node: {sessionData?.roll}</p>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[6px] font-black uppercase tracking-widest border border-indigo-500/20 italic">
                  {sessionData?.role === 'student-library' ? 'Student' : sessionData?.role}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 mt-4 md:mt-0 relative z-10">
            <button className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all relative">
               <Bell className="w-4 h-4 text-gray-400" />
               {loans.some(l => getStatusBadge(l.due_date).label === 'Overdue') && (
                 <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
               )}
            </button>
            <button onClick={handleLogout} className="flex items-center space-x-2 px-6 py-3 bg-rose-600/5 hover:bg-rose-600 text-rose-500 hover:text-white rounded-xl border border-rose-500/10 transition-all font-black uppercase text-[9px] tracking-widest">
               <span>Disconnect</span>
               <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        {/* Bento Nav */}
        <nav className="flex justify-center space-x-3">
           {[
             { id: 'dashboard', label: 'Overview', icon: Hexagon },
             { id: 'browse', label: 'Library', icon: Zap },
             { id: 'history', label: 'History', icon: History }
           ].map((tab) => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 text-gray-500 hover:text-white'}`}
             >
               <tab.icon className="w-3.5 h-3.5" />
               <span>{tab.label}</span>
             </button>
           ))}
        </nav>

        <AnimatePresence mode="wait">
          {activeTab === "dashboard" && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-10">
              
              {/* Quick Stats Bento */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-blue-700 p-8 rounded-3xl relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 group-hover:scale-110 transition-transform" />
                   <Package className="w-10 h-10 text-white/20 mb-6" />
                   <h2 className="text-4xl font-black italic tracking-tighter mb-1">{loans.length}</h2>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-3xl flex flex-col items-center justify-center text-center group hover:border-emerald-500/20 transition-all">
                   <Star className="w-8 h-8 text-emerald-500/20 mb-4 group-hover:text-emerald-500 transition-colors" />
                   <h2 className="text-3xl font-black italic tracking-tighter mb-1">{activity.filter(a => a.return_date).length}</h2>
                   <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 italic">Total Read</p>
                </div>
                <div className="bg-white/[0.02] border border-white/5 p-8 rounded-3xl backdrop-blur-3xl flex flex-col items-center justify-center text-center group hover:border-amber-500/20 transition-all">
                   <Activity className="w-8 h-8 text-amber-500/20 mb-4 group-hover:text-amber-500 transition-colors" />
                   <h2 className="text-3xl font-black italic tracking-tighter mb-1">{reservations.length}</h2>
                   <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 italic">Requests</p>
                </div>
              </div>

              {/* Current Reads Section */}
              <div className="space-y-6">
                <h3 className="text-lg font-black uppercase italic tracking-[0.2em] text-gray-500 px-4">Current Reading Stack</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {loans.map((log) => {
                    const status = getStatusBadge(log.due_date);
                    return (
                      <div key={log.id} className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl group hover:bg-white/[0.03] transition-all relative overflow-hidden">
                        <div className={`absolute top-0 right-0 w-20 h-20 bg-${status.color}-500/5 rounded-full blur-xl -mr-10 -mt-10`} />
                        <div className="flex justify-between items-start mb-6">
                           <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform"><BookOpen className="w-5 h-5 text-indigo-400" /></div>
                           <span className={`px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest bg-${status.color}-500/10 text-${status.color}-400 border border-${status.color}-500/20 italic`}>{status.label}</span>
                        </div>
                        <h4 className="text-lg font-black italic tracking-tight mb-1 uppercase line-clamp-2 leading-tight">"{log.books?.title}"</h4>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-6 italic">{log.books?.author}</p>
                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                           <div className="flex items-center space-x-2 text-gray-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span className="text-[9px] font-black uppercase tracking-widest italic">{getCountdown(log.due_date)}</span>
                           </div>
                           <button onClick={() => setSelectedBook(log.books)} className="p-2.5 bg-white/5 hover:bg-indigo-600 rounded-lg transition-all"><Info className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    );
                  })}
                  {loans.length === 0 && (
                    <div className="md:col-span-3 py-16 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                       <Bookmark className="w-10 h-10 mx-auto mb-3" />
                       <p className="font-black uppercase italic text-[10px] tracking-widest">No Active Archives Detected</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Latest Catalog Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between px-4">
                  <h3 className="text-lg font-black uppercase italic tracking-[0.2em] text-gray-500">Recent Arrivals</h3>
                  <button onClick={() => setActiveTab('browse')} className="text-[8px] font-black uppercase tracking-widest text-indigo-400 hover:text-white transition-colors">View All Books</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {allBooks.slice(0, 3).map((book) => (
                    <div key={book.id} className="bg-white/[0.01] border border-white/5 p-6 rounded-2xl group hover:bg-white/[0.03] transition-all relative overflow-hidden flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                         <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform"><BookOpen className="w-5 h-5 text-emerald-400" /></div>
                         <span className={`px-3 py-1 rounded-full text-[7px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 italic`}>{book.status}</span>
                      </div>
                      <h4 className="text-lg font-black italic tracking-tight mb-1 uppercase line-clamp-2 leading-tight">"{book.title}"</h4>
                      <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-6 italic">{book.author || "Unknown Authority"}</p>
                      <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                         <span className="text-[10px] font-black text-indigo-400 italic">{book.category || 'General'}</span>
                         <button onClick={() => setSelectedBook(book)} className="p-2.5 bg-white/5 hover:bg-indigo-600 rounded-lg transition-all"><Info className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                  {allBooks.length === 0 && (
                    <div className="md:col-span-3 py-16 text-center border-2 border-dashed border-white/5 rounded-3xl opacity-20">
                       <Zap className="w-10 h-10 mx-auto mb-3" />
                       <p className="font-black uppercase italic text-[10px] tracking-widest">Master Catalog Offline</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "browse" && (
            <motion.div key="browse" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-10">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-600 w-4 h-4" />
                  <input 
                    value={searchQuery} 
                    onChange={(e) => setSearchQuery(e.target.value)} 
                    className="w-full bg-white/5 border border-white/5 rounded-xl py-4 pl-14 pr-6 text-white font-bold text-sm outline-none focus:ring-4 ring-indigo-500/10 placeholder:text-gray-700" 
                    placeholder="Search digital archive..." 
                  />
                </div>
                <button 
                  onClick={() => setShowOnlyAvailable(!showOnlyAvailable)}
                  className={`flex items-center space-x-2 px-6 py-4 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border ${showOnlyAvailable ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-white/5 border-white/5 text-gray-500'}`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>{showOnlyAvailable ? 'Available' : 'All Units'}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredBooks.map((book) => (
                  <motion.div 
                    layoutId={book.id}
                    key={book.id} 
                    className="group relative bg-[#0f172a]/40 border border-white/5 rounded-[2rem] overflow-hidden hover:border-indigo-500/30 transition-all duration-500 flex flex-col h-[420px]"
                  >
                    {/* Visual Background Element */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-12 -mt-12 group-hover:bg-indigo-500/10 transition-colors" />
                    
                    {/* Cover Section */}
                    <div className="relative h-52 w-full overflow-hidden p-4">
                       <div className="w-full h-full rounded-2xl overflow-hidden bg-black/40 border border-white/5 relative flex items-center justify-center group-hover:scale-[1.02] transition-transform duration-700 shadow-xl">
                          {book.cover_image_url ? (
                            <img src={book.cover_image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center space-y-3 opacity-20">
                               <BookOpen className="w-10 h-10 text-gray-400" />
                               <span className="text-[7px] font-black uppercase tracking-widest">No Visual</span>
                            </div>
                          )}
                          {/* Floating Badge */}
                          <div className="absolute top-3 right-3">
                             <span className={`px-3 py-1 rounded-full text-[6px] font-black uppercase tracking-widest backdrop-blur-xl border ${book.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                {book.status}
                             </span>
                          </div>
                       </div>
                    </div>

                    {/* Metadata Section */}
                    <div className="flex-1 p-6 pt-1 flex flex-col">
                       <div className="space-y-1 mb-4">
                          <p className="text-[7px] font-black text-indigo-500 uppercase tracking-[0.2em] italic">{book.category || 'General Archive'}</p>
                          <h4 className="text-lg font-black italic tracking-tighter uppercase line-clamp-2 leading-tight text-white group-hover:text-indigo-400 transition-colors duration-300">"{book.title}"</h4>
                          <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest italic">{book.author || "Anonymous Authority"}</p>
                       </div>

                       <div className="grid grid-cols-2 gap-3 mb-6">
                          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center">
                             <span className="text-[6px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Archive ID</span>
                             <span className="text-[9px] font-black text-gray-400 uppercase truncate">{book.book_id}</span>
                          </div>
                          <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center">
                             <span className="text-[6px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Valuation</span>
                             <span className="text-[11px] font-black text-white italic truncate">₹{book.rate}</span>
                          </div>
                       </div>

                       {/* Action Footer */}
                       <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2">
                          <button 
                            onClick={() => setSelectedBook(book)} 
                            className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all border border-white/5 flex items-center justify-center space-x-2"
                          >
                             <Info className="w-3 h-3" />
                             <span>Details</span>
                          </button>
                          
                          {book.status === 'available' ? (
                            <div className="px-4 py-3 bg-emerald-500/10 text-emerald-500 rounded-xl border border-emerald-500/10 flex items-center justify-center group/avail relative">
                               <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleOrder(book.id)} 
                              disabled={reservations.some(r => r.book_id === book.id)}
                              className={`flex-[1.5] py-3 rounded-xl transition-all flex items-center justify-center space-x-2 font-black uppercase text-[8px] tracking-widest ${
                                reservations.some(r => r.book_id === book.id) 
                                ? 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed' 
                                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/40 border border-indigo-500/50'
                              }`}
                            >
                              {reservations.some(r => r.book_id === book.id) ? (
                                <>
                                  <Clock className="w-3 h-3" />
                                  <span>Reserved</span>
                                </>
                              ) : (
                                <>
                                  <Zap className="w-3 h-3" />
                                  <span>Book</span>
                                </>
                              )}
                            </button>
                          )}
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6">
               <div className="bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-3xl">
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                     <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10"><History className="w-5 h-5 text-indigo-500" /></div>
                        <div>
                           <h2 className="text-xl font-black italic tracking-tighter uppercase">Transaction Log</h2>
                           <p className="text-[9px] font-black uppercase tracking-widest text-gray-500 italic">Archival Records</p>
                        </div>
                     </div>
                  </div>
                  <div className="divide-y divide-white/5">
                     {activity.map((item) => (
                       <div key={item.id} className="p-8 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                          <div className="flex items-center space-x-6">
                             <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/5 group-hover:scale-105 transition-transform overflow-hidden">
                                {item.books?.cover_image_url ? <img src={item.books.cover_image_url} alt="" className="w-full h-full object-cover" /> : <BookCopy className="w-5 h-5 text-gray-700" />}
                             </div>
                             <div>
                                <h4 className="text-base font-black italic tracking-tight uppercase group-hover:text-indigo-400 transition-colors">"{item.books?.title}"</h4>
                                <div className="flex items-center space-x-3 mt-1">
                                   <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 italic">
                                      {item.return_date ? `Returned: ${new Date(item.return_date).toLocaleDateString()}` : `Due: ${new Date(item.due_date).toLocaleDateString()}`}
                                   </p>
                                   <div className="w-1 h-1 bg-white/10 rounded-full" />
                                   <p className="text-[8px] font-black uppercase tracking-widest text-gray-500 italic">Issued: {new Date(item.borrow_date).toLocaleDateString()}</p>
                                </div>
                             </div>
                          </div>
                          <div className="flex items-center space-x-4">
                             <div className="text-right">
                                <p className={`text-[7px] font-black uppercase mb-0.5 italic ${item.return_date ? 'text-emerald-500' : 'text-amber-500'}`}>
                                   {item.return_date ? 'COMPLETED' : 'IN_TRANSIT'}
                                </p>
                                <p className="text-base font-black italic">₹{item.books?.rate}</p>
                             </div>
                             <ChevronRight className="w-4 h-4 text-gray-800 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                          </div>
                       </div>
                     ))}
                     {activity.length === 0 && (
                        <div className="py-24 text-center opacity-10 flex flex-col items-center">
                           <History className="w-12 h-12 mb-4" />
                           <p className="text-white font-black uppercase text-xs italic tracking-[0.4em]">Log Empty</p>
                        </div>
                     )}
                  </div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Book Detail Modal */}
        <AnimatePresence>
          {selectedBook && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-6"
              onClick={() => setSelectedBook(null)}
            >
              <motion.div 
                initial={{ scale: 0.95, y: 15 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 15 }}
                className="bg-[#0f172a] border border-white/10 w-full max-w-3xl rounded-3xl p-8 relative overflow-hidden flex flex-col md:flex-row gap-8"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-full md:w-64 h-80 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-center overflow-hidden shrink-0 shadow-2xl">
                   {selectedBook.cover_image_url ? (
                     <img src={selectedBook.cover_image_url} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <BookOpen className="w-12 h-12 text-gray-800" />
                   )}
                </div>
                <div className="flex-1 space-y-6">
                   <div className="flex justify-between items-start">
                      <div>
                         <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-1 leading-tight">"{selectedBook.title}"</h2>
                         <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 italic">Authored by {selectedBook.author || "Unknown"}</p>
                      </div>
                      <button onClick={() => setSelectedBook(null)} className="p-2.5 hover:bg-white/5 rounded-xl transition-all"><X className="w-5 h-5 text-gray-500" /></button>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                         <p className="text-[7px] font-black uppercase text-gray-500 mb-1 italic">Category</p>
                         <p className="text-[10px] font-bold text-white uppercase tracking-widest">{selectedBook.category || "General Archive"}</p>
                      </div>
                      <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                         <p className="text-[7px] font-black uppercase text-gray-500 mb-1 italic">Status</p>
                         <p className={`text-[10px] font-bold uppercase tracking-widest ${selectedBook.status === 'available' ? 'text-emerald-500' : 'text-rose-500'}`}>{selectedBook.status}</p>
                      </div>
                   </div>

                   <div className="space-y-3">
                      <p className="text-[7px] font-black uppercase text-gray-500 italic">Abstract</p>
                      <p className="text-xs text-gray-400 leading-relaxed font-medium line-clamp-4">{selectedBook.description || "No abstract data available for this archive unit."}</p>
                   </div>

                   <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-6 text-gray-500">
                         <div className="flex flex-col"><span className="text-[7px] font-black uppercase italic mb-0.5">Publisher</span><span className="text-[9px] font-bold text-white">{selectedBook.publisher || 'N/A'}</span></div>
                         <div className="flex flex-col"><span className="text-[7px] font-black uppercase italic mb-0.5">Language</span><span className="text-[9px] font-bold text-white">{selectedBook.language || 'English'}</span></div>
                         <div className="flex flex-col"><span className="text-[7px] font-black uppercase italic mb-0.5">ISBN</span><span className="text-[9px] font-bold text-white">{selectedBook.isbn || 'N/A'}</span></div>
                      </div>
                      <span className="text-2xl font-black italic tracking-tighter">₹{selectedBook.rate}</span>
                   </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="pt-16 opacity-10 flex flex-col items-center pb-8 space-y-3">
           <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/40 to-transparent" />
           <p className="text-[8px] font-black uppercase tracking-[0.4em] italic text-center text-white/60">Digital Archive Interface • v4.5</p>
        </footer>
      </div>
    </div>
  );
}

const X = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" height="24" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
    <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
  </svg>
)
