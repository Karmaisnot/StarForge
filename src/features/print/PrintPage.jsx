import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import {
  Button,
  Card,
  Chip,
  Icon,
  MotivationalHero,
  ProgressBar,
  Segmented,
  Stepper,
  StarMark,
} from '@/ui';
import { printerStatusTone } from '@/domain/models/print.js';
import { useServices } from '@/hooks/useServices.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import { plural } from '@/i18n/plural.js';
import styles from './print.module.css';

const PAGES_PER_COPY = 8;

/** Return a shallow copy of `obj` without the given key (no unused-var binding). */
function dropKey(obj, key) {
  const next = { ...obj };
  delete next[key];
  return next;
}

function QuickPrint({ library, printers, onAdd }) {
  const toast = useToast();
  const { t: tt, locale } = useT();
  const [source, setSource] = useState('library');
  const [copies, setCopies] = useState(24);
  const [format, setFormat] = useState('A4');
  const [color, setColor] = useState('bw');
  const [side, setSide] = useState('2');
  const [uploadName, setUploadName] = useState('');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(() => library.files?.[0] ?? null);
  const fileInputRef = useRef(null);

  const total = copies * PAGES_PER_COPY;

  const pickUpload = () => {
    setSource('upload');
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadName(file.name);
      toast(`${tt('print.fileChosen')} · ${file.name}`, 'success');
    }
    // Reset so re-picking the same file fires change again.
    event.target.value = '';
  };

  const addToQueue = () => {
    const doc =
      source === 'upload' && uploadName
        ? uploadName
        : (selectedFile?.filename ?? `${tt('print.quick')} · ${format}`);
    // No dedicated printer selector in this form: default to the first
    // non-locked printer so the job targets a real, available device.
    const target = (printers ?? []).find((p) => p.status !== 'locked') ?? (printers ?? [])[0];
    onAdd({
      printerId: target?.id,
      doc,
      copies,
      size: `${format} · ${color === 'bw' ? tt('print.bw') : tt('print.colorful')}`,
      printer: target?.name ?? 'HP LaserJet',
      icon: 'doc',
      side,
      libraryFileId: source === 'library' ? selectedFile?.id : undefined,
    });
    toast(`${total} ${plural(locale, 'pages', total)} ${tt('print.queueToast')}`, 'success');
  };

  return (
    <>
      <Card title={tt('print.quick')}>
        <div className={styles.quick}>
          <div className={styles.source}>
            <button
              className={`${styles.sourceBtn} ${source === 'library' ? styles.sourceOn : ''}`}
              onClick={() => {
                setSource('library');
                setLibraryOpen(true);
              }}
            >
              <Icon name="folder" size={18} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{tt('print.fromLibrary')}</div>
                <div style={{ fontSize: 10, color: 'var(--sf-muted)' }}>
                  {library.fileCount} {tt('print.files')}
                </div>
              </div>
            </button>
            <button
              className={`${styles.sourceBtn} ${source === 'upload' ? styles.sourceOn : ''}`}
              onClick={pickUpload}
            >
              <Icon name="upload" size={18} />
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{tt('print.upload')}</div>
                <div style={{ fontSize: 10, color: 'var(--sf-muted)' }}>
                  {tt('print.uploadHint')}
                </div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileChange}
              style={{ display: 'none' }}
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
          {source === 'library' && selectedFile && (
            <button
              type="button"
              className={styles.selectedLibraryFile}
              onClick={() => setLibraryOpen(true)}
            >
              <span>
                <Icon name="doc" size={16} />
              </span>
              <span>
                <strong>{selectedFile.filename}</strong>
                <small>
                  {selectedFile.type} · {selectedFile.size}
                </small>
              </span>
              <Icon name="chevR" size={14} />
            </button>
          )}
          {source === 'upload' && uploadName && (
            <div
              style={{
                fontSize: 11,
                color: 'var(--sf-primary)',
                fontWeight: 600,
                wordBreak: 'break-all',
              }}
            >
              {tt('print.fileChosen')} · {uploadName}
            </div>
          )}

          <div className={styles.formRow}>
            <span className={styles.formL}>{tt('print.copies')}</span>
            <Stepper value={copies} min={1} onChange={setCopies} />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formL}>{tt('print.format')}</span>
            <Segmented
              value={format}
              onChange={setFormat}
              options={[
                { value: 'A4', label: 'A4' },
                { value: 'A5', label: 'A5' },
                { value: 'A3', label: 'A3' },
              ]}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formL}>{tt('print.color')}</span>
            <Segmented
              value={color}
              onChange={setColor}
              options={[
                { value: 'bw', label: tt('print.bw') },
                { value: 'color', label: tt('print.colorful') },
              ]}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formL}>{tt('print.side')}</span>
            <Segmented
              value={side}
              onChange={setSide}
              options={[
                { value: '1', label: '1 ↕' },
                { value: '2', label: '2 ↔' },
              ]}
            />
          </div>
          <div className={styles.formRow}>
            <span className={styles.formL}>{tt('print.time')}</span>
            <span style={{ fontSize: 12, color: 'var(--sf-primary)', fontWeight: 600 }}>
              {tt('print.timeValue')}
            </span>
          </div>

          <div className={styles.sum}>
            <div className={styles.sumRow}>
              <span
                style={{
                  fontSize: 10,
                  opacity: 0.7,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                {tt('print.final')}
              </span>
              <StarMark size={20} color="var(--sf-accent)" />
            </div>
            <div className="sf-mono" style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
              {copies} × {PAGES_PER_COPY} = {total} {plural(locale, 'pages', total)}
            </div>
            <div style={{ marginTop: 2, fontSize: 11, opacity: 0.7 }}>
              {format} · {color === 'bw' ? tt('print.bw') : tt('print.colorful')} · {side}{' '}
              {tt('print.sided')} · HP LaserJet
            </div>
          </div>
          <Button
            variant="primary"
            block
            icon="arrowR"
            iconRight
            onClick={addToQueue}
            disabled={source === 'library' && !selectedFile}
          >
            {tt('print.addQueue')}
          </Button>
        </div>
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

function LibraryPicker({ library, selectedId, onClose, onSelect }) {
  const { t, locale } = useT();
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
    const needle = query.trim().toLowerCase();
    return (library.files ?? []).filter(
      (file) =>
        (type === 'all' || file.type === type) &&
        (!needle || file.filename.toLowerCase().includes(needle)),
    );
  }, [library.files, query, type]);
  const labels = {
    en: {
      title: 'Choose from library',
      subtitle: 'Search reusable teaching files',
      all: 'All files',
      empty: 'No matching files',
    },
    ru: {
      title: 'Выбрать из библиотеки',
      subtitle: 'Найдите готовые учебные материалы',
      all: 'Все файлы',
      empty: 'Файлы не найдены',
    },
    uz: {
      title: 'Kutubxonadan tanlash',
      subtitle: 'Tayyor o‘quv materiallarini toping',
      all: 'Barcha fayllar',
      empty: 'Fayl topilmadi',
    },
  }[locale];
  const types = [...new Set((library.files ?? []).map((file) => file.type))];

  return (
    <div className={styles.libraryBackdrop} onMouseDown={onClose}>
      <section
        className={styles.libraryDrawer}
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <h2>{labels.title}</h2>
            <p>{labels.subtitle}</p>
          </div>
          <button onClick={onClose} aria-label={t('common.close')}>
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
            <option value="all">{labels.all}</option>
            {types.map((value) => (
              <option key={value} value={value}>
                {value.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.libraryList}>
          {files.map((file) => (
            <button
              key={file.id}
              data-selected={selectedId === file.id ? '1' : '0'}
              onClick={() => onSelect(file)}
            >
              <span className={styles.fileMark}>
                <Icon name={file.type === 'pdf' ? 'doc' : 'folder'} size={18} />
              </span>
              <span>
                <strong>{file.filename}</strong>
                <small>
                  {file.type.toUpperCase()} · {file.size} · {file.pages} pages
                </small>
                <em>
                  {file.owner} · {file.updatedAt}
                </em>
              </span>
              {selectedId === file.id ? (
                <Icon name="check" size={16} />
              ) : (
                <Icon name="arrowR" size={14} />
              )}
            </button>
          ))}
          {!files.length && <div className={styles.libraryEmpty}>{labels.empty}</div>}
        </div>
      </section>
    </div>
  );
}

export function PrintPage() {
  const toast = useToast();
  const { t: tt, locale } = useT();
  const { print } = useServices();
  // Local reload key lets a successful mutation pull the server truth
  // (queue depth + printer state) back into the page.
  const [reloadKey, setReloadKey] = useState(0);
  const reload = () => setReloadKey((k) => k + 1);
  const state = useAsync(
    () =>
      Promise.all([print.getPrinters(), print.getJobs(), print.getLibrary()]).then(
        ([printers, jobs, library]) => ({ printers, jobs, library }),
      ),
    [locale, reloadKey],
  );
  const [extraJobs, setExtraJobs] = useState([]);
  const [cancelled, setCancelled] = useState({});
  // The local Fastify API persists the complete queue, including cancellation.
  const writesEnabled = true;

  const cancelJob = async (job) => {
    // Optimistic: drop it from the visible queue immediately.
    setExtraJobs((list) => list.filter((j) => j.id !== job.id));
    setCancelled((c) => ({ ...c, [job.id]: true }));
    toast(`${tt('print.cancelled')} · ${job.doc}`);
    try {
      await print.cancelJob(job.id);
      // Server truth now reflects the cancel; clear scratch state it covers.
      setExtraJobs((list) => list.filter((j) => j.id !== job.id));
      setCancelled((c) => dropKey(c, job.id));
      reload();
    } catch {
      // Roll back the optimistic removal so the job reappears.
      setCancelled((c) => dropKey(c, job.id));
      toast(tt('common.error'), 'danger');
    }
  };

  const addJob = async (job) => {
    const tempId = `job-${Date.now()}`;
    // Optimistic: show the queued job right away.
    setExtraJobs((list) => [
      { id: tempId, state: 'queued', progress: 0, eta: tt('print.queued'), ...job },
      ...list,
    ]);
    try {
      await print.createJob({
        printerId: job.printerId,
        doc: job.doc,
        copies: job.copies,
        size: job.size,
        libraryFileId: job.libraryFileId,
      });
      // Server now owns this job; drop the optimistic stub and refetch.
      setExtraJobs((list) => list.filter((j) => j.id !== tempId));
      reload();
    } catch {
      // Roll back the optimistic stub on failure.
      setExtraJobs((list) => list.filter((j) => j.id !== tempId));
      toast(tt('common.error'), 'danger');
    }
  };
  const sendToPrinter = (printer) => {
    addJob({
      printerId: printer.id,
      doc: printer.name,
      copies: 1,
      size: printer.sizes,
      printer: printer.name,
      icon: 'print',
    });
    toast(printer.name, 'success');
  };
  const focusQuick = () => {
    document
      .getElementById('sf-quick-print')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <AsyncBoundary state={state}>
      {(d) =>
        (() => {
          const jobs = [...extraJobs, ...d.jobs].filter((job) => !cancelled[job.id]);
          return (
            <>
              <PageHeader
                title={tt('print.title')}
                subtitle={`${d.printers.length} ${tt('print.printerCount')} · ${jobs.length} ${tt('print.queueWord')}`}
                right={
                  writesEnabled ? (
                    <Button variant="primary" icon="plus" onClick={focusQuick}>
                      {tt('print.newPrint')}
                    </Button>
                  ) : null
                }
              />

              <MotivationalHero
                context="print"
                compact
                className={styles.printHero}
                eyebrow={tt('print.title')}
                title={tt('print.quick')}
                refreshKey={reloadKey}
                meta={`${d.library.fileCount} ${tt('print.files')} · ${jobs.length} ${tt('print.queueWord')}`}
              />

              <div className={styles.grid}>
                <div>
                  <h3 className={styles.sectionH}>
                    {tt('print.myQueue')} · {jobs.length}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {jobs.map((j) => (
                      <Card key={j.id} padded={false}>
                        <div
                          style={{ display: 'flex', gap: 14, padding: 16, alignItems: 'center' }}
                        >
                          <div className={styles.docThumb}>
                            <Icon name={j.icon ?? 'doc'} size={22} />
                            <div className={styles.docMult}>×{j.copies}</div>
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}
                            >
                              <div style={{ fontSize: 15, fontWeight: 700 }}>{j.doc}</div>
                              <Chip tone={j.state === 'now' ? 'primary' : 'accent'}>
                                {j.state === 'now' ? tt('print.printing') : tt('print.queued')}
                              </Chip>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--sf-muted)' }}>
                              {j.size} · {j.printer}
                            </div>
                            <div
                              style={{
                                marginTop: 12,
                                display: 'flex',
                                gap: 10,
                                alignItems: 'center',
                              }}
                            >
                              <ProgressBar
                                value={j.progress}
                                height={6}
                                color={j.state === 'now' ? 'var(--sf-primary)' : 'var(--sf-accent)'}
                              />
                              <span
                                className="sf-mono"
                                style={{
                                  fontSize: 11,
                                  color: 'var(--sf-muted)',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {j.state === 'now'
                                  ? `${j.progress}%`
                                  : (j.eta.split(' · ')[1] ?? j.eta)}
                              </span>
                            </div>
                            <div
                              className="sf-mono"
                              style={{ marginTop: 4, fontSize: 10, color: 'var(--sf-muted)' }}
                            >
                              {j.eta}
                            </div>
                          </div>
                          {writesEnabled && (
                            <button
                              className={styles.iconBtn}
                              onClick={() => cancelJob(j)}
                              aria-label={tt('print.cancelled')}
                            >
                              <Icon name="x" size={16} />
                            </button>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>

                  <h3 className={styles.sectionH} style={{ marginTop: 28 }}>
                    {tt('print.printers')}
                  </h3>
                  <div className={styles.printersGrid}>
                    {d.printers.map((p) => (
                      <Card key={p.id} padded={false}>
                        <div style={{ padding: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className={styles.printerIcon} style={{ color: p.accent }}>
                              <Icon name="print" size={26} />
                              <span
                                style={{
                                  position: 'absolute',
                                  bottom: 4,
                                  right: 4,
                                  width: 10,
                                  height: 10,
                                  borderRadius: '50%',
                                  background: p.accent,
                                  border: '2px solid var(--sf-surface)',
                                }}
                              />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <span style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</span>
                                {p.color && <Chip tone="accent">{tt('print.colorful')}</Chip>}
                              </div>
                              <div style={{ fontSize: 11, color: 'var(--sf-muted)', marginTop: 1 }}>
                                {p.location} · {p.sizes}
                              </div>
                            </div>
                            <Chip tone={printerStatusTone(p.status)}>
                              {p.status === 'free'
                                ? tt('print.free')
                                : p.status === 'busy'
                                  ? `${p.queue} ${tt('print.queueWord')}`
                                  : tt('print.locked')}
                            </Chip>
                          </div>
                          <div className={styles.printerEta}>
                            <Icon name="clock" size={14} style={{ color: p.accent }} />
                            <span style={{ flex: 1 }}>{p.eta}</span>
                            {writesEnabled && p.status !== 'locked' && (
                              <Button
                                variant="soft"
                                style={{ padding: '4px 10px', fontSize: 11 }}
                                onClick={() => sendToPrinter(p)}
                              >
                                {tt('print.send')}
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>

                {writesEnabled && (
                  <div id="sf-quick-print">
                    <QuickPrint library={d.library} printers={d.printers} onAdd={addJob} />
                  </div>
                )}
              </div>
            </>
          );
        })()
      }
    </AsyncBoundary>
  );
}
