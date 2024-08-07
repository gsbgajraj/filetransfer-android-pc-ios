import express from 'express';
import multer from 'multer';
import { MongoClient, GridFSBucket } from 'mongodb';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// MongoDB connection string
const mongoUri = process.env.MONGO_URI;

const client = new MongoClient(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

let bucket;

client.connect()
  .then(() => {
    console.log('Connected to MongoDB');
    const db = client.db('file_transfer_db');
    bucket = new GridFSBucket(db, {
      bucketName: 'uploads'
    });
  })
  .catch(err => console.error(err));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Setup multer for file handling
const upload = multer();

app.post('/upload', upload.array('files', 100), (req, res) => {
  req.files.forEach(file => {
    const uploadStream = bucket.openUploadStream(file.originalname);
    uploadStream.end(file.buffer);
  });

  res.redirect('/');
});

app.get('/history', async (req, res) => {
  const files = await bucket.find().toArray();
  res.json(files.map(file => ({
    filename: file.filename,
    url: `/files/${file.filename}`
  })));
});

app.get('/files/:filename', async (req, res) => {
  const { filename } = req.params;
  const downloadStream = bucket.openDownloadStreamByName(filename);
  downloadStream.pipe(res);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
