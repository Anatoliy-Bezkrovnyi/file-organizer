import { Command } from 'commander';
import path from 'node:path';
import process from 'node:process';
import { Scanner } from './lib/scanner.js';
import { printScanReport, printDuplicatesReport, printOrganizeReport, printCleanupPreview, printCleanupCompleteReport } from './lib/reporter.js';
import { drawProgressBar, CATEGORIES, formatSize} from './lib/utils.js';
import { DuplicateFinder } from './lib/duplicates.js';
import { Organizer } from './lib/organizer.js';
import { Cleaner } from './lib/cleanup.js';

const program = new Command();

program
  .name('file-organizer')
  .description('CLI tool to analyze and organize files')
  .version('1.0.0');

// Команда для сканування папки
program
  .command('scan <directory>')
  .description('Scan directory and show statistics')
  .action(async (directory) => {
    const resolvedPath = path.resolve(directory);
    console.log(`📂 Scanning: ${resolvedPath}`);

    const scanner = new Scanner();

    // Для динамічного прогресс бару при скануванні підписуємось на подію виявлення файла:
    scanner.on('file-found', (fileData, count) => {
      // process.stdout.write з '\r' дозволяє перезаписувати один і той самий рядок у консолі - це шось ШІшка додала, треба розбиратись
      process.stdout.write(`Processing... ${drawProgressBar(count, count)} \r`);
    });

    try {
      const files = await scanner.scan(resolvedPath);
      
      // Переходимо на новий рядок після після того як відмалювали весь бар
      console.log(`\nProcessing... Completed! Found ${files.length} files.`);
      
      // Генеруємо репорт згідно завдання
      printScanReport(resolvedPath, files);
    } catch (error) {
      console.error('\nПомилка під час сканування:', error.message);
      process.exit(1);
    }
  });

  //Команда для пошуку дублікатів
program
  .command('duplicates <directory>')
  .description('Find duplicate files in directory by content hash (SHA-256)')
  .action(async (directory) => {
    const resolvedPath = path.resolve(directory);
    console.log(`📂 Scanning directory before hash calculation: ${resolvedPath}`);

    const scanner = new Scanner();
    const duplicateFinder = new DuplicateFinder();

    try {
      // Скануємо всі файли
      const files = await scanner.scan(resolvedPath);
      console.log(`Found ${files.length} files. Checking for potential duplicates...\n`);

      // Підписка на події обчислення хешів - тут ШІ допомагав, я з підписками на події все ще не дуже
      duplicateFinder.on('file-processed', (file, current, total) => {
        process.stdout.write(`Calculating SHA-256 hashes... ${drawProgressBar(current, total)} \r`);
      });

      // Шукаємо чи є дублікати
      const duplicates = await duplicateFinder.findDuplicates(files);
      console.log(`\nCalculating hashes... Completed!`);

      // Друкуємо звіт
      printDuplicatesReport(duplicates);
    } catch (error) {
      console.error('\nПомилка під час пошуку дублікатів:', error.message);
      process.exit(1);
    }
  });

  // Організація файлів
program
  .command('organize <source> <target>')
  .description('Organize files from source into target directory by categories')
  .action(async (source, target) => {
    const sourcePath = path.resolve(source);
    const targetPath = path.resolve(target);

    console.log(`📦 Organizing: ${sourcePath}`);
    console.log(`Target: ${targetPath}\n`);

    console.log('Creating folders...');
    Object.keys(CATEGORIES).forEach((cat) => console.log(`  ✓ ${cat}/`));
    console.log();

    const scanner = new Scanner();
    const organizer = new Organizer();

    try {
      const files = await scanner.scan(sourcePath);

      organizer.on('copy-start', (file, current, total) => {
        process.stdout.write(`Copying files... ${drawProgressBar(current, total)} \r`);
      });

      organizer.on('copy-error', (file, error) => {
        console.error(`\nПомилка при копіюванні ${file.name}: ${error.message}`);
      });

      const summary = await organizer.organize(files, targetPath);
      console.log(`\nCopying files... Completed!`);

      printOrganizeReport(summary, targetPath);
    } catch (error) {
      console.error('\nПомилка під час організації файлів:', error.message);
      process.exit(1);
    }
  });

  // Очищення застарілих файлів
program
  .command('cleanup <directory>')
  .description('Find and delete files older than specified days')
  .option('--older-than <days>', 'Threshold in days to define old files', '90')
  .option('--confirm', 'Confirm actual deletion of files', false)
  .action(async (directory, options) => {
    const resolvedPath = path.resolve(directory);
    const daysThreshold = parseInt(options.olderThan, 10);
    const isConfirm = options.confirm;

    console.log(`🧹 Cleanup: ${resolvedPath}`);
    console.log(`Looking for files older than ${daysThreshold} days...\n`);

    const scanner = new Scanner();
    const cleaner = new Cleaner();

    try {
      const files = await scanner.scan(resolvedPath);
      const oldFiles = cleaner.findOldFiles(files, daysThreshold);

      if (oldFiles.length === 0) {
        console.log(`✨ No files older than ${daysThreshold} days found.`);
        return;
      }

      const totalSize = oldFiles.reduce((acc, f) => acc + f.size, 0);

      // Перелік файлів
      printCleanupPreview(oldFiles, totalSize);

      if (!isConfirm) {
        // DRY RUN
        console.log('⚠️  DRY RUN MODE: No files were deleted.');
        console.log('To actually delete these files, run with --confirm flag.\n');
      } else {
        // ВИДАЛЕННЯ ФІЗИЧНЕ
        console.log(`⚠️  DELETING ${oldFiles.length} files (${formatSize(totalSize)}). This action cannot be undone!`);

        cleaner.on('file-deleted', (file, current, total) => {
          process.stdout.write(`Deleting... ${drawProgressBar(current, total)} \r`);
        });

        cleaner.on('delete-error', (file, error) => {
          console.error(`\nПомилка при видаленні ${file.name}: ${error.message}`);
        });

        const summary = await cleaner.deleteFiles(oldFiles);
        console.log(`\nDeleting... Completed!`);

        printCleanupCompleteReport(summary);
      }
    } catch (error) {
      console.error('\nПомилка під час очищення:', error.message);
      process.exit(1);
    }
  });

program.parse();