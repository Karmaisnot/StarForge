import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Card, Chip, Icon, ProgressBar, Segmented, Stat, Stepper } from '@/ui';
import { printerStatusTone } from '@/domain/models/print.js';
import { useServices } from '@/hooks/useServices.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import styles from './print.module.css';

const ACTIVE_JOB_STATES = new Set(['queued', 'picked', 'printing']);
const PRINTABLE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';

const PAGE_COPY = {
  en: {
    activePrinters: 'Available printers',
    activeQueue: 'Active jobs',
    readyFiles: 'Printable library files',
    document: 'Document',
    sourceHint: 'Choose an approved library item or upload a document from this device.',
    uploadDevice: 'From this device',
    replace: 'Replace file',
    chooseLibrary: 'Choose a library file',
    printer: 'Printer',
    choosePrinter: 'Choose an available printer',
    options: 'Print options',
    oneSide: 'One-sided',
    twoSides: 'Two-sided',
    total: 'Ready to send',
    totalHint: 'The printer verifies the exact page count before starting.',
    noJobs: 'The print queue is clear',
    noJobsHint: 'Choose a document above to create your first print job.',
    noPrinters: 'No printer is available',
    noPrintersHint: 'A branch administrator needs to connect or enable a printer.',
    allJobs: 'All',
    activeJobs: 'Active',
    finishedJobs: 'Finished',
    failedJobs: 'Needs attention',
    done: 'Printed',
    failed: 'Failed',
    picked: 'Preparing',
    sourceLibrary: 'Library',
    sourceUpload: 'Upload',
    unavailableOption: 'Not supported by this printer',
  },
  ru: {
    activePrinters: 'Доступные принтеры',
    activeQueue: 'Активные задания',
    readyFiles: 'Файлы для печати',
    document: 'Документ',
    sourceHint: 'Выберите одобренный файл из библиотеки или загрузите документ с устройства.',
    uploadDevice: 'С этого устройства',
    replace: 'Заменить файл',
    chooseLibrary: 'Выбрать файл из библиотеки',
    printer: 'Принтер',
    choosePrinter: 'Выберите доступный принтер',
    options: 'Параметры печати',
    oneSide: 'Односторонняя',
    twoSides: 'Двусторонняя',
    total: 'Готово к отправке',
    totalHint: 'Точное число страниц проверяется перед началом печати.',
    noJobs: 'Очередь печати пуста',
    noJobsHint: 'Выберите документ выше, чтобы создать первое задание.',
    noPrinters: 'Нет доступного принтера',
    noPrintersHint: 'Администратор филиала должен подключить или включить принтер.',
    allJobs: 'Все',
    activeJobs: 'Активные',
    finishedJobs: 'Завершённые',
    failedJobs: 'Требуют внимания',
    done: 'Напечатано',
    failed: 'Ошибка',
    picked: 'Подготовка',
    sourceLibrary: 'Библиотека',
    sourceUpload: 'Загрузка',
    unavailableOption: 'Не поддерживается этим принтером',
  },
  uz: {
    activePrinters: 'Mavjud printerlar',
    activeQueue: 'Faol topshiriqlar',
    readyFiles: 'Chop etishga tayyor fayllar',
    document: 'Hujjat',
    sourceHint: 'Tasdiqlangan kutubxona faylini tanlang yoki qurilmadan hujjat yuklang.',
    uploadDevice: 'Shu qurilmadan',
    replace: 'Faylni almashtirish',
    chooseLibrary: 'Kutubxonadan fayl tanlash',
    printer: 'Printer',
    choosePrinter: 'Mavjud printerni tanlang',
    options: 'Chop etish sozlamalari',
    oneSide: 'Bir tomonlama',
    twoSides: 'Ikki tomonlama',
    total: 'Yuborishga tayyor',
    totalHint: 'Aniq sahifalar soni chop etishdan oldin tekshiriladi.',
    noJobs: 'Chop etish navbati bo‘sh',
    noJobsHint: 'Birinchi topshiriqni yaratish uchun yuqoridan hujjat tanlang.',
    noPrinters: 'Mavjud printer yo‘q',
    noPrintersHint: 'Filial administratori printerni ulashi yoki faollashtirishi kerak.',
    allJobs: 'Barchasi',
    activeJobs: 'Faol',
    finishedJobs: 'Tugallangan',
    failedJobs: 'E’tibor kerak',
    done: 'Chop etildi',
    failed: 'Xatolik',
    picked: 'Tayyorlanmoqda',
    sourceLibrary: 'Kutubxona',
    sourceUpload: 'Yuklash',
    unavailableOption: 'Bu printerda mavjud emas',
  },
};

function jobTone(status) {
  if (status === 'done') return 'success';
  if (status === 'failed') return 'danger';
  if (status === 'printing') return 'primary';
  if (status === 'picked') return 'accent';
  return 'neutral';
}

function jobLabel(status, t, labels) {
  if (status === 'done') return labels.done;
  if (status === 'failed') return labels.failed;
  if (status === 'printing') return t('print.printing');
  if (status === 'picked') return labels.picked;
  return t('print.queued');
}

function LibraryPicker({ library, selectedId, onClose, onSelect }) {
  const { t, locale } = useT();
  const labels = PAGE_COPY[locale] ?? PAGE_COPY.en;
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
    const onKey = (event) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const files = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return (library.files ?? []).filter(
      (file) =>
        (type === 'all' || file.type === type) &&
        (!needle || file.filename.toLocaleLowerCase(locale).includes(needle)),
    );
  }, [library.files, locale, query, type]);
  const types = [...new Set((library.files ?? []).map((file) => file.type))];

  return (
    <div className={styles.libraryBackdrop} onMouseDown={onClose}>
      <section
        className={styles.libraryDrawer}
        role="dialog"
        aria-modal="true"
        aria-label={labels.chooseLibrary}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <span className={styles.eyebrow}>{labels.sourceLibrary}</span>
            <h2>{labels.chooseLibrary}</h2>
            <p>{library.fileCount} {t('print.files')}</p>
          </div>
          <button type="button" onClick={onClose} aria-label={t('common.close')}>
            <Icon name="x" size={18} />
          </button>
        </header>
        <div className={styles.libraryTools}>
          <label>
            <Icon name="search" size={15} />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('shell.searchAll')}
            />
          </label>
          <select value={type} onChange={(event) => setType(event.target.value)}>
            <option value="all">{labels.allJobs}</option>
            {types.map((value) => <option key={value} value={value}>{value.toUpperCase()}</option>)}
          </select>
        </div>
        <div className={styles.libraryList}>
          {files.map((file) => (
            <button
              type="button"
              key={file.id}
              data-selected={selectedId === file.id ? '1' : '0'}
              onClick={() => onSelect(file)}
            >
              <span className={styles.fileMark}><Icon name="doc" size={18} /></span>
              <span>
                <strong>{file.filename}</strong>
                <small>{file.type.toUpperCase()} · {file.size}</small>
                <em>{file.owner} · {file.updatedAt}</em>
              </span>
              <Icon name={selectedId === file.id ? 'check' : 'arrowR'} size={15} />
            </button>
          ))}
          {!files.length && (
            <div className={styles.libraryEmpty}>
              <Icon name="search" size={22} />
              <strong>{t('materials.empty')}</strong>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function PrintComposer({ library, printers, onAdd }) {
  const toast = useToast();
  const { t, locale } = useT();
  const labels = PAGE_COPY[locale] ?? PAGE_COPY.en;
  const activePrinters = useMemo(
    () => printers.filter((printer) => printer.status !== 'locked'),
    [printers],
  );
  const [source, setSource] = useState(library.files?.length ? 'library' : 'upload');
  const [selectedFile, setSelectedFile] = useState(() => library.files?.[0] ?? null);
  const [uploadFile, setUploadFile] = useState(null);
  const [printerId, setPrinterId] = useState(() => activePrinters[0]?.id ?? '');
  const [copies, setCopies] = useState(1);
  const [color, setColor] = useState(false);
  const [duplex, setDuplex] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef(null);
  const selectedPrinter = activePrinters.find((printer) => printer.id === printerId) ?? null;

  useEffect(() => {
    if (!activePrinters.some((printer) => printer.id === printerId)) {
      setPrinterId(activePrinters[0]?.id ?? '');
    }
  }, [activePrinters, printerId]);

  useEffect(() => {
    if (!selectedPrinter?.color) setColor(false);
    if (!selectedPrinter?.duplex) setDuplex(false);
  }, [selectedPrinter]);

  const pickDeviceFile = () => {
    setSource('upload');
    fileInputRef.current?.click();
  };

  const submit = async () => {
    const document = source === 'upload' ? uploadFile : selectedFile;
    if (!document || !selectedPrinter || busy) return;
    setBusy(true);
    try {
      await onAdd({
        printerId: selectedPrinter.id,
        branchId: selectedPrinter.branchId,
        printer: selectedPrinter.name,
        doc: source === 'upload' ? uploadFile.name : selectedFile.filename,
        file: source === 'upload' ? uploadFile : undefined,
        libraryFileId: source === 'library' ? selectedFile.id : undefined,
        copies,
        color,
        duplex,
      });
      toast(`${document.name || document.filename} · ${t('print.queueToast')}`, 'success');
      if (source === 'upload') setUploadFile(null);
    } catch {
      // The page-level mutation owns the localized error toast and optimistic rollback.
    } finally {
      setBusy(false);
    }
  };

  const selectedDocument = source === 'upload' ? uploadFile : selectedFile;

  return (
    <>
      <Card className={styles.composerCard} padded={false}>
        <div className={styles.composerHead}>
          <span className={styles.composerIcon}><Icon name="print" size={20} /></span>
          <span>
            <span className={styles.eyebrow}>{t('print.title')}</span>
            <strong>{t('print.quick')}</strong>
            <small>{labels.sourceHint}</small>
          </span>
        </div>
        <div className={styles.composerBody}>
          <section className={styles.documentPanel}>
            <span className={styles.fieldLabel}>{labels.document}</span>
            <div className={styles.sourceTabs}>
              <button
                type="button"
                data-active={source === 'library' ? '1' : '0'}
                onClick={() => {
                  setSource('library');
                  if (!selectedFile) setLibraryOpen(true);
                }}
              >
                <Icon name="folder" size={17} />
                <span><strong>{t('print.fromLibrary')}</strong><small>{library.fileCount} {t('print.files')}</small></span>
              </button>
              <button
                type="button"
                data-active={source === 'upload' ? '1' : '0'}
                onClick={pickDeviceFile}
              >
                <Icon name="upload" size={17} />
                <span><strong>{labels.uploadDevice}</strong><small>{t('print.uploadHint')}</small></span>
              </button>
            </div>
            <input
              ref={fileInputRef}
              className={styles.hiddenInput}
              type="file"
              accept={PRINTABLE_ACCEPT}
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                if (file) {
                  setUploadFile(file);
                  setSource('upload');
                }
                event.target.value = '';
              }}
            />
            {source === 'library' ? (
              <button type="button" className={styles.documentChoice} onClick={() => setLibraryOpen(true)}>
                <span className={styles.fileMark}><Icon name="doc" size={18} /></span>
                <span>
                  <strong>{selectedFile?.filename || labels.chooseLibrary}</strong>
                  <small>{selectedFile ? `${selectedFile.type.toUpperCase()} · ${selectedFile.size}` : labels.sourceHint}</small>
                </span>
                <Icon name="chevR" size={15} />
              </button>
            ) : (
              <button type="button" className={styles.documentChoice} onClick={pickDeviceFile}>
                <span className={styles.fileMark}><Icon name={uploadFile ? 'check' : 'upload'} size={18} /></span>
                <span>
                  <strong>{uploadFile?.name || t('materials.chooseFile')}</strong>
                  <small>{uploadFile ? `${Math.max(1, Math.round(uploadFile.size / 1024))} KB · ${labels.replace}` : t('print.uploadHint')}</small>
                </span>
                <Icon name="chevR" size={15} />
              </button>
            )}
          </section>

          <section className={styles.optionsPanel}>
            <label className={styles.selectField}>
              <span className={styles.fieldLabel}>{labels.printer}</span>
              <select value={printerId} onChange={(event) => setPrinterId(event.target.value)}>
                <option value="">{labels.choosePrinter}</option>
                {activePrinters.map((printer) => (
                  <option key={printer.id} value={printer.id}>{printer.name} · {printer.location}</option>
                ))}
              </select>
            </label>
            <div className={styles.optionRow}>
              <span><strong>{t('print.copies')}</strong><small>1–100</small></span>
              <Stepper value={copies} min={1} max={100} onChange={setCopies} />
            </div>
            <div className={styles.optionRow}>
              <span><strong>{t('print.color')}</strong><small>{selectedPrinter?.color ? labels.options : labels.unavailableOption}</small></span>
              <Segmented
                value={color ? 'color' : 'bw'}
                onChange={(value) => setColor(value === 'color')}
                options={[
                  { value: 'bw', label: t('print.bw') },
                  ...(selectedPrinter?.color ? [{ value: 'color', label: t('print.colorful') }] : []),
                ]}
              />
            </div>
            <div className={styles.optionRow}>
              <span><strong>{t('print.side')}</strong><small>{selectedPrinter?.duplex ? labels.options : labels.unavailableOption}</small></span>
              <Segmented
                value={duplex ? 'duplex' : 'single'}
                onChange={(value) => setDuplex(value === 'duplex')}
                options={[
                  { value: 'single', label: labels.oneSide },
                  ...(selectedPrinter?.duplex ? [{ value: 'duplex', label: labels.twoSides }] : []),
                ]}
              />
            </div>
          </section>
        </div>
        <footer className={styles.composerFooter}>
          <span>
            <strong>{labels.total}</strong>
            <small>{selectedDocument ? `${copies} × ${selectedDocument.name || selectedDocument.filename} · ${labels.totalHint}` : labels.sourceHint}</small>
          </span>
          <Button
            variant="primary"
            icon="print"
            onClick={submit}
            disabled={!selectedDocument || !selectedPrinter || busy}
          >
            {busy ? t('common.loading') : t('print.addQueue')}
          </Button>
        </footer>
      </Card>
      {libraryOpen && (
        <LibraryPicker
          library={library}
          selectedId={selectedFile?.id}
          onClose={() => setLibraryOpen(false)}
          onSelect={(file) => {
            setSelectedFile(file);
            setSource('library');
            setLibraryOpen(false);
          }}
        />
      )}
    </>
  );
}

function Queue({ jobs, library, printers, onCreate }) {
  const { t, locale } = useT();
  const labels = PAGE_COPY[locale] ?? PAGE_COPY.en;
  const [filter, setFilter] = useState('active');
  const libraryById = new Map((library.files ?? []).map((file) => [String(file.id), file]));
  const printerById = new Map(printers.map((printer) => [String(printer.id), printer]));
  const visible = jobs.filter((job) => {
    if (filter === 'all') return true;
    if (filter === 'active') return ACTIVE_JOB_STATES.has(job.status);
    if (filter === 'done') return job.status === 'done';
    return job.status === 'failed';
  });

  return (
    <Card className={styles.queueCard} padded={false}>
      <header className={styles.sectionHead}>
        <span><strong>{t('print.myQueue')}</strong><small>{jobs.length} {t('print.queueWord')}</small></span>
        <div className={styles.queueFilters}>
          {[
            ['active', labels.activeJobs],
            ['all', labels.allJobs],
            ['done', labels.finishedJobs],
            ['failed', labels.failedJobs],
          ].map(([key, label]) => (
            <button type="button" key={key} data-active={filter === key ? '1' : '0'} onClick={() => setFilter(key)}>{label}</button>
          ))}
        </div>
      </header>
      {visible.length ? (
        <div className={styles.jobList}>
          {visible.map((job) => {
            const libraryFile = job.source === 'content' ? libraryById.get(String(job.sourceId)) : null;
            const printer = printerById.get(String(job.printerId));
            return (
              <article key={job.id} className={styles.jobRow}>
                <span className={styles.jobIcon}><Icon name="doc" size={19} /></span>
                <span className={styles.jobMain}>
                  <span className={styles.jobTitle}>
                    <strong>{libraryFile?.filename || job.doc}</strong>
                    <Chip tone={jobTone(job.status)}>{jobLabel(job.status, t, labels)}</Chip>
                  </span>
                  <small>{job.pages || '—'} {t('print.pages')} · {job.copies} {t('print.copies').toLocaleLowerCase(locale)} · {printer?.name || job.printer}</small>
                  {job.status === 'printing' && <ProgressBar value={job.progress} height={5} />}
                </span>
              </article>
            );
          })}
        </div>
      ) : (
        <div className={styles.compactEmpty}>
          <span><Icon name="print" size={23} /></span>
          <strong>{labels.noJobs}</strong>
          <small>{labels.noJobsHint}</small>
          <Button variant="soft" icon="plus" onClick={onCreate}>{t('print.newPrint')}</Button>
        </div>
      )}
    </Card>
  );
}

function Printers({ printers }) {
  const { t, locale } = useT();
  const labels = PAGE_COPY[locale] ?? PAGE_COPY.en;
  return (
    <Card className={styles.printerCard} padded={false}>
      <header className={styles.sectionHead}>
        <span><strong>{t('print.printers')}</strong><small>{printers.length} {t('print.printerCount')}</small></span>
      </header>
      {printers.length ? (
        <div className={styles.printerList}>
          {printers.map((printer) => (
            <article key={printer.id} className={styles.printerRow}>
              <span className={styles.printerIcon}><Icon name="print" size={20} /></span>
              <span>
                <strong>{printer.name}</strong>
                <small>{printer.location} · {printer.sizes}</small>
                <em>
                  {printer.color ? t('print.colorful') : t('print.bw')}
                  {printer.duplex ? ` · ${labels.twoSides}` : ` · ${labels.oneSide}`}
                </em>
              </span>
              <Chip tone={printerStatusTone(printer.status)}>
                {printer.status === 'free' ? t('print.free') : t('print.locked')}
              </Chip>
            </article>
          ))}
        </div>
      ) : (
        <div className={styles.compactEmpty}>
          <span><Icon name="print" size={23} /></span>
          <strong>{labels.noPrinters}</strong>
          <small>{labels.noPrintersHint}</small>
        </div>
      )}
    </Card>
  );
}

export function PrintPage() {
  const toast = useToast();
  const { t, locale } = useT();
  const labels = PAGE_COPY[locale] ?? PAGE_COPY.en;
  const { print } = useServices();
  const [reloadKey, setReloadKey] = useState(0);
  const [extraJobs, setExtraJobs] = useState([]);
  const composerRef = useRef(null);
  const reload = () => setReloadKey((key) => key + 1);
  const state = useAsync(
    () => Promise.all([print.getPrinters(), print.getJobs(), print.getLibrary()])
      .then(([printers, jobs, library]) => ({ printers, jobs, library })),
    [locale, reloadKey],
  );

  const addJob = async (draft) => {
    const tempId = `print-${Date.now()}`;
    setExtraJobs((current) => [{
      ...draft,
      id: tempId,
      source: draft.libraryFileId ? 'content' : 'upload',
      sourceId: draft.libraryFileId ?? null,
      status: 'queued',
      state: 'queued',
      pages: 0,
      progress: 0,
    }, ...current]);
    try {
      const created = await print.createJob(draft);
      setExtraJobs((current) => [created, ...current.filter((job) => job.id !== tempId)]);
      reload();
      return created;
    } catch (error) {
      setExtraJobs((current) => current.filter((job) => job.id !== tempId));
      toast(error?.message || t('common.error'), 'danger');
      throw error;
    }
  };

  const focusComposer = () => composerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <AsyncBoundary state={state}>
      {(data) => {
        const serverIds = new Set(data.jobs.map((job) => job.id));
        const jobs = [...extraJobs.filter((job) => !serverIds.has(job.id)), ...data.jobs];
        const activePrinters = data.printers.filter((printer) => printer.status !== 'locked').length;
        const activeJobs = jobs.filter((job) => ACTIVE_JOB_STATES.has(job.status)).length;
        return (
          <>
            <PageHeader
              title={t('print.title')}
              subtitle={`${activePrinters} ${t('print.printerCount')} · ${activeJobs} ${t('print.queueWord')}`}
              right={<Button variant="primary" icon="plus" onClick={focusComposer}>{t('print.newPrint')}</Button>}
            />
            <div className={styles.statGrid}>
              <Stat value={activePrinters} label={labels.activePrinters} color="var(--sf-primary)" />
              <Stat value={activeJobs} label={labels.activeQueue} color="var(--sf-accent)" />
              <Stat value={data.library.fileCount} label={labels.readyFiles} color="var(--sf-success)" />
            </div>
            <div ref={composerRef} className={styles.composerAnchor}>
              <PrintComposer library={data.library} printers={data.printers} onAdd={addJob} />
            </div>
            <div className={styles.contentGrid}>
              <Queue jobs={jobs} library={data.library} printers={data.printers} onCreate={focusComposer} />
              <Printers printers={data.printers} />
            </div>
          </>
        );
      }}
    </AsyncBoundary>
  );
}
