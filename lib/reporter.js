import { formatSize, getDaysAgo, formatDate } from './utils.js';

// Функція для друку звіту по скануванню
export function printScanReport(targetPath, files) {
  let totalSize = 0;
  const typesMap = new Map();
  
  const ageStats = {
    last7: 0,
    last30: 0,
    older90: 0
  };

  let oldestFile = null;

  files.forEach(file => {
    totalSize += file.size;

    // 1. Групи за розширенням
    const ext = file.ext;
    const currentType = typesMap.get(ext) || { count: 0, size: 0 };
    typesMap.set(ext, {
      count: currentType.count + 1,
      size: currentType.size + file.size
    });

    // 2. Групи за віком
    const days = getDaysAgo(file.mtime);
    if (days <= 7) ageStats.last7++;
    if (days <= 30) ageStats.last30++;
    if (days > 90) ageStats.older90++;

    // 3. Найстарший файл
    if (!oldestFile || file.mtime < oldestFile.mtime) {
      oldestFile = { ...file, days };
    }
  });

  // 4. Три найбільші файли
  const largestFiles = [...files]
    .sort((a, b) => b.size - a.size)
    .slice(0, 3);

  // 5. Друкуємо звіт
  console.log('\n📊 Scan Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total files: ${files.length}`);
  console.log(`Total size: ${formatSize(totalSize)}\n`);

  console.log('By File Type:');
  const sortedTypes = [...typesMap.entries()].sort((a, b) => b[1].size - a[1].size);
  sortedTypes.forEach(([ext, data]) => {
    console.log(`  ${ext.padEnd(8)} ${data.count.toString().padStart(4)} files   ${formatSize(data.size).padStart(8)}`);
  });

  console.log('\nFile Age:');
  console.log(`  Last 7 days:    ${ageStats.last7} files`);
  console.log(`  Last 30 days:   ${ageStats.last30} files`);
  console.log(`  Older than 90:  ${ageStats.older90} files`);

  if (largestFiles.length > 0) {
    console.log('\nLargest files:');
    largestFiles.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.name.padEnd(25)} ${formatSize(f.size)}`);
    });
  }

  if (oldestFile) {
    console.log(`\nOldest file: ${oldestFile.name} (modified ${oldestFile.days} days ago)`);
  }
}

// Функція для друку звіту по пошуку дублікатів
export function printDuplicatesReport(duplicatesMap) {
  console.log('\n🔍 Duplicate Files Report:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (duplicatesMap.size === 0) {
    console.log('✨ No duplicate files found!');
    return;
  }

  let totalWastedSpace = 0;
  let groupIndex = 1;

  for (const [hash, group] of duplicatesMap.entries()) {
    const fileSize = group[0].size;
    const wastedInGroup = fileSize * (group.length - 1);
    totalWastedSpace += wastedInGroup;

    console.log(`\nGroup #${groupIndex} [Hash: ${hash.slice(0, 8)}...] - Size: ${formatSize(fileSize)} each`);
    group.forEach((file, idx) => {
      console.log(`  ${idx === 0 ? '📄 (Original)' : '📑 (Duplicate)'} ${file.path}`);
    });

    groupIndex++;
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`⚠️ Total duplicate groups: ${duplicatesMap.size}`);
  console.log(`💾 Total wasted disk space: ${formatSize(totalWastedSpace)}\n`);
}

// Функція для друку звіту по організації файлів
export function printOrganizeReport(summary, targetDir) {
  console.log('\n✅ Organization complete!\nSummary:');

  for (const [category, data] of Object.entries(summary.categories)) {
    if (data.count > 0) {
      const countStr = `${data.count} files`.padEnd(10);
      console.log(`  ${category.padEnd(11)}: ${countStr} → ${targetDir}/${category}/`);
    }
  }

  console.log(`\nTotal copied: ${summary.totalCopied} files (${formatSize(summary.totalSize)})\n`);
}

// Друк списку застарілих файлів
export function printCleanupPreview(oldFiles, totalSize) {
  console.log(`\nFound ${oldFiles.length} files to delete:\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const maxPreview = 3;
  const previewFiles = oldFiles.slice(0, maxPreview);

  previewFiles.forEach(file => {
    console.log(`${file.name}`);
    console.log(`  Size: ${formatSize(file.size)}`);
    console.log(`  Modified: ${file.daysOld} days ago (${formatDate(file.mtime)})\n`);
  });

  if (oldFiles.length > maxPreview) {
    console.log(`... (${oldFiles.length - maxPreview} more files)`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total: ${oldFiles.length} files (${formatSize(totalSize)})\n`);
}

// Друк підсумку видалення файлів
export function printCleanupCompleteReport(summary) {
  console.log('\n✅ Cleanup complete!');
  console.log(`Deleted: ${summary.deletedCount} files (${formatSize(summary.freedSize)} freed)\n`);
}