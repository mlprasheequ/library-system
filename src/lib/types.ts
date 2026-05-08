export interface Student {
  id: string;
  full_name: string;
  email_library: string; // name@library.com
  grade?: string;
  roll_id: string;
  username: string;
  parent_phone?: string;
  is_responsible: boolean;
  is_admin: boolean;
  password?: string;
  created_at: string;
}

export interface BookField {
  id: string;
  name: string;
  key: string;
  type: 'text' | 'number' | 'select' | 'textarea';
  required: boolean;
  options?: string[];
  order: number;
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
  custom_fields?: Record<string, any>;
  current_borrow?: {
    borrow_date: string;
    students?: Student;
  };
  created_at?: string;
  how_much_value?: string | number;
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
  students?: Student;
  books?: Book;
}

export type UserRole = 'admin' | 'student' | 'responsible';
