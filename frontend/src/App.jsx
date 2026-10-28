import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const initialForm = {
  bookId: '', title: '', author: '', category: '',
  publisher: '', publishYear: new Date().getFullYear(), isbn: '', quantity: 1, description: ''
};

export default function App() {
  const [books, setBooks] = useState([]);
  const [search, setSearch] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const toastTimer = useRef(null);

  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  const fetchBooks = async (query = '') => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/books${query ? `?search=${encodeURIComponent(query)}` : ''}`);
      if (!res.ok) throw new Error('Không thể tải danh sách sách. Kiểm tra backend rồi thử lại.');
      const data = await res.json();
      setBooks(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBooks(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    setActiveQuery(q);
    fetchBooks(q);
  };

  const resetSearch = () => {
    setSearch('');
    setActiveQuery('');
    fetchBooks('');
  };

  const openAdd = () => {
    setEditingId(null);
    setForm(initialForm);
    setFormError('');
    setFormOpen(true);
  };

  const openEdit = (book) => {
    const { _id, __v, createdAt, updatedAt, ...rest } = book;
    setEditingId(_id);
    setForm({ ...initialForm, ...rest });
    setFormError('');
    setSelectedBook(null);
    setFormOpen(true);
  };

  const closeForm = () => { setFormOpen(false); setEditingId(null); };

  const openDetail = async (book) => {
    setSelectedBook(book);
    setDetailLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/books/${book._id}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedBook(data.data || data);
    } catch {
      showToast('Không tải được chi tiết mới nhất, đang hiển thị dữ liệu trong danh sách.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const setField = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const url = editingId ? `${API_BASE}/api/books/${editingId}` : `${API_BASE}/api/books`;
      const res = await fetch(url, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Lưu sách thất bại. Kiểm tra lại thông tin.');
      showToast(editingId ? 'Đã cập nhật sách' : 'Đã thêm sách mới');
      closeForm();
      fetchBooks(activeQuery);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (book) => {
    if (!window.confirm(`Xóa sách "${book.title}"?`)) return;
    try {
      const res = await fetch(`${API_BASE}/api/books/${book._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Xóa sách thất bại. Thử lại sau.');
      showToast('Đã xóa sách');
      if (selectedBook?._id === book._id) setSelectedBook(null);
      fetchBooks(activeQuery);
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const totalCopies = books.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
  const categoryCount = new Set(books.map((b) => b.category)).size;

  return (
    <div className="app">
      <header className="topbar">
        <div>
          <h1>Thư viện sách</h1>
          <p>Lê Hoàng Danh · MSSV 235087</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Thêm sách</button>
      </header>

      <main className="content">
        <section className="stats" aria-label="Thống kê">
          <div className="stat"><span className="stat-num">{books.length}</span><span>đầu sách</span></div>
          <div className="stat"><span className="stat-num">{totalCopies}</span><span>cuốn trong kho</span></div>
          <div className="stat"><span className="stat-num">{categoryCount}</span><span>thể loại</span></div>
        </section>

        <form className="searchbar" onSubmit={handleSearch}>
          <input
            type="search"
            placeholder="Tìm theo tên sách, tác giả hoặc thể loại"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm kiếm sách"
          />
          <button className="btn btn-primary" type="submit">Tìm kiếm</button>
          {(activeQuery || search) && (
            <button className="btn" type="button" onClick={resetSearch}>Xóa lọc</button>
          )}
        </form>

        {activeQuery && !loading && (
          <p className="result-note">{books.length} kết quả cho “{activeQuery}”</p>
        )}

        {error && (
          <div className="banner banner-error" role="alert">
            <span>{error}</span>
            <button className="btn btn-small" onClick={() => fetchBooks(activeQuery)}>Thử lại</button>
          </div>
        )}

        <div className="table-wrap">
          {loading ? (
            <div className="state"><div className="spinner" /><p>Đang tải dữ liệu...</p></div>
          ) : books.length === 0 && !error ? (
            <div className="state">
              <p>{activeQuery ? 'Không có sách nào khớp từ khóa.' : 'Chưa có cuốn sách nào.'}</p>
              {!activeQuery && <button className="btn btn-primary" onClick={openAdd}>Thêm cuốn đầu tiên</button>}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên sách</th>
                  <th>Thể loại</th>
                  <th>Năm</th>
                  <th className="num">SL</th>
                  <th className="actions-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b._id}>
                    <td className="mono">{b.bookId}</td>
                    <td>
                      <button className="link" onClick={() => openDetail(b)}>{b.title}</button>
                      <div className="sub">{b.author}</div>
                    </td>
                    <td><span className="tag">{b.category}</span></td>
                    <td>{b.publishYear}</td>
                    <td className="num">
                      <span className={Number(b.quantity) === 0 ? 'qty qty-zero' : 'qty'}>{b.quantity}</span>
                    </td>
                    <td className="actions-col">
                      <button className="btn btn-small" onClick={() => openDetail(b)}>Xem</button>
                      <button className="btn btn-small" onClick={() => openEdit(b)}>Sửa</button>
                      <button className="btn btn-small btn-danger" onClick={() => handleDelete(b)}>Xóa</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {/* Chi tiết */}
      {selectedBook && (
        <div className="overlay" onClick={() => setSelectedBook(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Chi tiết sách">
            <div className="drawer-head">
              <h2>{selectedBook.title}</h2>
              <button className="icon-btn" onClick={() => setSelectedBook(null)} aria-label="Đóng">✕</button>
            </div>
            {detailLoading && <p className="sub">Đang tải...</p>}
            <p className="drawer-author">{selectedBook.author}</p>
            <dl className="detail-grid">
              <div><dt>Mã sách</dt><dd className="mono">{selectedBook.bookId}</dd></div>
              <div><dt>ISBN</dt><dd className="mono">{selectedBook.isbn}</dd></div>
              <div><dt>Thể loại</dt><dd>{selectedBook.category}</dd></div>
              <div><dt>Nhà xuất bản</dt><dd>{selectedBook.publisher}</dd></div>
              <div><dt>Năm xuất bản</dt><dd>{selectedBook.publishYear}</dd></div>
              <div><dt>Số lượng</dt><dd>{selectedBook.quantity}</dd></div>
            </dl>
            <h3>Mô tả</h3>
            <p className="desc">{selectedBook.description || 'Chưa có mô tả.'}</p>
            <div className="drawer-actions">
              <button className="btn btn-primary" onClick={() => openEdit(selectedBook)}>Sửa sách</button>
              <button className="btn btn-danger" onClick={() => handleDelete(selectedBook)}>Xóa sách</button>
            </div>
          </aside>
        </div>
      )}

      {/* Form thêm / sửa */}
      {formOpen && (
        <div className="overlay overlay-center" onClick={closeForm}>
          <form className="modal" onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Form sách">
            <div className="drawer-head">
              <h2>{editingId ? 'Cập nhật sách' : 'Thêm sách mới'}</h2>
              <button type="button" className="icon-btn" onClick={closeForm} aria-label="Đóng">✕</button>
            </div>
            {formError && <div className="banner banner-error" role="alert">{formError}</div>}
            <div className="form-grid">
              <label>Mã sách<input value={form.bookId} onChange={(e) => setField('bookId', e.target.value)} required /></label>
              <label>ISBN<input value={form.isbn} onChange={(e) => setField('isbn', e.target.value)} required /></label>
              <label className="span2">Tên sách<input value={form.title} onChange={(e) => setField('title', e.target.value)} required /></label>
              <label>Tác giả<input value={form.author} onChange={(e) => setField('author', e.target.value)} required /></label>
              <label>Thể loại<input value={form.category} onChange={(e) => setField('category', e.target.value)} required /></label>
              <label>Nhà xuất bản<input value={form.publisher} onChange={(e) => setField('publisher', e.target.value)} required /></label>
              <label>Năm xuất bản<input type="number" min="1000" max="2100" value={form.publishYear} onChange={(e) => setField('publishYear', Number(e.target.value))} required /></label>
              <label>Số lượng<input type="number" min="0" value={form.quantity} onChange={(e) => setField('quantity', Number(e.target.value))} required /></label>
              <label className="span2">Mô tả<textarea rows="3" value={form.description} onChange={(e) => setField('description', e.target.value)} /></label>
            </div>
            <div className="drawer-actions">
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Thêm sách'}
              </button>
              <button className="btn" type="button" onClick={closeForm}>Hủy</button>
            </div>
          </form>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`} role="status">{toast.text}</div>}
    </div>
  );
}