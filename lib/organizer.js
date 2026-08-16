import { EventEmitter } from 'node:events';
import fs from 'node:fs';
import fsPromises from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { CATEGORIES, getCategory, getUniqueTargetPath } from './utils.js';

const TEN_MB = 10 * 1024 * 1024;

export class Organizer extends EventEmitter {
  constructor() {
    super();
  }

  async organize(files, targetDir) {
    // Створюємо папки для всіх категорій одразу
    for (const category of Object.keys(CATEGORIES)) {
      const categoryPath = path.join(targetDir, category);
      await fsPromises.mkdir(categoryPath, { recursive: true });
    }

    const summary = {
      categories: {},
      totalCopied: 0,
      totalSize: 0
    };

    Object.keys(CATEGORIES).forEach((cat) => {
      summary.categories[cat] = { count: 0, size: 0 };
    });

    // Копіюємо файли
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const category = getCategory(file.ext);
      const categoryDir = path.join(targetDir, category);
      
      const destinationPath = await getUniqueTargetPath(categoryDir, file.name);

      this.emit('copy-start', file, i + 1, files.length);

      try {
        if (file.size >= TEN_MB) {
          // Великі файли копіюємо через Streams
          await pipeline(
            fs.createReadStream(file.path),
            fs.createWriteStream(destinationPath)
          );
        } else {
          // Малі файли копіюємо через copyFile
          await fsPromises.copyFile(file.path, destinationPath);
        }

        summary.categories[category].count++;
        summary.categories[category].size += file.size;
        summary.totalCopied++;
        summary.totalSize += file.size;

        this.emit('copy-complete', file, i + 1, files.length);
      } catch (error) {
        this.emit('copy-error', file, error);
      }
    }

    return summary;
  }
}