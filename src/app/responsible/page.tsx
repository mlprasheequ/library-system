"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookCopy, UserCheck, Search, 
  LogOut, Clock, CheckCircle2, History as HistoryIcon, ArrowRight, Menu, X, Save,
  Settings, Star, Trash2, Mail, Users, BookOpen, ChevronRight, Activity, Bookmark, UserPlus, MapPin, 
  ShieldCheck, Package, Layout, FileText, Download, TrendingUp, AlertTriangle, Calendar, BarChart3, Eye, Filter, Bell, UserCircle,
  Command, Scan, Notebook, ClipboardList, PenTool, Hash, Plus, Code, QrCode, Info, Zap
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { clearSession, getSession } from "@/lib/session";
import { validateSession } from "@/lib/session-validation";
import QRCode from "qrcode";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import QrScanner from "@/components/QrScanner";

export default function ResponsibleDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"desk" | "personnel" | "tasks" | "analytics" | "inventory" | "management">("desk");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [outstanding, setOutstanding] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [allBooks, setAllBooks] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  // Transaction Desk State
  const [personnelSearch, setPersonnelSearch] = useState("");
  const [bookSearch, setBookSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [showReport, setShowReport] = useState(false);
  const [selectedStudentLogs, setSelectedStudentLogs] = useState<any[]>([]);
  const [showBookDetails, setShowBookDetails] = useState(false);
  const [selectedBookDetails, setSelectedBookDetails] = useState<any>(null);
  const [showEditBook, setShowEditBook] = useState(false);
  const [selectedBookForEdit, setSelectedBookForEdit] = useState<any>(null);
  const [dueDate, setDueDate] = useState("");
  const [conditionNotes, setConditionNotes] = useState("");

  // Inventory Management State
  const [showAddBook, setShowAddBook] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [bulkJson, setBulkJson] = useState("");
  const [categories, setCategories] = useState<string[]>([
    'General', 'Reference', 'الْكُتُب'
  ]);
  const [newBook, setNewBook] = useState({ 
    title: "", book_id: "", author: "", publisher: "", category: "", subcategory: "", rate: "", 
    shelf: "", row: "", language: "English", price: "", cover_image_url: "", 
    isbn: "", pages: "", description: "", how_much_value: "", which_value: "" 
  });
  const [globalSettings, setGlobalSettings] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
        const [
          { data: out, error: outErr }, 
          { data: students, error: sErr }, 
          { data: books, error: bErr }, 
          { data: res, error: rErr },
          { data: recentLogs, error: lErr },
          { data: settings }
        ] = await Promise.all([
            supabase.from('library_logs').select('*, students(*), books(*)').is('return_date', null),
            supabase.from('students').select('*'),
            supabase.from('books').select('*').order('title'),
            supabase.from('library_reservations').select('*, students(*), books(*)').eq('status', 'pending'),
            supabase.from('library_logs').select('*, students(*), books(*)').order('borrow_date', { ascending: false }),
            supabase.from('library_settings').select('*').eq('id', 'global').maybeSingle()
        ]);

        if (outErr) console.error("Outstanding Logs Error:", outErr);
        if (sErr) console.error("Students Fetch Error:", sErr);
        if (bErr) console.error("Books Fetch Error:", bErr);
        if (rErr) console.error("Reservations Fetch Error:", rErr);
        if (lErr) console.error("Recent Logs Error:", lErr);

        setOutstanding(out || []);
        setAllStudents(students || []);
        setAllBooks(books || []);
        setReservations(res || []);
        setLogs(recentLogs || []);
        if (settings) {
          setGlobalSettings(settings);
          if (settings.categories && settings.categories.length > 0) {
            // Handle both old format (array of objects) and new format (array of strings)
            const loadedCategories = settings.categories.map((cat: any) => 
              typeof cat === 'string' ? cat : cat.name
            );
            // Remove duplicates and ensure we have at least the default categories
            const uniqueCategories = [...new Set([...loadedCategories, 'General', 'Reference', 'الْكُتُب'])];
            setCategories(uniqueCategories);
          }
        }
    } catch (err) { console.error("Responsible Data Sync Error:", err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    const validateAndFetch = async () => {
      const isValid = await validateSession();
      const currentSession = getSession();
      if (!isValid || currentSession?.role !== 'responsible') {
        clearSession();
        router.push("/");
        return;
      }
      await fetchData();
    };
    validateAndFetch();
  }, []);

  const handleViewReport = async (user: any) => {
    setLoading(true);
    try {
      const { data: userLogs } = await supabase
        .from('library_logs')
        .select('*, books(*)')
        .eq('student_id', user.id)
        .order('borrow_date', { ascending: false });
      
      setSelectedStudent(user);
      setSelectedStudentLogs(userLogs || []);
      setShowReport(true);
    } catch (err) {
      alert("Error fetching reports");
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

  const handleCheckout = async () => {
    if (!selectedStudent || !selectedBook || !dueDate) return;
    setLoading(true);
    try {
        const { error } = await supabase.from('library_logs').insert([{
            student_id: selectedStudent.id,
            book_id: selectedBook.id,
            student_name: selectedStudent.full_name,
            book_title: selectedBook.title,
            borrow_date: new Date().toISOString(),
            due_date: dueDate,
            issued_by: 'Librarian'
        }]);

        if (error) throw error;

        // Update book status
        const { error: updateError } = await supabase.from('books').update({ status: 'borrowed' }).eq('id', selectedBook.id);
        if (updateError) throw updateError;

        setSelectedStudent(null);
        setSelectedBook(null);
        setPersonnelSearch("");
        setBookSearch("");
        setDueDate("");
        setConditionNotes("");
        fetchData();
        alert("✅ Transaction Authorized successfully!");
    } catch (err: any) { 
      console.error("Checkout Error Details:", {
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code,
        fullError: err
      });
      alert("❌ Transaction Failed: " + (err?.message || "Unknown error"));
    }
    finally { setLoading(false); }
  };

  const handleReturn = async (logId: string, bookId: string) => {
    setLoading(true);
    try {
        await supabase.from('library_logs').update({ 
          return_date: new Date().toISOString()
        }).eq('id', logId);
        
        await supabase.from('books').update({ status: 'available' }).eq('id', bookId);
        
        fetchData();
        alert("✅ Book returned and marked as Available.");
    } catch (err) { 
      console.error(err); 
      alert("❌ Return failed: " + (err as any)?.message);
    }
    finally { setLoading(false); }
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const book_id = newBook.book_id || `BK-${Date.now()}`;
      const qrData = JSON.stringify({ id: book_id, title: newBook.title });
      const qrCodeUrl = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });

      // Also store extra info in description for reference to avoid database errors
      let finalDescription = newBook.description || "";
      let additionalInfo = [];
      if (newBook.how_much_value) {
        additionalInfo.push(`How Much Value: ${newBook.how_much_value}`);
      }
      if (newBook.which_value) {
        additionalInfo.push(`Which Value: ${newBook.which_value}`);
      }
      if (newBook.shelf) {
        additionalInfo.push(`Shelf: ${newBook.shelf}`);
      }
      if (newBook.row) {
        additionalInfo.push(`Row: ${newBook.row}`);
      }
      if (additionalInfo.length > 0) {
        finalDescription = (finalDescription || '') + (finalDescription ? '\n\n' : '') + additionalInfo.join('\n');
      }

      const { error } = await supabase.from('books').upsert([{
        book_id,
        title: newBook.title,
        author: newBook.author,
        rate: 0,
        publisher: newBook.publisher,
        category: newBook.category,
        subcategory: "",
        language: newBook.language,
        shelf_location: `${newBook.shelf}${newBook.row ? `, ${newBook.row}` : ''}`,
        cover_image_url: newBook.cover_image_url,
        price: parseFloat(newBook.price || "0"),
        isbn: newBook.isbn || "",
        pages: 0,
        description: finalDescription,
        status: 'available'
      }], { onConflict: 'book_id' });

      if (error) throw error;

      // Update global categories in settings if changed
      await supabase.from('library_settings').upsert({ id: 'global', ...globalSettings, categories });

      setShowAddBook(false);
      setNewBook({ title: "", book_id: "", author: "", publisher: "", category: "", subcategory: "", rate: "", shelf: "", row: "", language: "English", price: "", cover_image_url: "", isbn: "", pages: "", description: "", how_much_value: "", which_value: "" });
      fetchData();
      alert("✅ Archive unit registered with QR code.");
    } catch (err: any) { 
      console.error(err);
      alert("Error adding book");
    }
    finally { setLoading(false); }
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

  const handleScannerResult = (data: string) => {
    try {
      const bookData = JSON.parse(data);
      setNewBook({
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
        how_much_value: bookData.how_much_value || bookData['How Much Value'] || "",
        which_value: bookData.which_value || bookData['Which Value'] || "",
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
      if (!Array.isArray(booksData)) throw new Error("Invalid JSON array format");

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

        // Set values in description as additional info for reference
        let finalDescription = b.description || b.desc || "";
        let additionalInfo = [];
        const howMuchValue = b.how_much_value || b['How Much Value'] || '';
        const whichValue = b.which_value || b['Which Value'] || '';
        const shelf = b.shelf || b.shelf_position || '';
        const row = b.row || b['row position'] || '';
        const archiveNomenclature = b.archive_nomenclature || b.book_nomenclature || '';
        
        if (archiveNomenclature) {
          additionalInfo.push(`Archive Nomenclature: ${archiveNomenclature}`);
        }
        if (howMuchValue) {
          additionalInfo.push(`How Much Value: ${howMuchValue}`);
        }
        if (whichValue) {
          additionalInfo.push(`Which Value: ${whichValue}`);
        }
        if (shelf) {
          additionalInfo.push(`Shelf: ${shelf}`);
        }
        if (row) {
          additionalInfo.push(`Row: ${row}`);
        }

        if (additionalInfo.length > 0) {
          finalDescription = (finalDescription || '') + (finalDescription ? '\n\n' : '') + additionalInfo.join('\n');
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
          shelf_location: b.shelf_location || b.location || (shelf ? `${shelf}${row ? `, ${row}` : ''}` : ""),
          cover_image_url: b.cover_image_url || b.book_url || b.image_url || "",
          isbn: b.isbn || "",
          description: finalDescription,
          status: 'available'
        };
      }));

      const { error } = await supabase.from('books').upsert(processedBooks, { onConflict: 'book_id' });
      if (error) throw error;

      if (categoriesChanged) {
        setCategories(currentCategories);
        await supabase.from('library_settings').upsert({ id: 'global', ...globalSettings, categories: currentCategories });
      }

      alert(`✅ Bulk import successful: ${processedBooks.length} units registered in the system.`);
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
    const folder = zip.folder("Archive_QR_Codes");
    
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
      saveAs(content, `Archive_QR_Pack_${new Date().toLocaleDateString()}.zip`);
      alert("✅ QR Pack generated and ready.");
    } catch (err) {
      alert("❌ Export failed.");
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStudents = () => {
    const searchLower = personnelSearch.toLowerCase();
    return allStudents.filter(s => 
      s.full_name.toLowerCase().includes(searchLower) || 
      s.roll_id.toLowerCase().includes(searchLower) ||
      s.username?.toLowerCase().includes(searchLower) ||
      s.grade?.toLowerCase().includes(searchLower) ||
      s.parent_phone?.toLowerCase().includes(searchLower)
    ).slice(0, 5);
  };

  const getFilteredBooks = () => {
    const searchLower = bookSearch.toLowerCase();
    return allBooks.filter(b => 
      b.title.toLowerCase().includes(searchLower) || 
      b.book_id.toLowerCase().includes(searchLower) ||
      b.author?.toLowerCase().includes(searchLower) ||
      b.publisher?.toLowerCase().includes(searchLower) ||
      b.category?.toLowerCase().includes(searchLower) ||
      b.isbn?.toLowerCase().includes(searchLower) ||
      b.shelf_location?.toLowerCase().includes(searchLower)
    ).slice(0, 5);
  };

  const isDueToday = (date: string) => {
    return new Date(date).toDateString() === new Date().toDateString();
  };

  const isOverdue = (date: string) => {
    return new Date(date) < new Date() && !isDueToday(date);
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white flex flex-col font-sans selection:bg-indigo-500/30 overflow-hidden">
      <div className="flex h-screen overflow-hidden">
        {/* Modern Sidebar */}
        <aside className="w-64 bg-black/40 border-r border-white/5 backdrop-blur-3xl p-6 flex flex-col hidden lg:flex">
          <div className="flex items-center space-x-3 mb-12 px-2">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-xl flex items-center justify-center font-black text-xl shadow-2xl shadow-indigo-900/50 italic">LT</div>
            <div>
              <span className="font-black text-xl tracking-tighter uppercase italic block leading-none">LIBRARY.</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest italic">Terminal</span>
                <div className="flex items-center space-x-1 px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded border border-amber-500/20">
                  <Clock className="w-2 h-2" />
                  <span className="text-[6px] font-black uppercase tracking-widest italic">Responsible</span>
                </div>
              </div>
            </div>
          </div>

          <nav className="space-y-3 flex-1">
             {[
               {id:'desk',l:'Transfers',i:Notebook, c:'indigo'}, 
               {id:'inventory',l:'Inventory',i:BookOpen, c:'emerald'},
               {id:'management',l:'Registry Hub',i:Zap, c:'amber'},
               {id:'personnel',l:'Personnel',i:Users, c:'purple'},
               {id:'tasks',l:'Operations',i:ClipboardList, c:'rose'},
               {id:'analytics',l:'Analytics',i:BarChart3, c:'amber'},
             ].map(x => (
                <button key={x.id} onClick={() => setActiveTab(x.id as any)} className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all duration-300 relative group ${activeTab === x.id ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                   <x.i className={`w-4 h-4 transition-transform group-hover:scale-125 ${activeTab === x.id ? 'text-indigo-500' : ''}`}/> 
                   <span className="font-black text-[9px] uppercase tracking-widest">{x.l}</span>
                   {activeTab === x.id && <motion.div layoutId="nav-pill" className="absolute -left-10 w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]" />}
                </button>
             ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-white/5">
            <button onClick={() => { clearSession(); router.push("/"); }} className="w-full flex items-center space-x-3 p-4 text-rose-500/60 hover:text-rose-500 transition-colors font-black text-[9px] uppercase tracking-widest">
              <LogOut className="w-4 h-4"/> Secure Exit
            </button>
          </div>
        </aside>

        {/* Main Interface */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 md:px-10 pt-10 pb-20 bg-[#020617] relative custom-scroll">
          <div className="max-w-6xl mx-auto">
            <header className="flex justify-between items-end mb-12">
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase italic leading-none mb-3">
                  {activeTab === 'desk' ? 'Digital Ledger' : 
                   activeTab === 'management' ? 'Registry Hub' :
                   activeTab === 'inventory' ? 'Inventory' :
                   activeTab === 'personnel' ? 'Personnel' : 
                   activeTab === 'tasks' ? 'Operations' : 'Analytics'}
                </h1>
                <div className="flex items-center space-x-3">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/>
                  <p className="text-gray-600 text-[8px] font-black uppercase tracking-widest italic">Node Status: Active • AES-256</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Real-time Stats Bento (Small) */}
                <div className="hidden md:flex items-center space-x-3 bg-white/5 p-3 rounded-2xl border border-white/5 backdrop-blur-xl">
                   <div className="px-4 border-r border-white/10 text-center">
                      <p className="text-[6px] font-black text-gray-500 uppercase tracking-widest mb-0.5 italic">Personnel</p>
                      <p className="text-lg font-black italic text-indigo-400 leading-none">{allStudents.length}</p>
                   </div>
                   <div className="px-4 border-r border-white/10 text-center">
                      <p className="text-[6px] font-black text-gray-500 uppercase tracking-widest mb-0.5 italic">Archive</p>
                      <p className="text-lg font-black italic text-emerald-400 leading-none">{allBooks.length}</p>
                   </div>
                   <div className="px-4 text-center">
                      <p className="text-[6px] font-black text-gray-500 uppercase tracking-widest mb-0.5 italic">Transfers</p>
                      <p className="text-lg font-black italic text-amber-400 leading-none">{outstanding.length}</p>
                   </div>
                </div>
                <button onClick={fetchData} className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all group active:scale-95">
                  <Activity className={`w-5 h-5 text-gray-500 group-hover:text-indigo-400 ${loading ? 'animate-spin' : ''}`}/>
                </button>
              </div>
            </header>

            <AnimatePresence mode="wait">
              {activeTab === 'desk' && (
                <motion.div key="desk" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-10">
                   <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      {/* Step 1: Personnel Selection */}
                      <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-3xl space-y-6 flex flex-col h-[600px]">
                         <div className="flex items-center space-x-3 text-indigo-400">
                            <UserPlus className="w-5 h-5" />
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] italic">01. Select Personnel</h3>
                         </div>
                         <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                            <input 
                               value={personnelSearch}
                               onChange={(e) => setPersonnelSearch(e.target.value)}
                               className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-black italic text-white outline-none focus:ring-2 ring-indigo-500/20" 
                               placeholder="Search name or ID..." 
                            />
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scroll">
                            {getFilteredStudents().map(s => (
                               <button key={s.id} onClick={() => setSelectedStudent(s)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${selectedStudent?.id === s.id ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/20 text-gray-400'}`}>
                                  <div className="flex items-center space-x-3">
                                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${selectedStudent?.id === s.id ? 'bg-white/20' : 'bg-indigo-500/10 text-indigo-400'}`}>{s.full_name[0]}</div>
                                     <div className="text-left">
                                        <p className="font-black text-[10px] italic leading-none mb-1">{s.full_name}</p>
                                        <p className="text-[7px] font-black opacity-50 uppercase">{s.roll_id}</p>
                                     </div>
                                  </div>
                                  {selectedStudent?.id === s.id && <CheckCircle2 className="w-4 h-4" />}
                               </button>
                            ))}
                            {allStudents.length === 0 && <p className="text-[8px] text-center text-gray-600 mt-10 italic uppercase font-black">Scanning for Identity Nodes...</p>}
                         </div>
                      </div>

                      {/* Step 2: Archive Selection */}
                      <div className="bg-white/[0.02] border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-3xl space-y-6 flex flex-col h-[600px]">
                         <div className="flex items-center space-x-3 text-emerald-400">
                            <Package className="w-5 h-5" />
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] italic">02. Select Archive</h3>
                         </div>
                         <div className="relative">
                            <Scan className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                            <input 
                               value={bookSearch}
                               onChange={(e) => setBookSearch(e.target.value)}
                               className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-black italic text-white outline-none focus:ring-2 ring-emerald-500/20" 
                               placeholder="Search unit title or ID..." 
                            />
                         </div>
                         <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scroll">
                            {getFilteredBooks().map(b => (
                               <button key={b.id} onClick={() => setSelectedBook(b)} className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border ${selectedBook?.id === b.id ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg' : 'bg-white/5 border-white/5 hover:border-white/20 text-gray-400'}`}>
                                  <div className="flex items-center space-x-3">
                                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black ${selectedBook?.id === b.id ? 'bg-white/20' : 'bg-emerald-500/10 text-emerald-400'}`}><BookOpen className="w-4 h-4" /></div>
                                     <div className="text-left">
                                        <p className="font-black text-[10px] italic leading-none mb-1">"{b.title}"</p>
                                        <p className="text-[7px] font-black opacity-50 uppercase">{b.book_id}</p>
                                     </div>
                                  </div>
                                  {selectedBook?.id === b.id && <CheckCircle2 className="w-4 h-4" />}
                               </button>
                            ))}
                            {allBooks.length === 0 && <p className="text-[8px] text-center text-gray-600 mt-10 italic uppercase font-black">Indexing Master Catalog...</p>}
                         </div>
                      </div>

                      {/* Step 3: Authorization */}
                      <div className="bg-gradient-to-br from-indigo-600/10 to-blue-600/10 border border-white/5 p-8 rounded-[2.5rem] backdrop-blur-3xl space-y-8 flex flex-col h-[600px]">
                         <div className="flex items-center space-x-3 text-white">
                            <ShieldCheck className="w-5 h-5" />
                            <h3 className="text-xs font-black uppercase tracking-[0.3em] italic">03. Final Authorization</h3>
                         </div>
                         
                         <div className="space-y-4 flex-1">
                            <div className="p-6 bg-black/40 rounded-3xl border border-white/5 space-y-4">
                               <div className="flex justify-between items-center border-b border-white/5 pb-3">
                                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic">Personnel</span>
                                  <span className="text-[10px] font-black text-white italic truncate max-w-[120px]">{selectedStudent?.full_name || 'AWAITING_ID'}</span>
                               </div>
                               <div className="flex justify-between items-center">
                                  <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic">Archive Unit</span>
                                  <span className="text-[10px] font-black text-white italic truncate max-w-[120px]">{selectedBook?.title || 'AWAITING_NODE'}</span>
                               </div>
                            </div>

                            <div className="space-y-2">
                               <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Return Protocol Date</label>
                               <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-[10px] font-black text-white outline-none focus:ring-2 ring-indigo-500/20" />
                            </div>

                            <div className="space-y-2">
                               <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest ml-2 italic">Physical State Notes</label>
                               <textarea value={conditionNotes} onChange={(e) => setConditionNotes(e.target.value)} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-[9px] font-bold text-white outline-none resize-none h-24" placeholder="Integrity Check..." />
                            </div>
                         </div>

                         <button 
                            onClick={handleCheckout}
                            disabled={!selectedStudent || !selectedBook || !dueDate || loading}
                            className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] transition-all shadow-2xl shadow-indigo-900/40 active:scale-95"
                         >
                            {loading ? 'SYNCING...' : 'AUTHORIZE TRANSFER'}
                         </button>
                      </div>
                   </div>

                   {/* Registry Hub Preview */}
                   <div className="space-y-6">
                      <div className="flex items-center justify-between px-4">
                         <h3 className="text-lg font-black uppercase italic tracking-tighter text-white flex items-center">
                           <Activity className="w-4 h-4 mr-3 text-emerald-500" />Recent Transmissions
                         </h3>
                         <div className="flex items-center space-x-3">
                            <button onClick={() => setShowBulkAdd(true)} className="px-6 py-3 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center space-x-2 transition-all border border-indigo-500/20">
                               <Code className="w-3.5 h-3.5" />
                               <span>Bulk Import</span>
                            </button>
                            <button onClick={downloadAllQRs} className="px-6 py-3 bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center space-x-2 transition-all border border-amber-500/20">
                               <Download className="w-3.5 h-3.5" />
                               <span>Export QRs</span>
                            </button>
                            <button onClick={() => setShowAddBook(true)} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-black uppercase text-[8px] tracking-widest flex items-center space-x-2 transition-all shadow-lg shadow-emerald-900/40">
                               <Plus className="w-3.5 h-3.5" />
                               <span>Add New Unit</span>
                            </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         {/* Transaction Table */}
                         <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-3xl h-fit">
                            <table className="w-full text-left">
                               <thead className="bg-black/40 text-[7px] uppercase tracking-[0.3em] font-black text-gray-700 italic border-b border-white/5">
                                  <tr>
                                     <th className="p-6">Target Personnel</th>
                                     <th className="p-6">Archive Unit</th>
                                     <th className="p-6 text-right">Action</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-white/5">
                                  {outstanding.slice(0, 5).map(log => (
                                    <tr key={log.id} className="hover:bg-white/[0.02] transition-colors group">
                                       <td className="p-6">
                                          <div className="flex items-center space-x-3">
                                             <div className="w-9 h-9 bg-indigo-500/10 rounded-lg flex items-center justify-center font-black text-indigo-500 border border-indigo-500/20 text-xs">{log.students?.full_name[0]}</div>
                                             <div><p className="font-black text-xs text-white italic leading-none mb-1">{log.students?.full_name}</p><p className="text-[7px] font-black text-gray-700 uppercase">{log.students?.roll_id}</p></div>
                                          </div>
                                       </td>
                                       <td className="p-6">
                                          <p className="font-black text-white italic tracking-tight uppercase text-xs leading-none mb-1">"{log.books?.title}"</p>
                                          <p className="text-[7px] font-black text-gray-700 uppercase">ID: {log.books?.book_id}</p>
                                       </td>
                                       <td className="p-6 text-right">
                                          <button onClick={() => handleReturn(log.id, log.books.id)} className="px-5 py-3 bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all border border-emerald-500/20">Return</button>
                                       </td>
                                    </tr>
                                  ))}
                               </tbody>
                            </table>
                         </div>

                         {/* Recent Archive Units Preview */}
                         <div className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl backdrop-blur-3xl space-y-6">
                            <div className="flex items-center justify-between">
                               <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 italic flex items-center"><BookOpen className="w-3.5 h-3.5 mr-2" />Recent Additions</h4>
                               <button onClick={() => setActiveTab('inventory')} className="text-[7px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">View Inventory</button>
                            </div>
                            <div className="space-y-3">
                               {allBooks.slice(0, 4).map(book => (
                                 <div key={book.id} className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-center space-x-4">
                                       <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20"><BookOpen className="w-4 h-4" /></div>
                                       <div>
                                          <p className="font-black text-xs text-white italic truncate max-w-[150px]">"{book.title}"</p>
                                          <p className="text-[7px] font-black text-gray-600 uppercase">{book.category || 'General'}</p>
                                       </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-lg text-[6px] font-black uppercase tracking-widest border ${book.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>{book.status}</span>
                                 </div>
                               ))}
                               {allBooks.length === 0 && <p className="text-[8px] text-gray-600 text-center py-10 italic uppercase font-black">No Units Found</p>}
                            </div>
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'management' && (
                <motion.div key="management" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-12">
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

              {activeTab === 'inventory' && (
                <motion.div key="inventory" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-12">
                   <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                      <div className="relative flex-1 w-full max-w-2xl">
                         <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-700" />
                         <input 
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full bg-white/5 border border-white/5 rounded-3xl py-6 pl-16 pr-6 text-white font-bold text-sm outline-none focus:ring-4 ring-indigo-500/10 placeholder:text-gray-800" 
                           placeholder="Filter inventory by title, author, or book serial..." 
                         />
                      </div>
                      <div className="flex items-center space-x-4">
                         <button onClick={handleDeleteAllBooks} className="px-8 py-6 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white rounded-3xl font-black uppercase text-[10px] tracking-widest flex items-center space-x-3 transition-all border border-rose-500/20">
                            <Trash2 className="w-5 h-5" />
                            <span>Purge Catalog</span>
                         </button>
                         <button onClick={() => setShowAddBook(true)} className="px-10 py-6 bg-emerald-600 hover:bg-emerald-500 rounded-3xl font-black uppercase text-[10px] tracking-[0.3em] flex items-center space-x-4 transition-all shadow-xl shadow-emerald-900/40">
                            <Plus className="w-5 h-5" />
                            <span>Register New Archive</span>
                         </button>
                      </div>
                   </header>

                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {allBooks.filter(b => {
                        if (!searchTerm) return true;
                        const term = searchTerm.toLowerCase();
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
                                    <span className={`px-3 py-1 rounded-full text-[6px] font-black uppercase tracking-widest backdrop-blur-xl border shadow-lg ${book.status === 'available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : book.status === 'borrowed' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-rose-500/10 text-rose-500 border-rose-500/20'}`}>
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
                                    <span className="text-[6px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Location</span>
                                    <span className="text-[9px] font-black text-gray-400 uppercase truncate">{book.shelf_location || 'UNDEFINED'}</span>
                                 </div>
                                 <div className="bg-white/5 rounded-xl p-2.5 border border-white/5 flex flex-col justify-center">
                                    <span className="text-[6px] font-black text-gray-600 uppercase tracking-widest mb-1 italic">Price</span>
                                    <span className="text-[9px] font-black text-emerald-400 italic truncate">{book.price ? `$${book.price}` : 'N/A'}</span>
                                 </div>
                              </div>

                              {/* Action Footer */}
                              <div className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2">
                                 <button 
                                   onClick={() => handleViewBookDetails(book)} 
                                   className="flex-1 py-3 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all border border-indigo-500/20 flex items-center justify-center space-x-2"
                                 >
                                    <Info className="w-3 h-3" />
                                    <span>Details</span>
                                 </button>
                                 <button 
                                   onClick={() => { setSelectedBookForEdit(book); setShowEditBook(true); }} 
                                   className="px-3 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl font-black uppercase text-[8px] tracking-widest transition-all border border-white/5 flex items-center justify-center space-x-2"
                                 >
                                    <PenTool className="w-3 h-3" />
                                    <span>Edit</span>
                                 </button>
                                 <button 
                                   onClick={() => { if(confirm('Permanently erase this archive unit?')) supabase.from('books').delete().eq('id', book.id).then(fetchData); }}
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

              {activeTab === 'personnel' && (
                <motion.div key="personnel" initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} className="space-y-6">
                   <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                      <div className="relative flex-1 w-full">
                         <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-700" />
                         <input 
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                           className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white font-black italic outline-none focus:ring-4 ring-indigo-500/10 placeholder:text-gray-800" 
                           placeholder="Search personnel records by name or roll..." 
                         />
                      </div>
                   </div>

                   <div className="bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-3xl">
                      <table className="w-full text-left">
                         <thead className="bg-black/40 text-[8px] uppercase tracking-[0.3em] font-black text-gray-700 italic border-b border-white/5">
                            <tr>
                               <th className="p-6">Personnel Identity</th>
                               <th className="p-6">Privilege Level</th>
                               <th className="p-6">Terminal Handle</th>
                               <th className="p-6 text-right">Activity</th>
                            </tr>
                         </thead>
                         <tbody className="divide-y divide-white/5">
                            {allStudents.filter(s => s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || s.roll_id.toLowerCase().includes(searchTerm.toLowerCase())).map(user => (
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
                                    <span className={`px-4 py-1.5 rounded-full text-[7px] font-black uppercase tracking-widest italic border ${user.is_responsible ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                       {user.is_responsible ? 'Librarian' : 'Student'}
                                    </span>
                                 </td>
                                 <td className="p-6">
                                    <p className="text-[10px] font-black text-gray-500 italic">{user.username}@domain.com</p>
                                 </td>
                                 <td className="p-6 text-right">
                                    <div className="flex items-center justify-end space-x-2 text-emerald-500/40 font-black text-[7px] uppercase tracking-widest italic">
                                       <Activity className="w-2.5 h-2.5" /> Node Connected
                                    </div>
                                 </td>
                              </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </motion.div>
              )}

              {activeTab === 'tasks' && (
                <motion.div key="tasks" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} className="space-y-10">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Overdue Tracker */}
                      <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-3xl space-y-6">
                         <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center">
                               <AlertTriangle className="w-6 h-6 mr-3 text-rose-500" />Overdue Registry
                            </h3>
                            <span className="bg-rose-500/10 text-rose-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">{outstanding.filter(l => isOverdue(l.due_date)).length} DELAYED</span>
                         </div>
                         <div className="space-y-3">
                            {outstanding.filter(l => isOverdue(l.due_date)).map(log => (
                               <div key={log.id} className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-2xl flex items-center justify-between group hover:bg-rose-500/10 transition-all">
                                  <div>
                                     <p className="font-black text-white italic text-sm">"{log.books?.title}"</p>
                                     <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1">Personnel: {log.students?.full_name}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[9px] font-black text-white italic mb-1">Due {new Date(log.due_date).toLocaleDateString()}</p>
                                     <button className="text-[7px] font-black uppercase tracking-widest text-indigo-400 hover:underline">Notify</button>
                                  </div>
                               </div>
                            ))}
                            {outstanding.filter(l => isOverdue(l.due_date)).length === 0 && (
                               <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                                  <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-emerald-500" />
                                  <p className="text-[8px] font-black uppercase tracking-widest">No Overdue Transactions</p>
                               </div>
                            )}
                         </div>
                      </div>

                      {/* Due Today */}
                      <div className="bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-3xl space-y-6">
                         <div className="flex items-center justify-between">
                            <h3 className="text-xl font-black uppercase italic tracking-tighter flex items-center">
                               <Clock className="w-6 h-6 mr-3 text-amber-500" />Expected Today
                            </h3>
                            <span className="bg-amber-500/10 text-amber-500 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase">{outstanding.filter(l => isDueToday(l.due_date)).length} PENDING</span>
                         </div>
                         <div className="space-y-3">
                            {outstanding.filter(l => isDueToday(l.due_date)).map(log => (
                               <div key={log.id} className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl flex items-center justify-between group hover:bg-amber-500/10 transition-all">
                                  <div>
                                     <p className="font-black text-white italic text-sm">"{log.books?.title}"</p>
                                     <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest mt-1">Personnel: {log.students?.full_name}</p>
                                  </div>
                                  <button onClick={() => handleReturn(log.id, log.books.id)} className="px-4 py-2.5 bg-amber-500 text-black rounded-lg font-black uppercase text-[7px] tracking-widest shadow-lg active:scale-95">Verify</button>
                               </div>
                            ))}
                            {outstanding.filter(l => isDueToday(l.due_date)).length === 0 && (
                               <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-2xl opacity-20">
                                  <HistoryIcon className="w-10 h-10 mx-auto mb-3 text-gray-500" />
                                  <p className="text-[8px] font-black uppercase tracking-widest">No scheduled returns</p>
                               </div>
                            )}
                         </div>
                      </div>
                   </div>
                </motion.div>
              )}

              {activeTab === 'analytics' && (
                <motion.div key="analytics" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-12">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {/* Popularity Card */}
                      <div className="md:col-span-2 bg-white/5 border border-white/5 p-10 rounded-[4rem] backdrop-blur-3xl space-y-10">
                         <h3 className="text-xs font-black uppercase tracking-[0.4em] text-indigo-400 flex items-center italic"><TrendingUp className="w-5 h-5 mr-4" />Archive Demand Index</h3>
                         <div className="space-y-6">
                            {(() => {
                               const counts: any = {};
                               logs.forEach(l => { if(l.books) counts[l.books.title] = (counts[l.books.title] || 0) + 1 });
                               return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5).map(([title, count]: any, i) => (
                                 <div key={i} className="flex items-center justify-between p-6 bg-black/40 rounded-3xl border border-white/5">
                                    <div className="flex items-center space-x-6">
                                       <span className="text-xs font-black text-gray-700 italic">#{i+1}</span>
                                       <p className="font-black text-white italic truncate max-w-[300px]">"{title}"</p>
                                    </div>
                                    <div className="flex items-center space-x-4">
                                       <div className="h-1.5 w-32 bg-white/5 rounded-full overflow-hidden">
                                          <div className="h-full bg-indigo-500" style={{ width: `${(count / logs.length) * 100}%` }} />
                                       </div>
                                       <span className="text-[10px] font-black text-indigo-400">{count} Transfers</span>
                                    </div>
                                 </div>
                               ));
                            })()}
                         </div>
                      </div>

                      {/* Inventory Distribution */}
                      <div className="bg-white/5 border border-white/5 p-10 rounded-[4rem] backdrop-blur-3xl space-y-10">
                         <h3 className="text-xs font-black uppercase tracking-[0.4em] text-emerald-400 flex items-center italic"><Package className="w-5 h-5 mr-4" />Unit Distribution</h3>
                         <div className="flex flex-col items-center justify-center space-y-8 py-10">
                            <div className="relative w-48 h-48">
                               <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="12" className="text-white/5" />
                                  <circle cx="50" cy="50" r="40" fill="transparent" stroke="currentColor" strokeWidth="12" strokeDasharray={`${(allBooks.filter(b => b.status === 'available').length / allBooks.length) * 251.2} 251.2`} className="text-emerald-500" />
                               </svg>
                               <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <p className="text-3xl font-black italic">{Math.round((allBooks.filter(b => b.status === 'available').length / allBooks.length) * 100) || 0}%</p>
                                  <p className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Available</p>
                               </div>
                            </div>
                            <div className="w-full space-y-4">
                               <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-widest px-4">
                                  <span className="text-emerald-500">Available: {allBooks.filter(b => b.status === 'available').length}</span>
                                  <span className="text-amber-500">Borrowed: {allBooks.filter(b => b.status === 'borrowed').length}</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Reader Leaderboard */}
                   <div className="bg-white/5 border border-white/5 p-10 rounded-[4rem] backdrop-blur-3xl space-y-10">
                      <h3 className="text-xs font-black uppercase tracking-[0.4em] text-amber-400 flex items-center italic"><Star className="w-5 h-5 mr-4" />Elite Reader Registry</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                         {(() => {
                            const counts: any = {};
                            logs.forEach(l => { if(l.students) counts[l.students.full_name] = (counts[l.students.full_name] || 0) + 1 });
                            return Object.entries(counts).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6).map(([name, count]: any, i) => (
                              <div key={i} className="p-8 bg-black/40 rounded-3xl border border-white/5 group hover:border-amber-500/20 transition-all flex items-center justify-between">
                                 <div className="flex items-center space-x-4">
                                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 font-black text-xs">{i+1}</div>
                                    <p className="font-black text-sm text-white italic">{name}</p>
                                 </div>
                                 <p className="text-xl font-black text-amber-400 italic">{count}</p>
                              </div>
                            ));
                         })()}
                      </div>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* QR Scanner Modal */}
       <AnimatePresence>
        {showScanner && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[60] flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0f172a] border border-white/10 w-full max-w-lg rounded-[3rem] p-10 relative overflow-hidden text-center">
              <button onClick={() => setShowScanner(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
              <h2 className="text-3xl font-black italic mb-2 uppercase tracking-tighter text-indigo-400">Rapid_QR_Deployment</h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-10 italic">Align node identifier with optical sensor</p>

              <div className="w-full aspect-square rounded-[2.5rem] overflow-hidden border-4 border-indigo-600/20 bg-black/40 relative shadow-2xl shadow-indigo-900/20">
                 <QrScanner onResult={handleScannerResult} />
                 <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none" />
                 <div className="absolute inset-[60px] border border-indigo-500/50 rounded-3xl animate-pulse pointer-events-none">
                    <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.5)]" />
                 </div>
              </div>

              <button
                onClick={() => setShowScanner(false)}
                className="mt-10 w-full py-5 bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border border-white/5"
              >
                Abort Protocol
              </button>
            </motion.div>
          </motion.div>
        )}
       </AnimatePresence>

       {/* Add Book Modal */}
      <AnimatePresence>
        {showAddBook && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[4rem] p-12 relative overflow-hidden flex flex-col md:flex-row gap-12">
               <button onClick={() => setShowAddBook(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
               <div className="w-full md:w-80 h-[450px] bg-black/40 rounded-[3rem] border border-dashed border-white/10 flex flex-col items-center justify-center p-12 text-center group-hover:border-emerald-500/20 transition-all text-gray-800">
                  <div className="w-24 h-32 border border-white/5 rounded-xl flex items-center justify-center mb-6">
                    <Package className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest px-10 leading-relaxed">Cover Visualizer Pending...</p>
               </div>
               <div className="flex-1 space-y-10">
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">Register_New_Archive</h2>
                  <form onSubmit={handleAddBook} className="grid grid-cols-2 gap-8">
                     <div className="col-span-2">
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Book Nomenclature (Required)</label>
                        <input required value={newBook.title} onChange={e => setNewBook({...newBook, title: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-lg font-black italic text-white outline-none focus:ring-2 ring-emerald-500/20" placeholder="Archive Unit Name..." />
                     </div>
                     <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Authority (Author) (Required)</label>
                        <input required value={newBook.author} onChange={e => setNewBook({...newBook, author: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold text-white outline-none" placeholder="Primary Author..." />
                     </div>
                     <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Price (₹) (Required)</label>
                        <input required type="number" value={newBook.price} onChange={e => setNewBook({...newBook, price: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-black text-white outline-none" placeholder="0.00" />
                     </div>
                     <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Category (Required)</label>
                        <select 
                          required 
                          value={newBook.category} 
                          onChange={e => setNewBook({...newBook, category: e.target.value})}
                          className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-black text-white outline-none focus:ring-2 ring-emerald-500/20"
                        >
                          <option value="" className="bg-[#0f172a]">Select Category</option>
                          {categories.map(cat => (
                            <option key={cat} value={cat} className="bg-[#0f172a]">{cat}</option>
                          ))}
                        </select>
                     </div>
                     <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Serial ID (Optional)</label>
                        <input value={newBook.book_id} onChange={e => setNewBook({...newBook, book_id: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-black text-indigo-400 outline-none uppercase" placeholder="UID-0000" />
                     </div>
                     <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Publisher (Optional)</label>
                        <input value={newBook.publisher} onChange={e => setNewBook({...newBook, publisher: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold text-white outline-none" placeholder="Publisher Name..." />
                     </div>
                     <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Language (Optional)</label>
                        <input value={newBook.language} onChange={e => setNewBook({...newBook, language: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold text-white outline-none" placeholder="English, etc." />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div>
                           <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Shelf Number/Name (Optional)</label>
                           <input value={newBook.shelf} onChange={e => setNewBook({...newBook, shelf: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold text-white outline-none" placeholder="Shelf A..." />
                        </div>
                        <div>
                           <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Row (Optional)</label>
                           <input value={newBook.row} onChange={e => setNewBook({...newBook, row: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold text-white outline-none" placeholder="Row 1..." />
                        </div>
                     </div>
                     <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Book URL / Cover URL (Optional)</label>
                        <input value={newBook.cover_image_url} onChange={e => setNewBook({...newBook, cover_image_url: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold text-white outline-none" placeholder="https://..." />
                     </div>
                     <div className="col-span-2 pt-6">
                        <button type="submit" disabled={loading} className="w-full py-8 bg-emerald-600 hover:bg-emerald-500 rounded-[2rem] font-black uppercase tracking-[0.5em] text-white shadow-2xl shadow-emerald-900/40 transition-all flex items-center justify-center space-x-6 text-sm">
                           <ShieldCheck className="w-6 h-6"/>
                           <span>{loading ? 'SYNCHRONIZING...' : 'COMMIT ARCHIVE'}</span>
                        </button>
                     </div>
                   </form>
                </div>
             </motion.div>
           </motion.div>
         )}
       </AnimatePresence>

       {/* Edit Book Modal */}
       <AnimatePresence>
        {showEditBook && selectedBookForEdit && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[3rem] p-12 relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={() => { setShowEditBook(false); setSelectedBookForEdit(null); }} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
              <h2 className="text-3xl font-black italic mb-8 uppercase tracking-tighter text-emerald-400">Modify_Archive_Unit</h2>
              
              <form onSubmit={handleUpdateBook} className="flex-1 overflow-y-auto pr-4 custom-scroll space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Title</label>
                      <input required value={selectedBookForEdit.title} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, title: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Author</label>
                      <input value={selectedBookForEdit.author} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, author: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-emerald-500/20" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Category</label>
                        <select value={selectedBookForEdit.category} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, category: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-black outline-none">
                          {categories.map(c => <option key={c} value={c} className="bg-[#0f172a]">{c}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Shelf</label>
                        <input value={selectedBookForEdit.shelf_location?.split(',')[0]?.trim() || ''} onChange={e => {
                          const currentParts = selectedBookForEdit.shelf_location?.split(',') || ['', ''];
                          const newLocation = `${e.target.value}${currentParts[1] ? `, ${currentParts[1].trim()}` : ''}`;
                          setSelectedBookForEdit({...selectedBookForEdit, shelf_location: newLocation});
                        }} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none" placeholder="Shelf A..." />
                      </div>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Row</label>
                      <input value={selectedBookForEdit.shelf_location?.split(',')[1]?.trim() || ''} onChange={e => {
                        const currentParts = selectedBookForEdit.shelf_location?.split(',') || ['', ''];
                        const newLocation = `${currentParts[0] ? currentParts[0].trim() : ''}${e.target.value ? `, ${e.target.value}` : ''}`;
                        setSelectedBookForEdit({...selectedBookForEdit, shelf_location: newLocation});
                      }} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none" placeholder="Row 1..." />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Cover URL</label>
                      <input value={selectedBookForEdit.cover_image_url} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, cover_image_url: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">ISBN</label>
                      <input value={selectedBookForEdit.isbn} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, isbn: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 block ml-2">Description</label>
                      <textarea value={selectedBookForEdit.description} onChange={e => setSelectedBookForEdit({...selectedBookForEdit, description: e.target.value})} className="w-full bg-black/40 border border-white/10 p-5 rounded-2xl text-xs font-bold outline-none h-24 resize-none" />
                    </div>
                  </div>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 p-8 rounded-[2rem] font-black uppercase tracking-[0.4em] text-white shadow-2xl shadow-emerald-900/40 transition-all text-xs">
                  {loading ? 'SYNCHRONIZING...' : 'COMMIT CHANGES'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
       </AnimatePresence>

       {/* Bulk Add Modal */}
       <AnimatePresence>
        {showBulkAdd && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0f172a] border border-white/10 w-full max-w-2xl rounded-[3rem] p-12 relative overflow-hidden">
              <button onClick={() => setShowBulkAdd(false)} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
              <h2 className="text-3xl font-black italic mb-4 uppercase tracking-tighter text-indigo-400">Bulk_Archive_Import</h2>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8 italic">Paste JSON array containing book objects. QR codes will be auto-generated.</p>
              
              <div className="space-y-6">
                <div className="relative">
                  <textarea 
                    value={bulkJson} 
                    onChange={(e) => setBulkJson(e.target.value)}
                    className="w-full h-64 bg-black/40 border border-white/10 p-6 rounded-3xl text-xs font-mono text-indigo-300 outline-none focus:ring-2 ring-indigo-500/20 resize-none"
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
                
                <div className="bg-indigo-500/5 border border-indigo-500/10 p-6 rounded-2xl">
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
                  className="w-full py-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-20 text-white rounded-[2rem] font-black uppercase text-[10px] tracking-[0.4em] transition-all shadow-2xl shadow-indigo-900/40"
                >
                  {loading ? 'GENERATING_NODES...' : 'INITIALIZE BULK IMPORT'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
       </AnimatePresence>

       {/* Student Report Modal */}
       <AnimatePresence>
        {showReport && selectedStudent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[3rem] p-12 relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={() => { setShowReport(false); setSelectedStudent(null); }} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
              
              <div className="flex items-center space-x-6 mb-12">
                <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center font-black text-2xl text-indigo-500 border border-indigo-500/20">{selectedStudent.full_name[0]}</div>
                <div>
                   <h2 className="text-3xl font-black italic tracking-tighter uppercase">{selectedStudent.full_name}</h2>
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 italic">Personnel Activity Log • {selectedStudent.roll_id}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 custom-scroll space-y-6">
                 {selectedStudentLogs.length > 0 ? (
                    <div className="space-y-4">
                       {selectedStudentLogs.map((log) => (
                          <div key={log.id} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between group hover:border-indigo-500/30 transition-all">
                             <div className="flex items-center space-x-6">
                                <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center border border-white/5 group-hover:bg-indigo-600/10 group-hover:border-indigo-500/20 transition-all">
                                   <BookOpen className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                   <p className="font-black text-white italic truncate max-w-[300px]">"{log.books?.title}"</p>
                                   <div className="flex items-center space-x-3 mt-1">
                                      <span className={`text-[8px] font-black uppercase tracking-widest ${log.return_date ? 'text-emerald-500' : 'text-amber-500'}`}>
                                         {log.return_date ? 'Returned' : 'In Transit'}
                                      </span>
                                      <span className="w-1 h-1 bg-gray-700 rounded-full" />
                                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest">
                                         {new Date(log.borrow_date).toLocaleDateString()}
                                      </span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-right">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest font-mono">#{log.id.slice(0, 8).toUpperCase()}</p>
                             </div>
                          </div>
                       ))}
                    </div>
                 ) : (
                    <div className="py-20 text-center border-2 border-dashed border-white/5 rounded-[2rem] opacity-30">
                       <HistoryIcon className="w-12 h-12 mx-auto mb-4" />
                       <p className="font-black uppercase italic text-xs tracking-[0.2em]">No Transactional Records Found</p>
                    </div>
                 )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Book Details Modal */}
      <AnimatePresence>
        {showBookDetails && selectedBookDetails && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-50 flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-[#0f172a] border border-white/10 w-full max-w-4xl rounded-[3rem] p-12 relative overflow-hidden flex flex-col max-h-[90vh]">
              <button onClick={() => { setShowBookDetails(false); setSelectedBookDetails(null); }} className="absolute top-8 right-8 text-gray-500 hover:text-white transition-colors"><X className="w-8 h-8" /></button>
              
              <div className="flex items-start space-x-8 mb-12">
                <div className="w-32 h-40 bg-black/40 rounded-2xl overflow-hidden border border-white/5 flex items-center justify-center">
                  {selectedBookDetails.cover_image_url ? (
                    <img src={selectedBookDetails.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-black italic tracking-tighter uppercase mb-2">"{selectedBookDetails.title}"</h2>
                  <p className="text-[12px] font-bold text-gray-400 uppercase tracking-widest italic mb-6">{selectedBookDetails.author || "Unknown Author"}</p>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Book ID</span>
                        <span className="text-lg font-black text-white italic">{selectedBookDetails.book_id}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Publisher</span>
                        <span className="text-sm font-bold text-gray-300 italic">{selectedBookDetails.publisher || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Price</span>
                        <span className="text-lg font-black text-emerald-400 italic">{selectedBookDetails.price ? `$${selectedBookDetails.price}` : "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Location</span>
                        <span className="text-sm font-bold text-gray-300 italic">{selectedBookDetails.shelf_location || "N/A"}</span>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Category</span>
                        <span className="text-sm font-bold text-indigo-400 italic">{selectedBookDetails.category || "General"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Language</span>
                        <span className="text-sm font-bold text-gray-300 italic">{selectedBookDetails.language || "English"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">Pages</span>
                        <span className="text-sm font-bold text-gray-300 italic">{selectedBookDetails.pages || "N/A"}</span>
                      </div>
                      <div>
                        <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest italic block mb-1">ISBN</span>
                        <span className="text-sm font-bold text-gray-300 italic">{selectedBookDetails.isbn || "N/A"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Borrowing Status */}
              <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8 mb-8">
                <h3 className="text-xl font-black italic uppercase tracking-tight mb-6 text-indigo-400">Current Status</h3>
                {selectedBookDetails.current_borrow ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                          <UserCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-black text-white italic">{selectedBookDetails.current_borrow.students?.full_name}</p>
                          <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Roll: {selectedBookDetails.current_borrow.students?.roll_id}</p>
                        </div>
                      </div>
                      <div className="text-right">
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
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <p className="text-lg font-black text-emerald-400 italic uppercase tracking-tight">Available for Checkout</p>
                    <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mt-2">No active borrowing records</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedBookDetails.description && (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-8">
                  <h3 className="text-xl font-black italic uppercase tracking-tight mb-6 text-indigo-400">Description</h3>
                  <p className="text-sm font-medium text-gray-300 leading-relaxed italic">{selectedBookDetails.description}</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
