import crypto from 'node:crypto';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';

// Мапимо розширення файлів до категорій
export const CATEGORIES = {
  Documents: ['.pdf', '.docx', '.doc', '.txt', '.md', '.xlsx', '.pptx'],
  Images: ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.bmp'],
  Archives: ['.zip', '.rar', '.tar', '.gz', '.7z'],
  Code: ['.js', '.py', '.java', '.cpp', '.html', '.css', '.json'],
  Videos: ['.mp4', '.avi', '.mkv', '.mov', '.webm'],
  Other: []
};

export function getCategory(ext) {
  const lowerExt = ext.toLowerCase();
  for (const [category, extensions] of Object.entries(CATEGORIES)) {
    if (extensions.includes(lowerExt)) {
      return category;
    }
  }
  return 'Other';
}

// Генерує унікальний шлях, якщо файл вже існує (наприклад, file(1).pdf) - ШІшка докинула думаю дуже доречно
export async function getUniqueTargetPath(targetDir, fileName) {
  const ext = path.extname(fileName);
  const name = path.basename(fileName, ext);
  let counter = 0;
  let currentTarget = path.join(targetDir, fileName);

  while (true) {
    try {
      await fsPromises.access(currentTarget);
      counter++;
      currentTarget = path.join(targetDir, `${name}(${counter})${ext}`);
    } catch {
      // Файлу не існує — шлях вільний
      return currentTarget;
    }
  }
}

// Функція для форматування розміру файлу, для кращої читабельності
export function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

// Функція для відображення прогресу, базуючись на кількості знайдених файлів
export function drawProgressBar(current, total, width = 20) {
  if (total === 0) return '░'.repeat(width) + ' 0/0';
  const percentage = Math.min(current / total, 1);
  const filled = Math.round(percentage * width);
  const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
  return `${bar} ${current}/${total} files`;
}

// Функція для визначення віку файлу
export function getDaysAgo(mtime) {
  const diffTime = Math.abs(new Date() - new Date(mtime));
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// Обчислення хешу файлу у потоках
export function calculateHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

// Форматування дати у стандартний рядок YYYY-MM-DD
export function formatDate(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}