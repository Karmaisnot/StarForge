import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Button, Card, Chip, Icon, Modal, Stat } from '@/ui';
import { useServices } from '@/hooks/useServices.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import { plural } from '@/i18n/plural.js';
import { fileTypeLabel, previewKind, safeFileUrl } from './filePreview.js';
import styles from './materials.module.css';

const KIND_ICON = { pdf: 'pdf', image: 'image', video: 'video', audio: 'play', doc: 'doc' };

function statusTone(status) {
  if (status === 'clean') return 'success';
  if (status === 'rejected') return 'danger';
  return 'warn';
}

function UploadModal({ open, targets, busy, onClose, onUpload }) {
  const { t } = useT();
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [targetKey, setTargetKey] = useState('');
  const [downloadable, setDownloadable] = useState(true);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTitle('');
    setTargetKey(targets?.[0]?.key ?? '');
    setDownloadable(true);
  }, [open, targets]);

  const submit = async (event) => {
    event?.preventDefault?.();
    const target = targets.find((item) => item.key === targetKey);
    if (!file || !target || busy) return;
    await onUpload({ file, title: title.trim() || file.name, target, downloadable });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('materials.uploadTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </Button>
          <Button
            variant="primary"
            icon="upload"
            onClick={submit}
            disabled={!file || !targetKey || busy}
          >
            {busy ? t('materials.uploading') : t('materials.upload')}
          </Button>
        </>
      }
    >
      <form className={styles.uploadForm} onSubmit={submit}>
        <label className={styles.dropzone}>
          <Icon name={file ? 'check' : 'upload'} size={24} />
          <strong>{file?.name || t('materials.chooseFile')}</strong>
          <span>{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : t('materials.fileHint')}</span>
          <input
            type="file"
            accept=".pdf,.docx,.pptx,.jpg,.jpeg,.png,.webp,.mp4,.mp3,.m4a,.webm"
            onChange={(event) => {
              const next = event.target.files?.[0] ?? null;
              setFile(next);
              if (next && !title) setTitle(next.name.replace(/\.[^.]+$/, ''));
            }}
          />
        </label>
        <label className={styles.field}>
          <span>{t('materials.displayTitle')}</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>{t('materials.audience')}</span>
          {targets.length > 0 ? (
            <select value={targetKey} onChange={(event) => setTargetKey(event.target.value)}>
              {targets.map((target) => (
                <option key={target.key} value={target.key}>
                  {target.label}{target.detail ? ` · ${target.detail}` : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className={styles.noDestination} role="status">
              <Icon name="shield" size={18} />
              <span>
                <strong>{t('materials.noDestination')}</strong>
                <small>{t('materials.noDestinationHint')}</small>
              </span>
            </div>
          )}
        </label>
        <label className={styles.switchRow}>
          <span>
            <strong>{t('materials.allowDownload')}</strong>
            <small>{
              downloadable ? t('materials.allowDownloadHint') : t('materials.viewOnlyHint')
            }</small>
          </span>
          <input
            type="checkbox"
            checked={downloadable}
            onChange={(event) => setDownloadable(event.target.checked)}
          />
        </label>
      </form>
    </Modal>
  );
}

function FilePreviewModal({ preview, onClose }) {
  const { t } = useT();
  const file = preview?.file;
  const url = preview?.url;
  const kind = previewKind(file?.contentType);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoaded(false);
    setFailed(false);
  }, [url]);

  const ready = () => setLoaded(true);
  const unavailable = () => {
    setLoaded(true);
    setFailed(true);
  };
  const openOriginal = () => window.open(url, '_blank', 'noopener,noreferrer');

  return (
    <Modal
      open={Boolean(file && url)}
      onClose={onClose}
      title={file?.title || t('materials.preview')}
      size="viewer"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.close')}</Button>
          <Button variant="primary" icon="doc" onClick={openOriginal}>{t('materials.openOriginal')}</Button>
        </>
      }
    >
      <div className={styles.previewMeta}>
        <span>{fileTypeLabel(file?.contentType)}</span>
        <span>{file?.meta || '—'}</span>
        <span>{file?.downloadable ? t('materials.downloadable') : t('materials.viewOnly')}</span>
      </div>
      {kind === 'external' || failed ? (
        <div className={styles.previewFallback} role="status">
          <span><Icon name="doc" size={28} /></span>
          <div>
            <strong>{failed ? t('materials.previewFailed') : t('materials.previewUnavailable')}</strong>
            <p>{t('materials.previewUnavailableHint')}</p>
          </div>
        </div>
      ) : (
        <div className={styles.previewStage} data-loaded={loaded ? 'true' : 'false'}>
          {!loaded && <div className={styles.previewLoading} role="status"><span />{t('materials.previewLoading')}</div>}
          {kind === 'image' && <img src={url} alt={file?.title || t('materials.preview')} onLoad={ready} onError={unavailable} />}
          {kind === 'video' && <video src={url} controls playsInline preload="metadata" onLoadedMetadata={ready} onError={unavailable} />}
          {kind === 'audio' && <div className={styles.audioPreview}><Icon name="play" size={30} /><strong>{file?.title}</strong><audio src={url} controls preload="metadata" onLoadedMetadata={ready} onError={unavailable} /></div>}
          {(kind === 'pdf' || kind === 'document') && <iframe src={url} title={`${file?.title || t('materials.preview')} ${t('materials.preview')}`} referrerPolicy="no-referrer" onLoad={ready} onError={unavailable} />}
        </div>
      )}
    </Modal>
  );
}

export function MaterialsPage() {
  const toast = useToast();
  const { t, locale } = useT();
  const { materials } = useServices();
  const [reloadKey, setReloadKey] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [preview, setPreview] = useState(null);
  const [rechecking, setRechecking] = useState(null);
  const [removing, setRemoving] = useState(null);
  const state = useAsync(
    () =>
      Promise.all([
        materials.getList(),
        materials.getStats(),
        materials.getStorage(),
        materials.getTargets(),
      ]).then(([list, stats, storage, targets]) => ({ list, stats, storage, targets })),
    [locale, reloadKey],
  );
  const reload = () => setReloadKey((key) => key + 1);
  const hasPendingFiles = Boolean(state.data?.list?.some((file) => file.status === 'pending'));

  useEffect(() => {
    if (!hasPendingFiles) return undefined;
    const timer = window.setInterval(() => setReloadKey((key) => key + 1), 5_000);
    return () => window.clearInterval(timer);
  }, [hasPendingFiles]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return (state.data?.list ?? []).filter(
      (file) =>
        (status === 'all' || file.status === status || (status === 'viewOnly' && !file.downloadable)) &&
        `${file.title} ${file.destination} ${file.uploadedBy}`
          .toLocaleLowerCase(locale)
          .includes(normalized),
    );
  }, [state.data, query, status, locale]);

  const upload = async (input) => {
    setBusy(true);
    try {
      const created = await materials.create(input);
      toast(`${created.length} ${t('materials.uploaded')}`, 'success');
      setUploadOpen(false);
      reload();
    } catch (error) {
      toast(error?.message || t('common.error'), 'danger');
    } finally {
      setBusy(false);
    }
  };

  const previewFile = async (file) => {
    setViewing(file.id);
    try {
      const result = await materials.preview(file.id);
      const url = safeFileUrl(result?.url);
      if (!url) throw new Error(t('materials.previewFailed'));
      setPreview({ file, url });
    } catch (error) {
      toast(error?.message || t('materials.previewFailed'), 'danger');
    } finally {
      setViewing(null);
    }
  };

  const closePreview = () => {
    if (preview?.url?.startsWith('blob:')) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const download = async (file) => {
    try {
      const result = await materials.download(file.id);
      const url = safeFileUrl(result?.url);
      if (!url) throw new Error(t('materials.previewFailed'));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.download = file.title;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      toast(error?.message || t('materials.notReady'), 'danger');
    }
  };

  const recheck = async (file) => {
    setRechecking(file.id);
    try {
      await materials.recheck(file.id);
      toast(t('materials.checkQueued'), 'success');
      reload();
    } catch (error) {
      toast(error?.message || t('common.error'), 'danger');
    } finally {
      setRechecking(null);
    }
  };

  const remove = async (file) => {
    if (!window.confirm(`${t('materials.removeConfirm')} “${file.title}”?`)) return;
    setRemoving(file.id);
    try {
      await materials.remove(file.id);
      toast(t('materials.removed'), 'success');
      reload();
    } catch (error) {
      toast(error?.message || t('common.error'), 'danger');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <AsyncBoundary state={state}>
      {(data) => (
        <>
          <PageHeader
            title={t('materials.title')}
            subtitle={t('materials.subtitle')}
            right={
              <Button variant="primary" icon="upload" onClick={() => setUploadOpen(true)}>
                {t('materials.upload')}
              </Button>
            }
          />

          <div className={styles.statGrid}>
            <Stat value={String(data.storage.fileCount)} label={t('materials.totalFiles')} color="var(--sf-primary)" />
            <Stat
              value={String(data.list.filter((file) => file.status === 'clean').length)}
              label={t('materials.available')}
              color="var(--sf-success)"
            />
            <Stat
              value={String(data.list.filter((file) => !file.downloadable).length)}
              label={t('materials.viewOnly')}
              color="var(--sf-accent)"
            />
            <Stat value={data.storage.used} label={t('materials.storageUsed')} color="var(--sf-warn)" />
          </div>

          <Card padded={false}>
            <div className={styles.toolbar}>
              <div className={styles.searchBox}>
                <Icon name="search" size={15} />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t('materials.search')}
                />
              </div>
              <div className={styles.filters}>
                {[
                  ['all', t('common.showAll')],
                  ['clean', t('materials.available')],
                  ['pending', t('materials.processing')],
                  ['viewOnly', t('materials.viewOnly')],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={status === value ? styles.filterActive : ''}
                    onClick={() => setStatus(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.libraryHead}>
              <span>{t('materials.file')}</span>
              <span>{t('materials.destination')}</span>
              <span>{t('materials.access')}</span>
              <span>{t('materials.activity')}</span>
              <span />
            </div>
            {visible.length > 0 ? (
              visible.map((file) => (
                <div key={file.id} className={styles.row}>
                  <div className={styles.fileCell}>
                    <div className={styles.thumb} style={{ background: file.color }}>
                      <Icon name={KIND_ICON[file.kind] ?? 'doc'} size={22} />
                    </div>
                    <button
                      type="button"
                      className={styles.fileNameButton}
                      onClick={() => previewFile(file)}
                      disabled={file.status !== 'clean' || viewing === file.id}
                    >
                      <strong>{file.title}</strong>
                      <small>{file.meta} · {file.date}</small>
                    </button>
                  </div>
                  <div className={styles.destinationCell}>
                    <Icon name={file.audience === 'global' ? 'globe' : 'cohort'} size={15} />
                    <span>{file.destination}</span>
                  </div>
                  <div className={styles.accessCell}>
                    <Chip tone={statusTone(file.status)}>{t(file.checkDelayed ? 'materials.status.delayed' : `materials.status.${file.status}`)}</Chip>
                    <span className={styles.accessLabel}>
                      <Icon name={file.downloadable ? 'download' : 'shield'} size={13} />
                      {file.downloadable ? t('materials.downloadable') : t('materials.viewOnly')}
                    </span>
                    {file.rejectReason && <span className={styles.fileProblem}>{file.rejectReason}</span>}
                  </div>
                  <div className={styles.activityCell}>
                    <strong>{file.views}</strong>
                    <span>{plural(locale, 'views', file.views)}</span>
                  </div>
                  <div className={styles.actions}>
                    {file.status === 'clean' && <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => previewFile(file)}
                      disabled={viewing === file.id}
                      aria-label={t('materials.preview')}
                      title={t('materials.preview')}
                    >
                      <Icon name="doc" size={16} />
                    </button>}
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => download(file)}
                      disabled={file.status !== 'clean' || !file.downloadable}
                      aria-label={t('materials.download')}
                      title={t('materials.download')}
                    >
                      <Icon name="download" size={16} />
                    </button>
                    {file.status === 'pending' && <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => recheck(file)}
                      disabled={rechecking === file.id}
                      aria-label={t('materials.checkAgain')}
                      title={t('materials.checkAgain')}
                    >
                      <Icon name="refresh" size={16} />
                    </button>}
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => remove(file)}
                      disabled={removing === file.id}
                      aria-label={t('materials.remove')}
                      title={t('materials.remove')}
                    >
                      <Icon name="trash" size={16} />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.empty}>
                <Icon name="book" size={28} />
                <strong>{t('materials.empty')}</strong>
                <span>{t('materials.emptyHint')}</span>
                <Button variant="soft" icon="upload" onClick={() => setUploadOpen(true)}>
                  {t('materials.upload')}
                </Button>
              </div>
            )}
          </Card>

          <UploadModal
            open={uploadOpen}
            targets={data.targets}
            busy={busy}
            onClose={() => !busy && setUploadOpen(false)}
            onUpload={upload}
          />
          <FilePreviewModal preview={preview} onClose={closePreview} />
        </>
      )}
    </AsyncBoundary>
  );
}
