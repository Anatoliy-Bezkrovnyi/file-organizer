import { EventEmitter } from 'node:events';
import fsPromises from 'node:fs/promises';
import { getDaysAgo } from './utils.js';

export class Cleaner extends EventEmitter {
  constructor() {
    super();
  }

  // Пошук файлів, старіших за вказану дату
  findOldFiles(files, thresholdDays) {
    const oldFiles = [];

    for (const file of files) {
      const daysOld = getDaysAgo(file.mtime);

      if (daysOld > thresholdDays) {
        const fileInfo = { ...file, daysOld };
        oldFiles.push(fileInfo);
        this.emit('file-found', fileInfo);
      }
    }

    return oldFiles;
  }

  // Фізичне видалення файлів
  async deleteFiles(oldFiles) {
    let deletedCount = 0;
    let freedSize = 0;

    for (let i = 0; i < oldFiles.length; i++) {
      const file = oldFiles[i];

      try {
        await fsPromises.unlink(file.path);
        deletedCount++;
        freedSize += file.size;
        this.emit('file-deleted', file, i + 1, oldFiles.length);
      } catch (error) {
        this.emit('delete-error', file, error);
      }
    }

    const summary = { deletedCount, freedSize };
    this.emit('cleanup-complete', summary);
    return summary;
  }
}