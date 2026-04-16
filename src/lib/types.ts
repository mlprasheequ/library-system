export interface Student {
  id: string;
  full_name: string;
  email_library: string; // name@library.com
  grade?: string;
  created_at: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  category?: string;
  subcategory?: string;
  rate?: string;
  shelf_location?: string;
  language?: string;
  price?: string;
  cover_image_url?: string;
  isbn?: string;
  pages?: string;
  description?: string;
  book_id: string;
  status: 'available' | 'borrowed' | 'lost';
  current_borrower_id?: string;
  created_at?: string;
}

export interface LibraryLog {
  id: string;
  student_id: string;
  book_id: string;
  borrow_date: string;
  return_date?: string;
  due_date?: string;
  student_name: string;
  book_title: string;
}

export type UserRole = 'admin' | 'student' | 'responsible';
