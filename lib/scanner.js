import { EventEmitter } from 'node:events';
import fs from 'node:fs/promises';
import path from 'node:path';

export class Scanner extends EventEmitter {
  constructor() {
    super();
  }

  async scan(dirPath) {
    const filesData = [];

    // Рекурсивна функція для збору файлів
    const walk = async (currentPath) => {
      try {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(currentPath, entry.name);

          if (entry.isDirectory()) {
            await walk(fullPath);
          } else if (entry.isFile()) {
            try {
              const fileStat = await fs.stat(fullPath);
              const fileData = {
                name: entry.name,
                path: fullPath,
                ext: path.extname(entry.name).toLowerCase() || '(no ext)',
                size: fileStat.size,
                mtime: fileStat.mtime
              };

              filesData.push(fileData);
              // Емітимо подію для прогрес-бару - оце виправляла ШІшка, я не дуже добре розібрався з підпискою подій, буду над тим працювати
              this.emit('file-found', fileData, filesData.length);
            } catch (err) {
              // Скіпаємо файли, до яких немає доступу
            }
          }
        }
      } catch (err) {
        // Пропускаємо папки, до яких немає доступу
      }
    };

    await walk(dirPath);

    // Кінець сканування
    this.emit('scan-complete', filesData);
    return filesData;
  }
}