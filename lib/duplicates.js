import { EventEmitter } from 'node:events';
import { calculateHash } from './utils.js';

export class DuplicateFinder extends EventEmitter {
  constructor() {
    super();
  }

  async findDuplicates(files) {
    // 1. Попередня фільтрація за розміром (хешуємо тільки потенційні дублікати) - тут ШІшка запропонувала, 
    // і це дійсно слушно, адже зменшить час на виконання, в папаці може не бути файлів з однаковим розміром.
    const sizeMap = new Map();
    files.forEach(file => {
      const group = sizeMap.get(file.size) || [];
      group.push(file);
      sizeMap.set(file.size, group);
    });

    const candidateFiles = files.filter(file => sizeMap.get(file.size).length > 1);
    const totalCandidates = candidateFiles.length;

    const hashMap = new Map();
    let processedCount = 0;

    // 2. Послідовне обчислення хешу через стріми
    for (const file of candidateFiles) {
      try {
        const hash = await calculateHash(file.path);
        
        const group = hashMap.get(hash) || [];
        group.push(file);
        hashMap.set(hash, group);
      } catch (err) {
        // Пропускаємо файли, до яких втрачено доступ під час читання - обробка помилок ШІшкою, дуже дякую
      } finally {
        processedCount++;
        this.emit('file-processed', file, processedCount, totalCandidates);
      }
    }

    // 3. Відбираємо там де більше ніж 1 файл
    const duplicates = new Map();
    for (const [hash, group] of hashMap.entries()) {
      if (group.length > 1) {
        duplicates.set(hash, group);
      }
    }

    this.emit('duplicates-found', duplicates);
    return duplicates;
  }
}