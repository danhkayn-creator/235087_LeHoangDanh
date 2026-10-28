require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const Book = require('./models/Book');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Kết nối MongoDB Atlas
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Endpoint kiểm tra hoạt động
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// GET /api/books (Hỗ trợ tìm kiếm query ?search=...)
app.get('/api/books', async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};
    if (search) {
      const regex = new RegExp(search, 'i');
      query = {
        $or: [
          { title: regex },
          { author: regex },
          { category: regex }
        ]
      };
    }
    const books = await Book.find(query).sort({ createdAt: -1 });
    res.status(200).json(books);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
});

// GET /api/books/:id
app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await Book.findById(req.params.id);
    if (!book) return res.status(404).json({ message: 'Không tìm thấy sách' });
    res.status(200).json(book);
  } catch (error) {
    res.status(400).json({ message: 'ID không hợp lệ hoặc lỗi truy vấn', error: error.message });
  }
});

// POST /api/books
app.post('/api/books', async (req, res) => {
  try {
    const { bookId, title, author, category, publisher, publishYear, isbn, quantity, description } = req.body;
    if (!bookId || !title || !author || !category || !publisher || !publishYear || !isbn || quantity === undefined) {
      return res.status(400).json({ message: 'Vui lòng cung cấp đầy đủ thông tin bắt buộc' });
    }

    const existing = await Book.findOne({ bookId: bookId.trim() });
    if (existing) {
      return res.status(409).json({ message: 'Mã sách (bookId) đã tồn tại' });
    }

    const newBook = new Book({
      bookId: bookId.trim(),
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      publisher: publisher.trim(),
      publishYear: Number(publishYear),
      isbn: isbn.trim(),
      quantity: Number(quantity),
      description: description ? description.trim() : ''
    });

    const savedBook = await newBook.save();
    res.status(201).json(savedBook);
  } catch (error) {
    res.status(500).json({ message: 'Không thể thêm sách', error: error.message });
  }
});

// PUT /api/books/:id
app.put('/api/books/:id', async (req, res) => {
  try {
    const { bookId } = req.body;
    if (bookId) {
      const existing = await Book.findOne({ bookId: bookId.trim(), _id: { $ne: req.params.id } });
      if (existing) {
        return res.status(409).json({ message: 'Mã sách (bookId) trùng lặp với cuốn sách khác' });
      }
    }
    const updated = await Book.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ message: 'Không tìm thấy sách để cập nhật' });
    res.status(200).json(updated);
  } catch (error) {
    res.status(400).json({ message: 'Dữ liệu cập nhật không hợp lệ', error: error.message });
  }
});

// DELETE /api/books/:id
app.delete('/api/books/:id', async (req, res) => {
  try {
    const deleted = await Book.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Không tìm thấy sách để xóa' });
    res.status(200).json({ message: 'Xóa sách thành công' });
  } catch (error) {
    res.status(400).json({ message: 'Lỗi khi xóa', error: error.message });
  }
});

app.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));