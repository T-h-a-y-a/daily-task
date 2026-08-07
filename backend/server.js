require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const os = require('os');

const User = require('./models/User');
const Task = require('./models/Task');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Setup static uploads folder safely in writable /tmp directory for serverless runtime
const uploadsDir = path.join(os.tmpdir(), 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use('/uploads', express.static(uploadsDir));
} catch (err) {
  console.warn('Uploads directory warning:', err.message);
}

// MongoDB Connection Caching for Serverless (Vercel)
let cached = global.mongoose;
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is missing.');
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI, opts).then(async (mongooseInstance) => {
      console.log('Connected to MongoDB');
      // Seed default admin if doesn't exist
      try {
        if (process.env.ADMIN_USERNAME) {
          const adminUser = await User.findOne({ username: process.env.ADMIN_USERNAME });
          if (!adminUser) {
            const { v4: uuidv4 } = require('uuid');
            await User.create({
              id: uuidv4(),
              username: process.env.ADMIN_USERNAME,
              password: process.env.ADMIN_PASSWORD || 'admin123',
              role: 'admin'
            });
            console.log('Seeded default admin user');
          }
        }
      } catch (seedErr) {
        console.error('Error seeding admin user:', seedErr);
      }
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Middleware to ensure DB is connected for API requests
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api')) {
    try {
      await connectDB();
    } catch (err) {
      console.error('MongoDB connection error:', err);
      return res.status(500).json({ error: 'Database connection failed: ' + err.message });
    }
  }
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('SEO Dashboard API Server is running');
});

// --- Users API ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.status(201).json(newUser);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findOneAndDelete({ id: req.params.id });
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Tasks API ---
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await Task.find();
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const newTask = new Task(req.body);
    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(taskId);
    const query = isObjectId 
      ? { $or: [{ id: taskId }, { _id: taskId }] } 
      : { id: taskId };

    const updatedTask = await Task.findOneAndUpdate(
      query,
      req.body,
      { new: true }
    );
    res.json(updatedTask);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Categories & Projects API ---
app.put('/api/categories/rename', async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'Missing oldName or newName' });
    await Task.updateMany({ category: oldName }, { category: newName });
    res.json({ message: 'Category renamed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/categories/:name', async (req, res) => {
  try {
    const categoryName = req.params.name;
    await Task.deleteMany({ category: categoryName });
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/projects/rename', async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) return res.status(400).json({ error: 'Missing oldName or newName' });
    await Task.updateMany({ project: oldName }, { project: newName });
    res.json({ message: 'Project renamed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/projects/:name', async (req, res) => {
  try {
    const projectName = req.params.name;
    await Task.deleteMany({ project: projectName });
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Upload Endpoint ---
app.post('/api/upload', (req, res) => {
  try {
    const { name, data } = req.body;
    if (!name || !data) {
      return res.status(400).json({ error: 'Missing name or data' });
    }

    const base64Data = data.replace(/^data:.*;base64,/, '');
    const fileId = Date.now() + '-' + Math.random().toString(36).substring(2, 9);
    const safeName = name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${fileId}-${safeName}`;
    const filePath = path.join(uploadsDir, filename);

    fs.writeFileSync(filePath, base64Data, 'base64');

    const fileUrl = `/uploads/${filename}`;
    res.json({ fileName: name, fileUrl });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// --- File management endpoints ---
// Add a file to a task
app.post('/api/tasks/:id/files', async (req, res) => {
  try {
    const taskId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(taskId);
    const query = isObjectId 
      ? { $or: [{ id: taskId }, { _id: taskId }] } 
      : { id: taskId };
    const task = await Task.findOne(query);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    task.files.push(req.body);
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a file from a task
app.delete('/api/tasks/:id/files/:fileId', async (req, res) => {
  try {
    const taskId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(taskId);
    const query = isObjectId 
      ? { $or: [{ id: taskId }, { _id: taskId }] } 
      : { id: taskId };
    const task = await Task.findOne(query);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    
    task.files = task.files.filter(f => f.id !== req.params.fileId);
    await task.save();
    res.json(task);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const taskId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(taskId);
    const query = isObjectId 
      ? { $or: [{ id: taskId }, { _id: taskId }] } 
      : { id: taskId };

    const deletedTask = await Task.findOneAndDelete(query);
    if (!deletedTask && isObjectId) {
      await Task.findByIdAndDelete(taskId);
    }
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;

