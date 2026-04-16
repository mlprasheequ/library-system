import { supabase } from "./supabase";
import { Student, Book } from "./types";

// --- Student Actions ---

export async function enrollStudent(data: { name: string; roll: string; class: string; phone: string; username: string; password?: string }) {
  const { data: student, error } = await supabase
    .from('students')
    .insert([{
      full_name: data.name,
      roll_id: data.roll,
      grade: data.class,
      parent_phone: data.phone,
      username: data.username,
      password: data.password, // No default, must be provided
      email_library: `${data.username}@library.com`
    }])
    .select()
    .single();

  if (error) throw error;
  return student;
}

export async function fetchStudents() {
  const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

// --- Library Actions ---

export async function addBook(book: { number: string, name: string, author: string, rate: string }) {
  const { error } = await supabase.from('books').insert([{
    book_id: book.number,
    title: book.name,
    author: book.author,
    rate: parseFloat(book.rate),
    status: 'available'
  }]);
  if (error) throw error;
}

export async function fetchBooks() {
  const { data, error } = await supabase.from('books').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function updateBook(id: string, updates: any) {
  const { error } = await supabase.from('books').update(updates).eq('id', id);
  if (error) throw error;
}
