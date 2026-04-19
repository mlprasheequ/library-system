"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  enrollStudent,
  deleteStudent,
  addBook,
} from "@/lib/school-actions";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, LogOut, BookOpen, Trash2, UserPlus, BookCopy,
  Plus, ShieldCheck, Mail, CheckCircle2, User, Layout, Archive,
  Search, Menu, MoreVertical, X, Save, Activity, Package, Library, Bookmark,
  Clock, History, Settings, AlertTriangle, TrendingUp, Star,
  BarChart3, ShieldAlert, Key, RefreshCw, Upload, Download, FileText, Zap, PenTool, Code, QrCode, Info, Scan, UserCircle
} from "lucide-react";
import { clearSession, getSession } from "@/lib/session";
import { validateSession } from "@/lib/session-validation";
import { Student, Book, LibraryLog } from "@/lib/types";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QrScanner from "@/components/QrScanner";

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "settings" | "logs" | "inventory" | "management">("overview");
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [books, setBooks] = useState<Book[]>([]);
  const [logs, setLogs] = useState<LibraryLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [bookSearchTerm, setBookSearchTerm] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showAddBook, setShowAddBook] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [showEditUser, setShowEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Student | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<LibraryLog[]>([]);
  const [showEditBook, setShowEditBook] = useState(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<Book | null>(null);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [selectedBookDetails, setSelectedBookDetails] = useState<Book | null>(null);
  
  const [categories, setCategories] = useState<string[]>([
    'General', 'Reference', 'الْكُتُب'
  ]);
  const [newCat, setNewCat] = useState("");
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editCategoryValue, setEditCategoryValue] = useState("");

  const [newUser, setNewUser] = useState({ name: "", roll: "", class: "", phone: "", username: "", password: "", is_responsible: false, is_admin: false });
  const [newBookData, setNewBookData] = useState({ 
    title: "", book_id: "", author: "", publisher: "", category: "", subcategory: "", rate: "", 
    shelf: "", row: "", language: "English", price: "", cover_image_url: "", 
    isbn: "", pages: "", description: "" 
  });
  const [globalSettings, setGlobalSettings] = useState<any>({ due_days: 14, max_books: 3, categories: [] });
  const [adminProfile, setAdminProfile] = useState({ username: "", password: "" });

  const normalizeCategories = (rawCategories: any[]) => {
    const loadedCategories = (rawCategories || [])
      .map((cat: any) => {
        if (typeof cat === 'string') return cat.trim();
        if (cat && typeof cat.name === 'string') return cat.name.trim();
        return "";
      })
      .filter(Boolean);

    const uniqueCategories = [...new Set(loadedCategories)];
    if (uniqueCategories.length === 0) return ['General', 'Reference', 'الْكُتُب'];
    return uniqueCategories;
  };

  const getBookDisplayPrice = (book: any) => {
    const rawPrice = book?.price ?? book?.valuation ?? book?.rate;
    if (rawPrice === undefined || rawPrice === null || rawPrice === "") return null;
    return rawPrice;
  };

  useEffect(() => {
    const validateAndFetch = async () => {
      const isValid = await validateSession();
      const adminSessionData = getSession();
      if (!isValid || adminSessionData?.role !== 'admin') {
        clearSession();
        router.push("/");
        return;
      }
      
      // Only set profile if it's the first load or something changed
      if (adminSessionData?.id) {
        const { data: admin } = await supabase.from('students').select('username, password').eq('id', adminSessionData.id).single();
        if (admin) setAdminProfile(prev => ({ ...prev, username: admin.username }));
      }
      
      await fetchData();
    };
    
    validateAndFetch();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: s, error: sErr },
        { data: b, error: bErr },
        { data: l, error: lErr },
        { data: settings, error: setErr }
      ] = await Promise.all([
        supabase.from('students').select('*').order('is_admin', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('books').select('*').order('created_at', { ascending: false }),
        supabase.from('library_logs').select('*, students(*), books(*)').order('borrow_date', { ascending: false }),
        supabase.from('library_settings').select('*').eq('id', 'global').maybeSingle()
      ]);

      if (sErr) console.error("Students Fetch Error:", sErr);
      if (bErr) console.error("Books Fetch Error:", bErr);
      if (lErr) console.error("Logs Fetch Error:", lErr);

      setStudents(s || []);
      setBooks(b || []);
      setLogs(l || []);
      if (settings) {
        setGlobalSettings(settings);
        if (settings.categories && settings.categories.length > 0) {
          setCategories(normalizeCategories(settings.categories));
        }
      }
    } catch (err) {
      console.error("System Data Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const adminSession = getSession();
    if (!adminSession?.id) return;
    setLoading(true);
    try {
      const updates: any = { username: adminProfile.username };
      if (adminProfile.password) {
        updates.password = adminProfile.password;
        updates.last_password_change = new Date().toISOString();
      }
      
      const { error } = await supabase.from('students').update(updates).eq('id', adminSession.id);
      if (error) throw error;
      
      alert("✅ Admin account updated successfully. Old login details are now invalid.");
      clearSession();
      router.push("/");
    } catch (err) {
      alert("❌ Error updating admin profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: student, error } = await supabase
        .from('students')
        .insert([{
          full_name: newUser.name,
          roll_id: newUser.roll,
          grade: newUser.class,
          parent_phone: newUser.phone,
          username: newUser.username,
          password: newUser.password,
          email_library: `${newUser.username}@library.com`,
          is_responsible: newUser.is_responsible,
          is_admin: newUser.is_admin,
          last_password_change: new Date().toISOString() // Set initial timestamp
        }])
        .select()
        .single();

      if (error) throw error;
      
      setShowAddUser(false);
      setNewUser({ name: "", roll: "", class: "", phone: "", username: "", password: "", is_responsible: false, is_admin: false });
      fetchData();
      alert("✅ Personnel enrolled successfully.");
    } catch (err) {
      alert("Error creating user");
    } finally {
      setLoading(false);
    }
  };

  const handleViewBookDetails = async (book: any) => {
    setLoading(true);
    try {
      // Fetch current borrowing info
      const { data: currentBorrow } = await supabase
        .from('library_logs')
        .select('*, students(*)')
        .eq('book_id', book.id)
        .is('return_date', null)
        .single();

      const bookWithDetails = {
        ...book,
        current_borrow: currentBorrow || null
      };

      setSelectedBookDetails(bookWithDetails);
      setShowBookDetails(true);
    } catch (err) {
      console.error("Error fetching book details:", err);
      setSelectedBookDetails(book);
      setShowBookDetails(true);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (user: Student) => {
    const userLogs = logs.filter((log) => log.student_id === user.id || log.students?.id === user.id);
    setSelectedUser(user);
    setSelectedStudentLogs(userLogs);
    setShowReport(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);
    try {
      const updates: any = {
        full_name: selectedUser.full_name,
        roll_id: selectedUser.roll_id,
        username: selectedUser.username,
        is_responsible: selectedUser.is_responsible,
        is_admin: selectedUser.is_admin
      };
      
      if (selectedUser.password) {
        updates.password = selectedUser.password;
        updates.last_password_change = new Date().toISOString();
      } else {
        // If we change role but not password, we still need to invalidate sessions
        updates.last_password_change = new Date().toISOString();
      }

      const { error } = await supabase.from('students').update(updates).eq('id', selectedUser.id);
      if (error) throw error;
      
      setShowEditUser(false);
      setSelectedUser(null);
      fetchData();
      alert("✅ Identity updated successfully.");
    } catch (err) {
      alert("❌ Error updating identity.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (id: string) => {
    const newPass = prompt("Enter new password for this user:");
    if (!newPass) return;
    setLoading(true);
    try {
      await supabase.from('students').update({ 
        password: newPass, 
        last_password_change: new Date().toISOString() 
      }).eq('id', id);
      fetchData();
      alert("✅ Password reset successfully.");
    } catch (err) { alert("❌ Failed to reset password."); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm("DANGER: This will permanently delete this identity record. Proceed?")) {
      await deleteStudent(id);
      fetchData();
    }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const book_id = newBookData.book_id || `BK-${Date.now()}`;
      
      // Generate QR Code as Data URL
      const qrData = JSON.stringify({ id: book_id, title: newBookData.title });
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      const { error } = await supabase.from('books').upsert([{
        book_id,
        title: newBookData.title,
        author: newBookData.author,
        rate: 0,
        publisher: newBookData.publisher,
        category: newBookData.category,
        subcategory: "",
        language: newBookData.language,
        shelf_location: `${newBookData.shelf}${newBookData.row ? `, ${newBookData.row}` : ''}`,
        cover_image_url: newBookData.cover_image_url,
        price: parseFloat(newBookData.price || "0"),
        isbn: newBookData.isbn || "",
        pages: 0,
        description: newBookData.description || "",
        status: 'available'
      }], { onConflict: 'book_id' });

      if (error) throw error;

      // Update global categories in settings if changed
      await supabase.from('library_settings').upsert({ id: 'global', ...globalSettings, categories });

      setShowAddBook(false);
      setNewBookData({ 
        title: "", book_id: "", author: "", publisher: "", category: "", subcategory: "", rate: "", 
        shelf: "", row: "", language: "English", price: "", cover_image_url: "", 
        isbn: "", pages: "", description: "" 
      });
      fetchData();
      alert("✅ Archive unit registered successfully with QR code.");
    } catch (err) {
      console.error(err);
      alert("Error adding book");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookForEdit) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('books').update({
        title: selectedBookForEdit.title,
        author: selectedBookForEdit.author,
        publisher: selectedBookForEdit.publisher,
        category: selectedBookForEdit.category,
        subcategory: selectedBookForEdit.subcategory,
        language: selectedBookForEdit.language,
        shelf_location: selectedBookForEdit.shelf_location,
        cover_image_url: selectedBookForEdit.cover_image_url,
        price: parseFloat(selectedBookForEdit.price || "0"),
        isbn: selectedBookForEdit.isbn || "",
        description: selectedBookForEdit.description || ""
      }).eq('id', selectedBookForEdit.id);

      if (error) throw error;
      
      setShowEditBook(false);
      setSelectedBookForEdit(null);
      fetchData();
      alert("✅ Archive unit updated successfully.");
    } catch (err) {
      alert("Error updating book");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllBooks = async () => {
    if (!confirm("⚠️ DANGER: You are about to ERASE the entire library catalog! This action is irreversible. Continue?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('books').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) throw error;
      fetchData();
      alert("✅ Entire catalog has been purged.");
    } catch (err) {
      alert("Error purging catalog.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAllUsers = async () => {
    const session = getSession();
    if (!session?.id) return;
    if (!confirm("⚠️ DANGER: You are about to ERASE all personnel except yourself! Continue?")) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('students').delete().neq('id', session.id);
      if (error) throw error;
      fetchData();
      alert("✅ All other personnel have been purged.");
    } catch (err) {
      alert("Error purging personnel.");
    } finally {
      setLoading(false);
    }
  };

  const handleScannerResult = (data: string) => {
    try {
      const bookData = JSON.parse(data);
      setNewBookData({
        title: bookData.book_nomenclature || bookData.title || "",
        book_id: bookData.serial_id || bookData.book_id || `BK-${Date.now()}`,
        author: bookData.authority || bookData.author || "",
        publisher: bookData.publisher || "",
        category: bookData.category || "",
        subcategory: bookData.sub_category || bookData.subcategory || "",
        rate: bookData.price || bookData.valuation || "",
        shelf: bookData.shelf_position?.split(',')[0]?.trim() || bookData.shelf_location?.split(',')[0]?.trim() || "",
        row: bookData.shelf_position?.split(',')[1]?.trim() || bookData.shelf_location?.split(',')[1]?.trim() || "",
        language: bookData.language || "English",
        price: bookData.price || bookData.valuation || "",
        cover_image_url: bookData.book_url || bookData.cover_image_url || "",
        isbn: bookData.isbn || "",
        pages: bookData.pages || "",
        description: bookData.description || ""
      });
      setShowScanner(false);
      setShowAddBook(true);
      alert("✅ Book data decoded from QR code.");
    } catch (e) {
      alert("❌ Invalid QR Format: Book data could not be parsed.");
    }
  };

  const handleBulkAdd = async () => {
    if (!bulkJson.trim()) return;
    setLoading(true);
    try {
      const booksData = JSON.parse(bulkJson);
      if (!Array.isArray(booksData)) throw new Error("Invalid JSON: Must be an array of books");

      let currentCategories = [...categories];
      let categoriesChanged = false;

      const processedBooks = await Promise.all(booksData.map(async (b: any) => {
        const book_id = b.book_id || b.serial_id || `BK-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        
        // Handle new categories from bulk import
        const categoryName = b.category || b.book_category || "General";

        if (categoryName && !currentCategories.includes(categoryName)) {
          currentCategories.push(categoryName);
          categoriesChanged = true;
        }

        return {
          book_id,
          title: b.title || b.book_nomenclature || "Untitled Unit",
          author: b.author || b.authority || "Unknown Authority",
          publisher: b.publisher || "",
          category: categoryName,
          subcategory: "",
          price: parseFloat(b.price || b.valuation || "0"),
          language: b.language || "English",
          shelf_location: b.shelf_location || b.location || b.shelf_position || "",
          cover_image_url: b.cover_image_url || b.book_url || b.image_url || "",
          isbn: b.isbn || "",
          description: b.description || b.desc || "",
          status: 'available'
        };
      }));

      const { error } = await supabase.from('books').upsert(processedBooks, { onConflict: 'book_id' });
      if (error) throw error;

      if (categoriesChanged) {
        setCategories(currentCategories);
        await supabase.from('library_settings').upsert({ id: 'global', ...globalSettings, categories: currentCategories });
      }

      alert(`✅ Bulk operation successful: ${processedBooks.length} units registered in the catalog.`);
      setShowBulkAdd(false);
      setBulkJson("");
      fetchData();
    } catch (err: any) {
      alert("❌ Bulk Import Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadAllQRs = async () => {
    const zip = new JSZip();
    const folder = zip.folder("Library_QR_Codes");
    
    setLoading(true);
    try {
      const { data: books } = await supabase.from('books').select('title, book_id');
      if (!books) return;

      for (const book of books) {
        const qrData = JSON.stringify({ id: book.book_id, title: book.title });
        const qrCodeUrl = await QRCode.toDataURL(qrData, {
          width: 400,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        const base64Data = qrCodeUrl.split(',')[1];
        folder?.file(`${book.title.replace(/[/\\?%*:|"<>]/g, '-')}_${book.book_id}.png`, base64Data, { base64: true });
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `Library_Archives_QR_${new Date().toLocaleDateString()}.zip`);
      alert("✅ QR Archive ready for download.");
    } catch (err) {
      alert("❌ Export failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    setLoading(true);
    try {
      await supabase.from('library_settings').upsert({ id: 'global', ...globalSettings, categories });
      alert("✅ Global policies and categories synchronized.");
    } catch (err) { alert("❌ Synchronization failed."); }
    finally { setLoading(false); }
  };

  const getTopReaders = () => {
    const counts: {[key: string]: {name: string, count: number}} = {};
    logs.forEach(l => {
      if (l.students) {
        if (!counts[l.student_id]) counts[l.student_id] = { name: l.students.full_name, count: 0 };
        counts[l.student_id].count++;
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-indigo-500/30 overflow-hidden flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-black/40 border-r border-white/5 p-6 flex flex-col hidden md:flex backdrop-blur-3xl">
          <div className="flex items-center space-x-3 mb-12">
            <ShieldCheck className="w-10 h-10 text-indigo-500" />
            <div>
              <h2 className="text-xl font-black italic tracking-tighter leading-none">ADMIN_HUB</h2>
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest italic">Master Terminal</p>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded text-[6px] font-black uppercase tracking-widest border border-indigo-500/20 italic">Admin</span>
              </div>
            </div>
          </div>

        <nav className="space-y-3 flex-1">
          {[
            { id: 'overview', label: 'Overview', icon: Layout },
            { id: 'inventory', label: 'Inventory', icon: BookOpen },
            { id: 'management', label: 'Registry Hub', icon: Zap },
            { id: 'users', label: 'Users', icon: Users },
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'logs', label: 'Logs', icon: History }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all group relative ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
            >
              <tab.icon className={`w-4 h-4 group-hover:scale-110 transition-transform ${activeTab === tab.id ? 'text-white' : ''}`} />
              <span className="font-black text-[9px] uppercase tracking-widest">{tab.label}</span>
              {activeTab === tab.id && <motion.div layoutId="admin-pill" className="absolute -left-10 w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5">
          <button onClick={() => { clearSession(); router.push("/"); }} className="w-full flex items-center space-x-3 p-4 text-rose-500/60 hover:text-rose-500 transition-colors font-black text-[9px] uppercase tracking-widest">
            <LogOut className="w-4 h-4"/> Secure Logoff
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 pt-10 pb-28 md:pb-20 bg-[#020617] relative custom-scroll">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-600/5 blur-[120px] rounded-full -mr-48 -mt-48 pointer-events-none" />
        
        <div className="max-w-6xl mx-auto">
          <header className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase italic leading-none mb-3">
                {activeTab === 'overview' ? 'DASHBOARD' : 
                 activeTab === 'management' ? 'REGISTRY_HUB' : 
                 activeTab === 'inventory' ? 'INVENTORY' : 
                 activeTab === 'users' ? 'USER_DIRECTORY' : 
                 activeTab === 'settings' ? 'POLICIES' : 'SYSTEM_LOGS'}
              </h1>
              <div className="flex items-center space-x-3">
                <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"/>
                <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest italic">Core Status: Online • Node Identity: ADMIN_MASTER</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
               <button onClick={fetchData} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group"><Activity className={`w-5 h-5 text-gray-500 group-hover:text-indigo-400 ${loading ? 'animate-spin' : ''}`}/></button>
               <button onClick={() => { clearSession(); router.push('/'); }} className="p-4 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 hover:bg-rose-500/20 transition-all md:hidden">
                 <LogOut className="w-5 h-5" />
               </button>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-6 md:space-y-10">
                 {/* Quick System Actions - Mobile Priority */}
                 <div className="md:hidden bg-gradient-to-br from-indigo-600/10 to-blue-600/10 border border-white/5 p-6 rounded-3xl backdrop-blur-3xl space-y-6">
                   <h3 className="text-[12px] font-black uppercase tracking-[0.4em] text-white flex items-center italic"><Zap className="w-4 h-4 mr-3" />Rapid Access</h3>
                   <div className="grid grid-cols-1 gap-4">
                     <button onClick={() => setShowAddUser(true)} className="flex items-center justify-between p-5 bg-white/5 rounded-xl border border-white/5 hover:bg-indigo-600 hover:border-indigo-500 transition-all group">
                        <span className="font-black text-sm uppercase tracking-widest">Enroll Personnel</span>
                        <UserPlus className="w-5 h-5 text-gray-600 group-hover:text-white" />
                     </button>
                     <button onClick={() => setShowAddBook(true)} className="flex items-center justify-between p-5 bg-white/5 rounded-xl border border-white/5 hover:bg-emerald-600 hover:border-emerald-500 transition-all group">
                        <span className="font-black text-sm uppercase tracking-widest">Archive New Unit</span>
                        <Package className="w-5 h-5 text-gray-600 group-hover:text-white" />
                     </button>
                     <button onClick={() => setActiveTab('settings')} className="flex items-center justify-between p-5 bg-white/5 rounded-xl border border-white/5 hover:bg-amber-600 hover:border-amber-500 transition-all group">
                        <span className="font-black text-sm uppercase tracking-widest">Adjust Policies</span>
                        <Settings className="w-5 h-5 text-gray-600 group-hover:text-white" />
                     </button>
                   </div>
                 </div>

                 {/* Bento Stats Grid - Desktop Only */}
                 <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Personnel', value: students.length, color: 'purple', icon: Users, desc: 'Identity Records' },
                      { label: 'Units', value: books.length, color: 'emerald', icon: BookOpen, desc: 'Master Catalog' },
                      { label: 'Transfers', value: logs.filter(l => !l.return_date).length, color: 'indigo', icon: RefreshCw, desc: 'Lent Nodes' },
                      { label: 'Success', value: '98.4%', color: 'amber', icon: TrendingUp, desc: 'Integrity Metrics' }
                    ].map((stat, i) => (
                      <div key={i} className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl backdrop-blur-3xl group hover:border-indigo-500/20 transition-all">
                        <div className="flex justify-between items-start mb-4">
                           <div className={`w-10 h-10 bg-${stat.color}-500/10 rounded-xl flex items-center justify-center border border-${stat.color}-500/20`}><stat.icon className={`w-4 h-4 text-${stat.color}-400`}/></div>
                           <span className="text-[6px] font-black text-gray-700 uppercase tracking-widest">SYNC</span>
                        </div>
                        <h4 className="text-3xl font-black text-white italic tracking-tighter mb-1">{stat.value}</h4>
                        <p className="text-[8px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
                        <p className={`text-[6px] font-black text-${stat.color}-500/60 uppercase tracking-widest mt-3 italic`}>{stat.desc}</p>
                      </div>
                    ))}
                 </div>

                 {/* Master Catalog Preview - Compact on Mobile */}
                 <div className="bg-white/5 border border-white/5 p-4 md:p-8 rounded-3xl backdrop-blur-3xl space-y-4 md:space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-400 flex items-center italic"><Package className="w-3.5 h-3.5 mr-3" />Master Catalog</h3>
                       <div className="relative flex-1 w-full max-w-xs">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-700" />
                         <input 
                           value={bookSearchTerm}
                           onChange={(e) => setBookSearchTerm(e.target.value)}
                           className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-8 pr-4 text-white font-black italic text-[8px] outline-none focus:ring-2 ring-emerald-500/20 placeholder:text-gray-800" 
                           placeholder="Search catalog..." 
                         />
                       </div>
                       <div className="flex items-center space-x-2 md:space-x-3">
                          <button onClick={() => setShowBulkAdd(true)} className="px-4 py-2 md:px-6 md:py-2 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl font-black uppercase text-[7px] md:text-[8px] tracking-widest flex items-center space-x-1 md:space-x-2 transition-all border border-indigo-500/20">
                             <Code className="w-3 h-3" />
                             <span className="hidden sm:inline">Bulk Import (JSON)</span>
                             <span className="sm:hidden">Bulk</span>
                          </button>
                          <button onClick={downloadAllQRs} className="px-4 py-2 md:px-6 md:py-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-xl font-black uppercase text-[7px] md:text-[8px] tracking-widest flex items-center space-x-1 md:space-x-2 transition-all border border-amber-500/20">
                             <Download className="w-3 h-3" />
                             <span className="hidden sm:inline">Export QR Pack</span>
                             <span className="sm:hidden">QR</span>
                          </button>
                          <button onClick={() => setShowAddBook(true)} className="px-4 py-2 md:px-6 md:py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black uppercase text-[7px] md:text-[8px] tracking-widest flex items-center space-x-1 md:space-x-2 transition-all">
                             <Plus className="w-3 h-3" />
                             <span className="hidden sm:inline">Add New Unit</span>
                             <span className="sm:hidden">Add</span>
                          </button>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
                       {books.filter(b => {
                         if (!bookSearchTerm) return true;
                         const term = bookSearchTerm.toLowerCase();
                         return (
                           b.title?.toLowerCase().includes(term) ||
                           b.author?.toLowerCase().includes(term) ||
                           b.publisher?.toLowerCase().includes(term) ||
                           b.book_id?.toLowerCase().includes(term) ||
                           b.category?.toLowerCase().includes(term) ||
                           b.subcategory?.toLowerCase().includes(term) ||
                           b.shelf_location?.toLowerCase().includes(term) ||
                           b.isbn?.toLowerCase().includes(term) ||
                           b.description?.toLowerCase().includes(term) ||
                           b.language?.toLowerCase().includes(term)
                         );
                       }).slice(0, 3).map((book) => (  // Reduced from 6 to 3 on mobile
                          <div key={book.id} className="p-3 md:p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                             <div className="flex items-center space-x-2 md:space-x-3">
                                <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
                                   <BookOpen className="w-3 h-3 md:w-4 md:h-4" />
                                </div>
                                <div>
                                   <p className="font-black text-xs text-white italic truncate max-w-[120px] md:max-w-[150px]">"{book.title}"</p>
                                   <p className="text-[6px] md:text-[7px] font-black text-gray-600 uppercase">{book.book_id}</p>
                                   <p className="text-[6px] md:text-[7px] font-black text-emerald-400 uppercase">{book.price ? `$${book.price}` : 'N/A'}</p>
                                </div>
                             </div>
                             <div className="flex items-center space-x-1 md:space-x-2">
                               <button onClick={() => handleViewBookDetails(book)} className="p-1 md:p-2 text-gray-700 hover:text-indigo-500 transition-colors">
                                  <Info className="w-3 h-3 md:w-3.5 md:h-3.5" />
                               </button>
                               <button onClick={() => { if(confirm('Erase this unit?')) supabase.from('books').delete().eq('id', book.id).then(fetchData); }} className="p-1 md:p-2 text-gray-700 hover:text-rose-500 transition-colors">
                                  <Trash2 className="w-3 h-3 md:w-3.5 md:h-3.5" />
                               </button>
                             </div>
                          </div>
                       ))}
                       {books.filter(b => {
                         if (!bookSearchTerm) return true;
                         const term = bookSearchTerm.toLowerCase();
                         return (
                           b.title?.toLowerCase().includes(term) ||
                           b.author?.toLowerCase().includes(term) ||
                           b.publisher?.toLowerCase().includes(term) ||
                           b.book_id?.toLowerCase().includes(term) ||
                           b.category?.toLowerCase().includes(term) ||
                           b.subcategory?.toLowerCase().includes(term) ||
                           b.shelf_location?.toLowerCase().includes(term) ||
                           b.isbn?.toLowerCase().includes(term) ||
                           b.description?.toLowerCase().includes(term) ||
                           b.language?.toLowerCase().includes(term)
                         );
                       }).length === 0 && <p className="text-[8px] text-gray-600 italic uppercase col-span-3 text-center py-6 md:py-10">No Archive Units Match Search</p>}
                    </div>
                 </div>

                 {/* Desktop Layout: Top Readers and Quick Actions */}
                 <div className="hidden md:grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Top Readers Leaderboard */}
                    <div className="lg:col-span-2 bg-white/5 border border-white/5 p-8 rounded-3xl backdrop-blur-3xl space-y-6">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 flex items-center italic"><Star className="w-3.5 h-3.5 mr-3" />Authority Leaderboard</h3>
                       <div className="space-y-3">
                          {getTopReaders().map((reader, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                               <div className="flex items-center space-x-4">
                                  <div className="w-10 h-10 bg-indigo-600/10 rounded-xl flex items-center justify-center font-black text-indigo-500 border border-indigo-500/20 text-sm">{i+1}</div>
                                  <div><p className="font-black text-base text-white italic leading-none mb-1">{reader.name}</p><p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Personnel</p></div>
                               </div>
                               <div className="text-right">
                                  <p className="text-xl font-black text-white italic leading-none">{reader.count}</p>
                                  <p className="text-[6px] font-black text-gray-700 uppercase tracking-widest mt-1">Units Read</p>
                               </div>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Quick System Actions */}
                    <div className="bg-gradient-to-br from-indigo-600/10 to-blue-600/10 border border-white/5 p-8 rounded-3xl backdrop-blur-3xl space-y-6">
                       <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-white flex items-center italic"><Zap className="w-3.5 h-3.5 mr-3" />Rapid Access</h3>
                       <div className="grid grid-cols-1 gap-3">
                          <button onClick={() => setShowAddUser(true)} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-indigo-600 hover:border-indigo-500 transition-all group">
                             <span className="font-black text-[9px] uppercase tracking-widest">Enroll Personnel</span>
                             <UserPlus className="w-4 h-4 text-gray-600 group-hover:text-white" />
                          </button>
                          <button onClick={() => setShowAddBook(true)} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-emerald-600 hover:border-emerald-500 transition-all group">
                             <span className="font-black text-[9px] uppercase tracking-widest">Archive New Unit</span>
                             <Package className="w-4 h-4 text-gray-600 group-hover:text-white" />
                          </button>
                          <button onClick={() => setActiveTab('settings')} className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-amber-600 hover:border-amber-500 transition-all group">
                             <span className="font-black text-[9px] uppercase tracking-widest">Adjust Policies</span>
                             <Settings className="w-4 h-4 text-gray-600 group-hover:text-white" />
                          </button>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'management' && (
              <motion.div key="management" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-12">
                 <header>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter text-indigo-400 mb-2">Registry_Management_Hub</h2>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest italic">Core archive operations and rapid deployment tools</p>
                 </header>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Action 1: Bulk Import */}
                    <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] backdrop-blur-3xl space-y-8 flex flex-col group hover:border-indigo-500/30 transition-all">
                       <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                          <Code className="w-8 h-8" />
                       </div>
                       <div>
                          <h3 className="text-xl font-black italic uppercase tracking-tight mb-2">Bulk JSON Import</h3>
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed italic">Mass deploy archive units via encrypted JSON structures.</p>
                       </div>
                       <button onClick={() => setShowBulkAdd(true)} className="mt-auto w-full py-5 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all border border-indigo-500/20">
                          Initialize Protocol
                       </button>
                    </div>

                    {/* Action 2: Export QRs */}
                    <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] backdrop-blur-3xl space-y-8 flex flex-col group hover:border-amber-500/30 transition-all">
                       <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                          <Download className="w-8 h-8" />
                       </div>
                       <div>
                          <h3 className="text-xl font-black italic uppercase tracking-tight mb-2">Export QR Pack</h3>
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed italic">Generate and download physical node identifiers for all units.</p>
                       </div>
                       <button onClick={downloadAllQRs} className="mt-auto w-full py-5 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all border border-amber-500/20">
                          Generate Archive
                       </button>
                    </div>

                    {/* Action 3: Add New Unit */}
                    <div className="bg-white/[0.02] border border-white/5 p-10 rounded-[3rem] backdrop-blur-3xl space-y-8 flex flex-col group hover:border-emerald-500/30 transition-all">
                       <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                          <Plus className="w-8 h-8" />
                       </div>
                       <div>
                          <h3 className="text-xl font-black italic uppercase tracking-tight mb-2">Register Unit</h3>
                          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest leading-relaxed italic">Manually enroll a single archive node or use rapid QR scan.</p>
                       </div>
                       <div className="mt-auto grid grid-cols-2 gap-3">
                          <button onClick={() => setShowScanner(true)} className="py-5 bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-2xl font-black uppercase text-[8px] tracking-widest transition-all border border-emerald-500/20 flex items-center justify-center space-x-2">
                             <Scan className="w-3 h-3" />
                             <span>QR Scan</span>
                          </button>
                          <button onClick={() => setShowAddBook(true)} className="py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase text-[8px] tracking-widest transition-all shadow-lg shadow-emerald-900/40">
                             Manual
                          </button>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'users' && (
              <motion.div key="users" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-6">
                 <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="relative flex-1 w-full">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                       <input 
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white font-black italic text-sm outline-none focus:ring-4 ring-indigo-500/10 placeholder:text-gray-800" 
                         placeholder="Search personnel records..." 
                       />
                    </div>
                    <div className="flex items-center space-x-3">
                       <button onClick={handleDeleteAllUsers} className="px-6 py-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl font-black uppercase text-[8px] tracking-widest flex items-center space-x-2 transition-all border border-rose-500/20">
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Purge All Personnel</span>
                       </button>
                       <button onClick={() => setShowAddUser(true)} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] flex items-center space-x-3 transition-all shadow-lg shadow-indigo-900/40">
                          <Plus className="w-4 h-4" />
                          <span>Enroll Identity</span>
                       </button>
                    </div>
                 </div>

                 <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-3xl">
                    <table className="w-full text-left">
                       <thead className="bg-black/40 text-[8px] uppercase tracking-[0.3em] font-black text-gray-700 italic border-b border-white/5">
                          <tr>
                             <th className="p-6">Personnel Identity</th>
                             <th className="p-6">Privilege</th>
                             <th className="p-6">Terminal</th>
                             <th className="p-6 text-right">Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-white/5">
                          {students.filter(s => {
                            const searchLower = searchTerm.toLowerCase();
                            return s.full_name.toLowerCase().includes(searchLower) || 
                                   s.roll_id.toLowerCase().includes(searchLower) ||
                                   s.username?.toLowerCase().includes(searchLower) ||
                                   s.grade?.toLowerCase().includes(searchLower) ||
                                   s.parent_phone?.toLowerCase().includes(searchLower);
                          }).map(user => (
                            <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                               <td className="p-6">
                                  <div onClick={() => handleViewReport(user)} className="flex items-center space-x-4 cursor-pointer group/card hover:bg-white/5 p-2 rounded-xl transition-all">
                                     <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center font-black text-lg text-indigo-500 border border-indigo-500/20 group-hover/card:scale-110 group-hover/card:bg-indigo-500 group-hover/card:text-white transition-all">{user.full_name[0]}</div>
                                     <div>
                                        <p className="font-black text-base text-white italic leading-none mb-1 group-hover/card:text-indigo-400">{user.full_name}</p>
                                        <p className="text-[7px] font-black text-gray-700 uppercase tracking-widest">Roll: {user.roll_id}</p>
                                     </div>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <div className="flex flex-col space-y-1">
                                     <span className={`px-3 py-1 rounded-full text-[6px] font-black uppercase tracking-widest italic border w-fit ${user.is_admin ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : user.is_responsible ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                        {user.is_admin ? 'Administrator' : user.is_responsible ? 'Librarian' : 'Student'}
                                     </span>
                                  </div>
                               </td>
                               <td className="p-6">
                                  <p className="text-[10px] font-black text-gray-500 italic">{user.username}@domain.com</p>
                               </td>
                               <td className="p-6 text-right">
                                  <div className="flex items-center justify-end space-x-2">
                                     <button onClick={() => { setSelectedUser(user); setShowEditUser(true); }} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl text-gray-500 hover:text-indigo-400 transition-all border border-white/5"><PenTool className="w-3.5 h-3.5" /></button>
                                     <button onClick={() => handleDeleteUser(user.id)} className="p-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/10"><Trash2 className="w-3.5 h-3.5" /></button>
                                  </div>
                               </td>
                            </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </motion.div>
            )}

            {activeTab === 'inventory' && (
              <motion.div key="inventory" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-8">
                 <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="relative flex-1 w-full max-w-xl">
                       <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                       <input 
                         value={searchTerm}
                         onChange={(e) => setSearchTerm(e.target.value)}
                         className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white font-black italic text-sm outline-none focus:ring-4 ring-indigo-500/10 placeholder:text-gray-800" 
                         placeholder="Search master catalog..." 
                       />
                    </div>
                    <div className="flex items-center space-x-3">
                       <button onClick={handleDeleteAllBooks} className="px-6 py-4 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-2xl font-black uppercase text-[8px] tracking-widest flex items-center space-x-2 transition-all border border-rose-500/20">
                          <Trash2 className="w-4 h-4" />
                          <span>Purge Catalog</span>
                       </button>
                       <button onClick={() => setShowAddBook(true)} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] flex items-center space-x-3 transition-all shadow-lg shadow-emerald-900/40">
                          <Plus className="w-4 h-4" />
                          <span>Register Archive Unit</span>
                       </button>
                    </div>
                 </header>

                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {books.filter(b => {
                      const searchLower = searchTerm.toLowerCase();
                      return b.title.toLowerCase().includes(searchLower) || 
                             b.book_id.toLowerCase().includes(searchLower) ||
                             b.author?.toLowerCase().includes(searchLower) ||
                             b.publisher?.toLowerCase().includes(searchLower) ||
                             b.category?.toLowerCase().includes(searchLower) ||
                             b.isbn?.toLowerCase().includes(searchLower) ||
                             b.description?.toLowerCase().includes(searchLower);
                    }).map((book, i) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 15 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: i * 0.03 }} 
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
                                    <BookOpen className="w-8 h-8 text-gray-400" />
                                    <span className="text-[7px] font-black uppercase tracking-widest">No Visual</span>
                                 </div>
                               )}
                               {/* Floating Status Badge */}
                               <div className="absolute top-3 right-3">
                                  <span className={`px-3 py-1 rounded-full text-[6px] font-black uppercase tracking-widest backdrop-blur-xl border shadow-lg ${book.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
                                     {book.status}
                                  </span>
                               </div>
                            </div>
                         </div>

                         {/* Metadata Section */}
                         <div className="flex-1 p-6 pt-1 flex flex-col">
                            <div className="space-y-1 mb-4">
                               <p className="text-[7px] font-black text-indigo-500 uppercase tracking-[0.3em] italic">{book.category || 'General Archive'}</p>
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
                                  <span className="text-[11px] font-black text-white italic">₹{book.rate}</span>
                               </div>
                            </div>

                            {/* Action Footer */}
                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2">
                               <button 
                                 onClick={() => { setSelectedBookForEdit(book); setShowEditBook(true); }} 
                                 className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all border border-white/5 flex items-center justify-center space-x-2"
                               >
                                  <PenTool className="w-3 h-3" />
                                  <span>Modify</span>
                               </button>
                               <button 
                                 onClick={() => { if(confirm('Erase this unit from catalog?')) supabase.from('books').delete().eq('id', book.id).then(fetchData); }}
                                 className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl border border-rose-500/10 transition-all flex items-center justify-center group/del"
                               >
                                  <Trash2 className="w-3.5 h-3.5 transition-transform group-hover/del:scale-110" />
                               </button>
                            </div>
                         </div>
                      </motion.div>
                    ))}
                 </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div key="settings" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
                    {/* Admin Profile Settings */}
                    <div className="bg-white/5 border border-white/5 p-8 md:p-12 rounded-[4rem] backdrop-blur-3xl space-y-8 md:space-y-10">
                       <h3 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400 flex items-center italic"><User className="w-5 h-5 mr-4" />Admin Account Settings</h3>
                       <form onSubmit={handleUpdateAdminProfile} className="space-y-6 md:space-y-8">
                          <div className="space-y-4">
                             <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest block ml-2">Admin Username</label>
                             <input required value={adminProfile.username} onChange={e => setAdminProfile({...adminProfile, username: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-6 rounded-3xl text-lg md:text-xl font-black italic text-white outline-none" />
                          </div>
                          <div className="space-y-4">
                             <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest block ml-2">New Admin Password</label>
                             <input type="password" value={adminProfile.password} onChange={e => setAdminProfile({...adminProfile, password: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-6 rounded-3xl text-lg md:text-xl font-black italic text-white outline-none" placeholder="••••••••" />
                          </div>
                          <button type="submit" disabled={loading} className="w-full py-6 md:py-8 bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] font-black uppercase tracking-[0.4em] text-white transition-all shadow-xl shadow-indigo-900/40">
                             {loading ? 'SYNCHRONIZING...' : 'SAVE ADMIN CHANGES'}
                          </button>
                       </form>
                    </div>

                    {/* Category Management */}
                    <div className="bg-white/5 border border-white/5 p-8 md:p-12 rounded-[4rem] backdrop-blur-3xl space-y-8 md:space-y-10">
                       <h3 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400 flex items-center italic"><Bookmark className="w-5 h-5 mr-4" />Category Management</h3>
                       <div className="space-y-6">
                          {/* Current Categories */}
                          <div className="space-y-4">
                             <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest block ml-2">Current Categories</label>
                             <div className="space-y-3 max-h-48 overflow-y-auto custom-scroll">
                                {categories.map((category, index) => (
                                   <div key={category} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 group hover:border-emerald-500/30 transition-all">
                                      {editingCategory === category ? (
                                         <input
                                            value={editCategoryValue}
                                            onChange={e => setEditCategoryValue(e.target.value)}
                                            onKeyDown={e => {
                                               if (e.key === 'Enter') {
                                                  if (editCategoryValue.trim() && (editCategoryValue.trim() === category || !categories.includes(editCategoryValue.trim()))) {
                                                     const updated = [...categories];
                                                     updated[index] = editCategoryValue.trim();
                                                     setCategories(updated);
                                                     setEditingCategory(null);
                                                     setEditCategoryValue("");
                                                  }
                                               } else if (e.key === 'Escape') {
                                                  setEditingCategory(null);
                                                  setEditCategoryValue("");
                                               }
                                            }}
                                            onBlur={() => {
                                               if (editCategoryValue.trim() && (editCategoryValue.trim() === category || !categories.includes(editCategoryValue.trim()))) {
                                                  const updated = [...categories];
                                                  updated[index] = editCategoryValue.trim();
                                                  setCategories(updated);
                                               }
                                               setEditingCategory(null);
                                               setEditCategoryValue("");
                                            }}
                                            className="flex-1 bg-transparent border-none outline-none text-white font-bold text-sm"
                                            autoFocus
                                         />
                                      ) : (
                                         <span className="font-bold text-white italic text-sm">{category}</span>
                                      )}
                                      <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                         <button
                                            onClick={() => {
                                               setEditingCategory(category);
                                               setEditCategoryValue(category);
                                            }}
                                            className="p-2 hover:bg-emerald-600/20 rounded-xl transition-colors"
                                         >
                                            <PenTool className="w-4 h-4 text-emerald-400" />
                                         </button>
                                         {categories.length > 1 && (
                                            <button
                                               onClick={() => {
                                                  if (confirm(`Delete category "${category}"?`)) {
                                                     setCategories(categories.filter(c => c !== category));
                                                  }
                                               }}
                                               className="p-2 hover:bg-rose-600/20 rounded-xl transition-colors"
                                            >
                                               <Trash2 className="w-4 h-4 text-rose-400" />
                                            </button>
                                         )}
                                      </div>
                                   </div>
                                ))}
                             </div>
                          </div>
                          {/* Add New Category */}
                          <div className="space-y-4">
                             <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest block ml-2">Add New Category</label>
                             <div className="flex space-x-3">
                                <input
                                   value={newCat}
                                   onChange={e => setNewCat(e.target.value)}
                                   onKeyDown={e => {
                                      if (e.key === 'Enter' && newCat.trim() && !categories.includes(newCat.trim())) {
                                         setCategories([...categories, newCat.trim()]);
                                         setNewCat("");
                                      }
                                   }}
                                   className="flex-1 bg-black/40 border border-white/10 p-4 rounded-2xl text-sm font-bold outline-none focus:ring-2 ring-emerald-500/20"
                                   placeholder="New category name..."
                                />
                                <button
                                   onClick={() => {
                                      if (newCat.trim() && !categories.includes(newCat.trim())) {
                                         setCategories([...categories, newCat.trim()]);
                                         setNewCat("");
                                      }
                                   }}
                                   className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black uppercase text-xs tracking-widest text-white transition-all"
                                >
                                   ADD
                                </button>
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Global Rules */}
                    <div className="bg-white/5 border border-white/5 p-8 md:p-12 rounded-[4rem] backdrop-blur-3xl space-y-8 md:space-y-10">
                       <h3 className="text-xs font-black uppercase tracking-[0.4em] text-amber-400 flex items-center italic"><ShieldAlert className="w-5 h-5 mr-4" />Global Lending Policies</h3>
                       <div className="space-y-6 md:space-y-8">
                          <div className="space-y-4">
                             <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest block ml-2">Standard Loan Duration (Days)</label>
                             <input type="number" value={globalSettings.due_days} onChange={e => setGlobalSettings({...globalSettings, due_days: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 p-4 md:p-6 rounded-3xl text-lg md:text-xl font-black italic text-white outline-none" />
                          </div>
                          <div className="space-y-4">
                             <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest block ml-2">Maximum Concurrent Transfers</label>
                             <input type="number" value={globalSettings.max_books} onChange={e => setGlobalSettings({...globalSettings, max_books: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 p-4 md:p-6 rounded-3xl text-lg md:text-xl font-black italic text-white outline-none" />
                          </div>
                          <button onClick={handleUpdateSettings} disabled={loading} className="w-full py-6 md:py-8 bg-amber-600 hover:bg-amber-500 rounded-[2rem] font-black uppercase tracking-[0.4em] text-white transition-all shadow-xl shadow-amber-900/40">
                             {loading ? 'SYNCING...' : 'SYNC GLOBAL POLICIES'}
                          </button>
                       </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="bg-rose-500/5 border border-rose-500/20 p-12 rounded-[4rem] backdrop-blur-3xl space-y-10">
                       <h3 className="text-xs font-black uppercase tracking-[0.4em] text-rose-500 flex items-center italic"><AlertTriangle className="w-5 h-5 mr-4" />Critical Danger Zone</h3>
                       <div className="space-y-6">
                          <div className="p-8 bg-black/40 rounded-[2.5rem] border border-rose-500/10 space-y-4">
                             <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest italic">Purge Entire Archive</p>
                             <p className="text-xs font-bold text-gray-500 leading-relaxed">This action will permanently erase all book records and logs from the central registry. This cannot be undone.</p>
                             <button onClick={() => { if(confirm('MASTER PURGE: Are you absolutely sure?')) alert('Purge command blocked for safety.'); }} className="w-full py-6 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-[1.5rem] font-black uppercase text-[8px] tracking-[0.3em] transition-all border border-rose-500/20">Execute Master Purge</button>
                          </div>
                          <div className="p-8 bg-black/40 rounded-[2.5rem] border border-rose-500/10 space-y-4">
                             <p className="text-[9px] font-black text-rose-500/60 uppercase tracking-widest italic">Reset All Identities</p>
                             <p className="text-xs font-bold text-gray-500 leading-relaxed">Forces a password reset for every user in the database. All active sessions will be terminated.</p>
                             <button onClick={() => { if(confirm('IDENTITY RESET: Proceed?')) alert('Command blocked.'); }} className="w-full py-6 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-[1.5rem] font-black uppercase text-[8px] tracking-[0.3em] transition-all border border-rose-500/20">Initiate Identity Reset</button>
                          </div>
                       </div>
                    </div>
                 </div>
              </motion.div>
            )}

            {activeTab === 'logs' && (
              <motion.div key="logs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                 <div className="bg-white/[0.02] border border-white/5 rounded-[4rem] overflow-hidden backdrop-blur-3xl">
                    <div className="p-10 border-b border-white/5 flex items-center justify-between">
                       <div className="flex items-center space-x-6">
                          <History className="w-10 h-10 text-indigo-500 opacity-50" />
                          <h3 className="text-2xl font-black uppercase italic tracking-tighter">System Transaction History</h3>
                       </div>
                       <button onClick={() => {}} className="px-8 py-4 bg-white/5 hover:bg-white/10 rounded-2xl font-black uppercase text-[8px] tracking-widest flex items-center space-x-3 transition-all">
                          <Download className="w-4 h-4" />
                          <span>Export Master Log</span>
                       </button>
                    </div>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead className="bg-black/40 text-[9px] uppercase tracking-[0.3em] font-black text-gray-700 italic border-b border-white/5">
                             <tr>
                                <th className="p-8">Personnel</th>
                                <th className="p-8">Archive Unit</th>
                                <th className="p-8">Transaction</th>
                                <th className="p-8 text-right">Auth Code</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                             {logs.map(log => (
                               <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="p-8">
                                     <p className="font-black text-white italic">{log.students?.full_name}</p>
                                     <p className="text-[8px] font-black text-gray-700 uppercase">{log.students?.roll_id}</p>
                                  </td>
                                  <td className="p-8">
                                     <p className="font-black text-white italic truncate max-w-[200px]">"{log.books?.title}"</p>
                                     <p className="text-[8px] font-black text-gray-700 uppercase">ID: {log.books?.book_id}</p>
                                  </td>
                                  <td className="p-8">
                                     <div className="flex flex-col">
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${log.return_date ? 'text-emerald-500' : 'text-amber-500'}`}>{log.return_date ? 'COMPLETED' : 'IN_TRANSIT'}</span>
                                        <span className="text-[10px] font-black text-gray-500 mt-1">{new Date(log.borrow_date).toLocaleDateString()}</span>
                                     </div>
                                  </td>
                                  <td className="p-8 text-right">
                                     <span className="font-mono text-[10px] text-gray-700">{log.id.slice(0, 12).toUpperCase()}</span>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Admin Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden bg-[#020617]/95 backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          {[
            { id: 'overview', icon: Layout, aria: 'Overview' },
            { id: 'users', icon: Users, aria: 'Users' },
            { id: 'inventory', icon: BookOpen, aria: 'Inventory' },
            { id: 'management', icon: Zap, aria: 'Registry' },
            { id: 'more', icon: MoreVertical, aria: 'More' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === 'more') {
                    setShowMoreMenu(!showMoreMenu);
                    return;
                  }
                  setActiveTab(tab.id as any);
                  setShowMoreMenu(false);
                }}
                aria-label={tab.aria}
                className={`flex-1 rounded-3xl py-3 transition-all ${isActive ? 'bg-indigo-500/15 text-indigo-300' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
              >
                <TabIcon className="mx-auto w-5 h-5" />
              </button>
            );
          })}
        </div>

        <AnimatePresence>
          {showMoreMenu && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute inset-x-3 bottom-16 rounded-3xl bg-[#0f172a] border border-white/10 p-3 shadow-2xl shadow-black/30"
            >
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => { setActiveTab('settings'); setShowMoreMenu(false); }}
                  className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 p-3 text-gray-300 hover:bg-white/5"
                  aria-label="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setActiveTab('logs'); setShowMoreMenu(false); }}
                  className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 p-3 text-gray-300 hover:bg-white/5"
                  aria-label="Logs"
                >
                  <History className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setShowMoreMenu(false); clearSession(); router.push('/'); }}
                  className="flex flex-col items-center justify-center gap-2 rounded-3xl border border-white/10 p-3 text-rose-400 hover:bg-rose-500/10"
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Bulk Add Modal */}
      <AnimatePresence>
        {showBulkAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowBulkAdd(false)} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0f172a] border border-white/10 w-full max-w-sm md:max-w-2xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowBulkAdd(false)} className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors z-10"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              <h2 className="text-2xl md:text-3xl font-black italic mb-4 uppercase tracking-tighter text-indigo-400">Bulk_Archive_Import</h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 md:mb-8 italic">Paste JSON array containing book objects. QR codes will be auto-generated.</p>
              
              <div className="space-y-6">
                <div className="relative">
                  <textarea 
                    value={bulkJson} 
                    onChange={(e) => setBulkJson(e.target.value)}
                    className="w-full h-48 md:h-64 bg-black/40 border border-white/10 p-4 md:p-6 rounded-3xl text-xs font-mono text-indigo-300 outline-none focus:ring-2 ring-indigo-500/20 resize-none"
                    placeholder='[{"title": "Book 1", "author": "Author A"}, {"title": "Book 2"}]'
                  />
                  {bulkJson.trim() && (
                    <div className="absolute bottom-4 right-4 px-4 py-2 bg-indigo-600 rounded-xl border border-indigo-400/50 shadow-xl">
                       <p className="text-[9px] font-black text-white uppercase tracking-widest italic">
                          {(() => {
                             try {
                               const data = JSON.parse(bulkJson);
                               return Array.isArray(data) ? `${data.length} Units Detected` : 'Invalid Format';
                             } catch(e) { return 'Invalid JSON'; }
                          })()}
                       </p>
                    </div>
                  )}
                </div>
                
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 md:p-6 rounded-2xl">
                   <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-2 italic">Expected Schema (JSON Array):</p>
                   <code className="text-[7px] text-gray-500 block leading-relaxed">
                     {"["}<br/>
                     &nbsp;&nbsp;{"{"}<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"book_nomenclature": "string (Required)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"authority": "string (Required)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"price": "number (Required)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"category": "string (Required)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"sub_category": "string (Required)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"serial_id": "string (Optional)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"publisher": "string (Optional)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"language": "string (Optional)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"shelf_position": "string (Optional)",<br/>
                     &nbsp;&nbsp;&nbsp;&nbsp;"book_url": "string (Optional)"<br/>
                     &nbsp;&nbsp;{"}"}<br/>
                     {"]"}
                   </code>
                </div>

                <button 
                  onClick={handleBulkAdd}
                  disabled={loading || !bulkJson.trim()}
                  className="w-full py-6 md:py-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] transition-all shadow-2xl shadow-indigo-900/40"
                >
                  {loading ? 'GENERATING_NODES...' : 'INITIALIZE BULK IMPORT'}
                </button>
                <button type="button" onClick={() => setShowBulkAdd(false)} className="w-full md:hidden bg-gray-600 hover:bg-gray-500 p-4 rounded-2xl font-black uppercase tracking-[0.4em] text-white transition-all text-xs">
                  CANCEL
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Scanner Modal */}
       <AnimatePresence>
        {showScanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowScanner(false)} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[60] flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0f172a] border border-white/10 w-full max-w-sm md:max-w-lg rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 relative overflow-hidden text-center max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowScanner(false)} className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors z-10"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              <h2 className="text-2xl md:text-3xl font-black italic mb-2 uppercase tracking-tighter text-indigo-400">Rapid_QR_Deployment</h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-6 md:mb-10 italic">Align node identifier with optical sensor</p>

              <div className="w-full aspect-square rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border-4 border-indigo-600/20 bg-black/40 relative shadow-2xl shadow-indigo-900/20 mb-6 md:mb-0">
                 <QrScanner onResult={handleScannerResult} />
                 <div className="absolute inset-0 border-[20px] md:border-[40px] border-black/40 pointer-events-none" />
                 <div className="absolute inset-[30px] md:inset-[60px] border border-indigo-500/50 rounded-2xl md:rounded-3xl animate-pulse pointer-events-none">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                 </div>
              </div>

              <button
                onClick={() => setShowScanner(false)}
                className="w-full py-4 md:py-5 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5"
              >
                Abort Protocol
              </button>
            </motion.div>
          </motion.div>
        )}
       </AnimatePresence>

       {/* Edit Book Modal */}
      <AnimatePresence>
        {showEditBook && selectedBookForEdit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowEditBook(false); setSelectedBookForEdit(null); }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0f172a] border border-white/10 w-full max-w-sm md:max-w-4xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 relative overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
              <button onClick={() => { setShowEditBook(false); setSelectedBookForEdit(null); }} className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors z-10"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              <h2 className="text-2xl md:text-3xl font-black italic mb-6 md:mb-8 uppercase tracking-tighter text-emerald-400 pr-8">Modify_Archive_Unit</h2>
              
              <form onSubmit={handleUpdateBook} className="flex-1 overflow-y-auto pr-4 custom-scroll space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Title</label>
                      <input required value={selectedBookForEdit.title} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, title: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Author</label>
                      <input value={selectedBookForEdit.author} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, author: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Category</label>
                        <select value={selectedBookForEdit.category} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, category: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-black outline-none">
                          {categories.map(c => <option key={c} value={c} className="bg-[#0f172a]">{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Shelf</label>
                        <input value={selectedBookForEdit.shelf_location?.split(',')[0]?.trim() || ''} onChange={e => {
                          const currentParts = selectedBookForEdit.shelf_location?.split(',') || ['', ''];
                          const newLocation = `${e.target.value}${currentParts[1] ? `, ${currentParts[1].trim()}` : ''}`;
                          setSelectedBookForEdit({...selectedBookForEdit, shelf_location: newLocation});
                        }} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none" placeholder="Shelf A..." />
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Row</label>
                      <input value={selectedBookForEdit.shelf_location?.split(',')[1]?.trim() || ''} onChange={e => {
                        const currentParts = selectedBookForEdit.shelf_location?.split(',') || ['', ''];
                        const newLocation = `${currentParts[0] ? currentParts[0].trim() : ''}${e.target.value ? `, ${e.target.value}` : ''}`;
                        setSelectedBookForEdit({...selectedBookForEdit, shelf_location: newLocation});
                      }} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none" placeholder="Row 1..." />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Cover URL</label>
                      <input value={selectedBookForEdit.cover_image_url} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, cover_image_url: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">ISBN</label>
                      <input value={selectedBookForEdit.isbn} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, isbn: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Description</label>
                      <textarea value={selectedBookForEdit.description} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, description: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none h-20 md:h-24 resize-none" />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-6 md:p-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-white shadow-2xl shadow-emerald-900/40 transition-all text-xs">
                  {loading ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
                </button>
                <button type="button" onClick={() => { setShowEditBook(false); setSelectedBookForEdit(null); }} className="w-full md:hidden bg-gray-600 hover:bg-gray-500 p-4 rounded-2xl font-black uppercase tracking-[0.4em] text-white transition-all text-xs">
                  CANCEL
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditUser && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowEditUser(false); setSelectedUser(null); }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0f172a] border border-white/10 w-full max-w-sm md:max-w-lg rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <button onClick={() => { setShowEditUser(false); setSelectedUser(null); }} className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors z-10"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              <h2 className="text-2xl md:text-3xl font-black italic mb-6 md:mb-10 uppercase tracking-tighter pr-8 text-indigo-400">Modify_Personnel</h2>
              <form onSubmit={handleUpdateUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Full Name</label>
                    <input required value={selectedUser?.full_name || ""} onChange={e => setSelectedUser({...selectedUser, full_name: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Roll ID / Serial</label>
                    <input required value={selectedUser?.roll_id || ""} onChange={e => setSelectedUser({...selectedUser, roll_id: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="S-001" />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Access Handle (Username)</label>
                  <input required value={selectedUser?.username || ""} onChange={e => setSelectedUser({...selectedUser, username: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="jdoe" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">New Access Key (Optional)</label>
                  <input type="password" value={selectedUser?.password || ""} onChange={e => setSelectedUser({...selectedUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="Leave blank to keep current" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-4 p-4 md:p-5 bg-white/5 rounded-2xl border border-white/10">
                    <input type="checkbox" checked={selectedUser?.is_responsible || false} onChange={e => setSelectedUser({...selectedUser, is_responsible: e.target.checked})} className="w-5 h-5 accent-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Librarian</span>
                  </div>
                  <div className="flex items-center space-x-4 p-4 md:p-5 bg-white/5 rounded-2xl border border-white/10">
                    <input type="checkbox" checked={selectedUser?.is_admin || false} onChange={e => setSelectedUser({...selectedUser, is_admin: e.target.checked})} className="w-5 h-5 accent-rose-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Admin</span>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 p-6 md:p-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-white shadow-2xl shadow-indigo-900/40 transition-all mt-4 text-xs">
                  {loading ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
                </button>
                <button type="button" onClick={() => { setShowEditUser(false); setSelectedUser(null); }} className="w-full md:hidden bg-gray-600 hover:bg-gray-500 p-4 rounded-2xl font-black uppercase tracking-[0.4em] text-white transition-all text-xs">
                  CANCEL
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Student Report Modal */}
      <AnimatePresence>
        {showReport && selectedUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowReport(false); setSelectedUser(null); }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0f172a] border border-white/10 w-full max-w-sm md:max-w-4xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 relative overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
              <button onClick={() => { setShowReport(false); setSelectedUser(null); }} className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors z-10"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              
              <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-6 mb-8 md:mb-12">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center font-black text-xl md:text-2xl text-indigo-500 border border-indigo-500/20 mx-auto md:mx-0">{selectedUser.full_name[0]}</div>
                <div className="text-center md:text-left">
                   <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase">{selectedUser.full_name}</h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">Personnel Activity Log • {selectedUser.roll_id}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scroll space-y-6">
                 {selectedStudentLogs.length > 0 ? (
                    <div className="space-y-4">
                       {selectedStudentLogs.map((log) => (
                          <div key={log.id} className="p-4 md:p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between group hover:border-indigo-500/30 transition-all gap-4">
                             <div className="flex items-center space-x-4 md:space-x-6">
                                <div className="w-10 h-10 md:w-12 md:h-12 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 group-hover:bg-indigo-600/10 group-hover:border-indigo-500/20 transition-all">
                                   <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                                </div>
                                <div>
                                   <p className="font-black text-white italic truncate max-w-[200px] md:max-w-[300px]">"{log.books?.title}"</p>
                                   <div className="flex flex-col md:flex-row md:items-center space-y-1 md:space-y-0 md:space-x-3 mt-1">
                                      <span className={`text-[8px] font-black uppercase tracking-widest ${log.return_date ? 'text-emerald-500' : 'text-amber-500'}`}>
                                         {log.return_date ? 'Returned' : 'In Transit'}
                                      </span>
                                      <span className="w-1 h-1 bg-gray-700 rounded-full hidden md:block" />
                                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">
                                         {new Date(log.borrow_date).toLocaleDateString()}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-center md:text-right">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">#{log.id.slice(0, 8).toUpperCase()}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="py-12 md:py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] opacity-30">
                       <History className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-4" />
                       <p className="font-black uppercase italic text-xs tracking-[0.2em]">No Transactional Records Found</p>
                    </div>
                 )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showAddUser && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddUser(false)} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0f172a] border border-white/10 w-full max-w-sm md:max-w-lg rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAddUser(false)} className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors z-10"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              <h2 className="text-2xl md:text-3xl font-black italic mb-6 md:mb-10 uppercase tracking-tighter pr-8">Enroll_Personnel</h2>
              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Full Name</label>
                    <input required value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Roll ID / Serial</label>
                    <input required value={newUser.roll} onChange={e => setNewUser({...newUser, roll: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="S-001" />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Access Handle (Username)</label>
                  <input required value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="jdoe" />
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Access Key (Password)</label>
                  <input required type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500/20" placeholder="••••••••" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-4 p-4 md:p-5 bg-white/5 rounded-2xl border border-white/10">
                    <input type="checkbox" checked={newUser.is_responsible} onChange={e => setNewUser({...newUser, is_responsible: e.target.checked})} className="w-5 h-5 accent-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Librarian</span>
                  </div>
                  <div className="flex items-center space-x-4 p-4 md:p-5 bg-white/5 rounded-2xl border border-white/10">
                    <input type="checkbox" checked={newUser.is_admin} onChange={e => setNewUser({...newUser, is_admin: e.target.checked})} className="w-5 h-5 accent-rose-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 italic">Admin</span>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-500 p-6 md:p-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-white shadow-2xl shadow-indigo-900/40 transition-all mt-4 text-xs">
                  {loading ? 'COMMITTING...' : 'AUTHORIZE ENROLLMENT'}
                </button>
                <button type="button" onClick={() => setShowAddUser(false)} className="w-full md:hidden bg-gray-600 hover:bg-gray-500 p-4 rounded-2xl font-black uppercase tracking-[0.4em] text-white transition-all text-xs">
                  CANCEL
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Book Modal */}
      <AnimatePresence>
        {showAddBook && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddBook(false)} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0f172a] border border-white/10 w-full max-w-sm md:max-w-lg rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 relative overflow-hidden max-h-[90vh] overflow-y-auto">
              <button onClick={() => setShowAddBook(false)} className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors z-10"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              <h2 className="text-2xl md:text-3xl font-black italic mb-6 md:mb-10 uppercase tracking-tighter pr-8">Archive_New_Unit</h2>
              <form onSubmit={handleAddBook} className="space-y-6 md:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Archive Nomenclature (Required)</label>
                    <input required value={newBookData.title} onChange={e => setNewBookData({...newBookData, title: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" placeholder="Book Name..." />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Primary Authority (Author) (Required)</label>
                    <input required value={newBookData.author} onChange={e => setNewBookData({...newBookData, author: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" placeholder="Author Name" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Price (₹) (Required)</label>
                    <input required type="number" value={newBookData.price} onChange={e => setNewBookData({...newBookData, price: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Archive ID / Serial (Optional)</label>
                    <input value={newBookData.book_id} onChange={e => setNewBookData({...newBookData, book_id: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" placeholder="BOOK-001" />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-4">
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest block ml-2">Category (Required)</label>
                    <select 
                      required 
                      value={newBookData.category} 
                      onChange={e => setNewBookData({...newBookData, category: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20 text-white"
                    >
                      <option value="" className="bg-[#0f172a]">Select Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat} className="bg-[#0f172a]">{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Language (Optional)</label>
                    <input value={newBookData.language} onChange={e => setNewBookData({...newBookData, language: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" placeholder="English, etc." />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Shelf Number/Name (Optional)</label>
                    <input value={newBookData.shelf} onChange={e => setNewBookData({...newBookData, shelf: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" placeholder="Shelf A, Shelf 1..." />
                  </div>
                  <div>
                    <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Row (Optional)</label>
                    <input value={newBookData.row} onChange={e => setNewBookData({...newBookData, row: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" placeholder="Row 1, Row B..." />
                  </div>
                </div>
                <div>
                  <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Book URL / Cover URL (Optional)</label>
                  <input value={newBookData.cover_image_url} onChange={e => setNewBookData({...newBookData, cover_image_url: e.target.value})} className="w-full bg-black/40 border border-white/10 p-4 md:p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" placeholder="https://..." />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-6 md:p-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-white shadow-2xl shadow-emerald-900/40 transition-all mt-4 text-xs">
                  {loading ? 'SYNCHRONIZING...' : 'COMMIT TO CATALOG'}
                </button>
                <button type="button" onClick={() => setShowAddBook(false)} className="w-full md:hidden bg-gray-600 hover:bg-gray-500 p-4 rounded-2xl font-black uppercase tracking-[0.4em] text-white transition-all text-xs">
                  CANCEL
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Book Details Modal */}
      <AnimatePresence>
        {showBookDetails && selectedBookDetails && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setShowBookDetails(false); setSelectedBookDetails(null); }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-4 md:p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} onClick={(e) => e.stopPropagation()} className="bg-[#0f172a] border border-white/10 w-full max-w-sm md:max-w-4xl rounded-[2rem] md:rounded-[3rem] p-6 md:p-12 relative overflow-hidden flex flex-col max-h-[90vh] overflow-y-auto">
              <button onClick={() => { setShowBookDetails(false); setSelectedBookDetails(null); }} className="absolute top-4 right-4 md:top-8 md:right-8 text-gray-500 hover:text-white transition-colors z-10"><X className="w-6 h-6 md:w-8 md:h-8" /></button>
              
              <div className="flex flex-col md:flex-row md:items-start space-y-6 md:space-y-0 md:space-x-8 mb-8 md:mb-12">
                <div className="w-24 h-32 md:w-32 md:h-40 bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center mx-auto md:mx-0">
                  {selectedBookDetails.cover_image_url ? (
                    <img src={selectedBookDetails.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-8 h-8 md:w-12 md:h-12 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase mb-2">"{selectedBookDetails.title}"</h2>
                  <p className="text-[10px] md:text-[12px] font-bold text-gray-400 uppercase tracking-widest italic mb-4 md:mb-6">{selectedBookDetails.author || "Unknown Author"}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Book ID</span>
                        <span className="text-base md:text-lg font-black text-white italic">{selectedBookDetails.book_id}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Publisher</span>
                        <span className="text-xs md:text-sm font-bold text-gray-300 italic">{selectedBookDetails.publisher || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Price</span>
                        <span className="text-base md:text-lg font-black text-emerald-400 italic">{selectedBookDetails.price ? `$${selectedBookDetails.price}` : "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Location</span>
                        <span className="text-xs md:text-sm font-bold text-gray-300 italic">{selectedBookDetails.shelf_location || "N/A"}</span>
                      </div>
                    </div>
                    <div className="space-y-3 md:space-y-4">
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Category</span>
                        <span className="text-xs md:text-sm font-bold text-indigo-400 italic">{selectedBookDetails.category || "General"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Language</span>
                        <span className="text-xs md:text-sm font-bold text-gray-300 italic">{selectedBookDetails.language || "English"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Pages</span>
                        <span className="text-xs md:text-sm font-bold text-gray-300 italic">{selectedBookDetails.pages || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">ISBN</span>
                        <span className="text-xs md:text-sm font-bold text-gray-300 italic">{selectedBookDetails.isbn || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Borrowing Status */}
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8 mb-6 md:mb-8">
                <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tight mb-4 md:mb-6 text-indigo-400">Current Status</h3>
                {selectedBookDetails.current_borrow ? (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl gap-4">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                          <UserCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-white italic">{selectedBookDetails.current_borrow.students?.full_name}</p>
                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Roll: {selectedBookDetails.current_borrow.students?.roll_id}</p>
                        </div>
                      </div>
                      <div className="text-center md:text-right">
                        <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Borrowed On</p>
                        <p className="text-sm font-bold text-white italic">{new Date(selectedBookDetails.current_borrow.borrow_date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="text-center">
                      <span className="px-4 py-2 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-black uppercase tracking-widest italic border border-amber-500/20">
                        Due: {globalSettings?.due_days ? new Date(new Date(selectedBookDetails.current_borrow.borrow_date).getTime() + (globalSettings.due_days * 24 * 60 * 60 * 1000)).toLocaleDateString() : "N/A"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 md:py-8">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-4">
                      <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" />
                    </div>
                    <p className="text-base md:text-lg font-black text-emerald-400 italic uppercase tracking-tight">Available for Checkout</p>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-2">No active borrowing records</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedBookDetails.description && (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 md:p-8">
                  <h3 className="text-lg md:text-xl font-black italic uppercase tracking-tight mb-4 md:mb-6 text-indigo-400">Description</h3>
                  <p className="text-xs md:text-sm font-medium text-gray-300 leading-relaxed italic">{selectedBookDetails.description}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
