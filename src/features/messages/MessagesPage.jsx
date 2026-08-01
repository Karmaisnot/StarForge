import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/layout/PageHeader.jsx';
import { AsyncBoundary } from '@/layout/PageState.jsx';
import { Avatar, Chip, Icon, Modal, StarMark } from '@/ui';
import { useServices } from '@/hooks/useServices.js';
import { useAsync } from '@/hooks/useAsync.js';
import { useToast } from '@/hooks/useToast.js';
import { useT } from '@/hooks/useT.js';
import { isApiMode } from '@/data/http/apiConfig.js';
import styles from './messages.module.css';

const FILTERS = ['all', 'people', 'groups', 'management', 'archived'];

export function MessagesPage() {
  const { mgmt, cohorts: cohortService } = useServices();
  const { t, locale } = useT();
  const toast = useToast();
  const liveMode = isApiMode();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = useAsync(async () => {
    const [staffThreads, cohorts] = await Promise.all([
      mgmt.getThreads(),
      liveMode ? Promise.resolve([]) : cohortService.list(),
    ]);
    const rosterPairs = await Promise.all(
      (cohorts ?? []).map(async (cohort) => [cohort, await cohortService.getRoster(cohort.id)]),
    );
    return { staffThreads: staffThreads ?? [], cohorts: cohorts ?? [], rosterPairs };
  }, [locale]);

  const [openId, setOpenId] = useState(null);
  const [extraThreads, setExtraThreads] = useState([]);
  const [sentByThread, setSentByThread] = useState({});
  const [query, setQuery] = useState('');
  const requestedScope = searchParams.get('scope');
  const [filter, setFilter] = useState(() =>
    FILTERS.includes(requestedScope) ? requestedScope : 'all',
  );
  const [threadState, setThreadState] = useState({});
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  useEffect(() => {
    if (FILTERS.includes(requestedScope)) setFilter(requestedScope);
  }, [requestedScope]);

  const selectFilter = (nextFilter) => {
    setFilter(nextFilter);
    const nextParams = new URLSearchParams(searchParams);
    if (nextFilter === 'all') nextParams.delete('scope');
    else nextParams.set('scope', nextFilter);
    setSearchParams(nextParams, { replace: true });
  };

  const appendMessage = (threadId, message) => {
    setSentByThread((current) => ({
      ...current,
      [threadId]: [...(current[threadId] ?? []), message],
    }));
  };
  const removeMessage = (threadId, messageId) => {
    setSentByThread((current) => ({
      ...current,
      [threadId]: (current[threadId] ?? []).filter((message) => message.id !== messageId),
    }));
  };

  return (
    <AsyncBoundary state={state}>
      {(data) => {
        const staffThreads = data.staffThreads.map((thread) => ({
          ...thread,
          kind: thread.channel ? 'group' : 'management',
          persisted: true,
          archived: threadState[thread.id]?.archived ?? Boolean(thread.archived),
          deleted: threadState[thread.id]?.deleted ?? false,
          profileType: thread.channel ? t('messages.groupChat') : thread.role,
        }));
        const groupThreads = (liveMode ? [] : data.cohorts).map((cohort) => ({
          id: `group-${cohort.id}`,
          contactKey: `group-${cohort.id}`,
          name: cohort.name,
          role: `${cohort.studentCount ?? 0} ${t('messages.members')}`,
          lastMessage: t('messages.startConversation'),
          time: '',
          unread: 0,
          online: true,
          kind: 'group',
          generated: true,
          groupName: cohort.name,
          memberCount: cohort.studentCount ?? 0,
          profileType: t('messages.groupChat'),
        }));
        const threads = [...extraThreads, ...staffThreads, ...groupThreads]
          .map((thread) => ({
            ...thread,
            archived: threadState[thread.id]?.archived ?? Boolean(thread.archived),
            deleted: threadState[thread.id]?.deleted ?? Boolean(thread.deleted),
          }))
          .filter(
            (thread, index, list) =>
              !thread.deleted &&
              list.findIndex((candidate) => candidate.id === thread.id) === index,
          );
        const normalizedQuery = query.trim().toLowerCase();
        const visibleThreads = threads.filter((thread) => {
          const matchesFilter = (() => {
            if (filter === 'archived') return thread.archived;
            if (thread.archived) return false;
            if (filter === 'all') return true;
            if (filter === 'groups') return thread.kind === 'group';
            if (filter === 'management') return thread.kind === 'management';
            return thread.kind === 'student' || thread.kind === 'staff';
          })();
          const matchesQuery =
            !normalizedQuery ||
            `${thread.name} ${thread.role} ${thread.lastMessage}`
              .toLowerCase()
              .includes(normalizedQuery);
          return matchesFilter && matchesQuery;
        });
        const active =
          visibleThreads.find((thread) => thread.id === openId) ?? visibleThreads[0] ?? null;
        const contacts = buildContacts(data, staffThreads, t).filter(
          (contact) => !liveMode || contact.threadId,
        );

        const openThread = (threadId) => {
          setOpenId(threadId);
          setMobileChatOpen(true);
          const thread = threads.find((candidate) => candidate.id === threadId);
          if (thread?.persisted) mgmt.markRead(threadId).catch(() => {});
        };

        const archiveThread = async (thread) => {
          if (!thread) return;
          const archived = !thread.archived;
          setThreadState((current) => ({
            ...current,
            [thread.id]: { ...current[thread.id], archived },
          }));
          try {
            if (thread.persisted) await mgmt.archiveThread(thread.id, archived);
            toast(t(archived ? 'messages.archivedToast' : 'messages.unarchivedToast'), 'success');
          } catch {
            setThreadState((current) => ({
              ...current,
              [thread.id]: { ...current[thread.id], archived: !archived },
            }));
            toast(t('common.error'), 'danger');
          }
        };

        const deleteThread = async () => {
          const thread = threads.find((candidate) => candidate.id === deleteTargetId);
          if (!thread) return setDeleteTargetId(null);
          setDeleteTargetId(null);
          setThreadState((current) => ({
            ...current,
            [thread.id]: { ...current[thread.id], deleted: true },
          }));
          setOpenId(null);
          setMobileChatOpen(false);
          try {
            if (thread.persisted) await mgmt.deleteThread(thread.id);
            toast(t('messages.deletedToast'), 'success');
          } catch {
            setThreadState((current) => ({
              ...current,
              [thread.id]: { ...current[thread.id], deleted: false },
            }));
            toast(t('common.error'), 'danger');
          }
        };

        const createConversation = (contact) => {
          const existing = threads.find(
            (thread) =>
              thread.contactKey === contact.key ||
              thread.id === contact.threadId ||
              (thread.name === contact.name && thread.kind === contact.kind),
          );
          if (existing) {
            openThread(existing.id);
            setComposeOpen(false);
            return;
          }

          const thread = {
            id: `local-${contact.key}`,
            contactKey: contact.key,
            name: contact.name,
            role: contact.role,
            groupName: contact.groupName,
            memberCount: contact.memberCount,
            kind: contact.kind,
            online: contact.online,
            unread: 0,
            time: '',
            lastMessage: t('messages.startConversation'),
            profileType: contact.profileType,
          };
          setExtraThreads((current) => [thread, ...current]);
          setOpenId(thread.id);
          setMobileChatOpen(true);
          setComposeOpen(false);
        };

        const sendMessage = (message) => {
          if (!active) return;
          appendMessage(active.id, message);
          if (message.kind === 'text' && active.persisted) {
            mgmt.sendMessage(active.id, message.text).catch(() => {
              removeMessage(active.id, message.id);
              toast(t('common.error'), 'danger');
            });
          } else if (active.persisted) {
            const description = message.name || `${message.kind} · ${message.duration ?? ''}`;
            mgmt.sendMessage(active.id, `[${description}]`).catch(() => {
              removeMessage(active.id, message.id);
              toast(t('common.error'), 'danger');
            });
          }
        };

        return (
          <>
            <PageHeader title={t('messages.title')} subtitle={t('messages.subtitle')} />

            <div className={`${styles.layout} ${mobileChatOpen ? styles.mobileChatOpen : ''}`}>
              <section className={styles.chatList} aria-label={t('messages.title')}>
                <div className={styles.listTop}>
                  <label className={styles.search}>
                    <Icon name="search" size={14} />
                    <input
                      aria-label={t('messages.search')}
                      placeholder={t('messages.search')}
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className={styles.composeButton}
                    onClick={() => setComposeOpen(true)}
                    aria-label={t('messages.newChat')}
                  >
                    <Icon name="edit" size={16} />
                  </button>
                </div>

                <div className={styles.filters}>
                  {FILTERS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      data-on={filter === key ? '1' : '0'}
                      onClick={() => selectFilter(key)}
                    >
                      {t(`messages.${key}`)}
                    </button>
                  ))}
                </div>

                <div className={styles.threadList}>
                  {visibleThreads.map((thread) => (
                    <ThreadRow
                      key={thread.id}
                      thread={thread}
                      active={active?.id === thread.id}
                      onClick={() => openThread(thread.id)}
                      t={t}
                    />
                  ))}
                  {!visibleThreads.length && (
                    <div className={styles.noResults}>{t('messages.noContacts')}</div>
                  )}
                </div>
              </section>

              {active ? (
                <Conversation
                  key={active.id}
                  thread={active}
                  localMessages={sentByThread[active.id] ?? []}
                  onSend={sendMessage}
                  onBack={() => setMobileChatOpen(false)}
                  onProfile={() => setProfileOpen(true)}
                  onArchive={() => archiveThread(active)}
                  onDelete={() => setDeleteTargetId(active.id)}
                  t={t}
                  locale={locale}
                  mgmt={mgmt}
                  toast={toast}
                />
              ) : (
                <div className={styles.emptyConversation}>{t('messages.noMessages')}</div>
              )}

              {active && (
                <ProfilePanel thread={active} messages={sentByThread[active.id] ?? []} t={t} />
              )}
            </div>

            <NewChatModal
              open={composeOpen}
              onClose={() => setComposeOpen(false)}
              contacts={contacts}
              onSelect={createConversation}
              t={t}
            />
            <ProfileModal
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
              thread={active}
              messages={active ? (sentByThread[active.id] ?? []) : []}
              t={t}
            />
            <Modal
              open={Boolean(deleteTargetId)}
              onClose={() => setDeleteTargetId(null)}
              title={t('messages.deleteChat')}
            >
              <div className={styles.confirmDelete}>
                <p>{t('messages.deleteConfirm')}</p>
                <div>
                  <button type="button" onClick={() => setDeleteTargetId(null)}>
                    {t('common.cancel')}
                  </button>
                  <button type="button" data-danger="1" onClick={deleteThread}>
                    <Icon name="trash" size={15} />
                    {t('messages.deleteChat')}
                  </button>
                </div>
              </div>
            </Modal>
          </>
        );
      }}
    </AsyncBoundary>
  );
}

function ThreadRow({ thread, active, onClick, t }) {
  return (
    <button type="button" className={styles.thread} data-on={active ? '1' : '0'} onClick={onClick}>
      <ThreadAvatar thread={thread} size={44} />
      <span className={styles.threadCopy}>
        <span className={styles.threadLine}>
          <strong>{thread.name}</strong>
          <time className="sf-mono">{thread.time}</time>
        </span>
        <span className={styles.threadRole}>{thread.role}</span>
        <span className={styles.threadLine}>
          <small>{thread.lastMessage || t('messages.startConversation')}</small>
          {thread.archived ? (
            <span className={styles.archivedMark} title={t('messages.archived')}>
              <Icon name="archive" size={13} />
            </span>
          ) : (
            thread.unread > 0 && <i>{thread.unread}</i>
          )}
        </span>
      </span>
    </button>
  );
}

function ThreadAvatar({ thread, size }) {
  if (thread.kind === 'group') {
    return (
      <span className={styles.groupAvatar} style={{ width: size, height: size }}>
        <Icon name="users" size={Math.round(size * 0.48)} />
      </span>
    );
  }
  return (
    <span className={styles.avatarWrap}>
      <Avatar name={thread.name} size={size} color="var(--sf-primary)" />
      {thread.online && <i className={styles.onlineDot} />}
    </span>
  );
}

function Conversation({
  thread,
  localMessages,
  onSend,
  onBack,
  onProfile,
  onArchive,
  onDelete,
  t,
  locale,
  mgmt,
  toast,
}) {
  const transcript = useAsync(
    () => (thread.persisted ? mgmt.getTranscript(thread.id) : Promise.resolve([])),
    [thread.id, locale],
  );
  const [draft, setDraft] = useState('');
  const fileRef = useRef(null);
  const bodyRef = useRef(null);
  const recorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const secondsRef = useRef(0);
  const objectUrlsRef = useRef(new Set());
  const aliveRef = useRef(true);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const messages = useMemo(
    () => [...(transcript.data ?? []), ...localMessages],
    [localMessages, transcript.data],
  );

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    aliveRef.current = true;
    const objectUrls = objectUrlsRef.current;
    return () => {
      aliveRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  const sendText = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend({
      id: `local-${Date.now()}`,
      dir: 'out',
      kind: 'text',
      text,
      time: t('messages.now'),
      read: true,
    });
    setDraft('');
  };

  const attachFiles = (event) => {
    const files = [...(event.target.files ?? [])];
    files.forEach((file, index) => {
      const kind = file.type.startsWith('image/')
        ? 'image'
        : file.type.startsWith('video/')
          ? 'video'
          : 'file';
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      onSend({
        id: `attachment-${Date.now()}-${index}`,
        dir: 'out',
        kind,
        name: file.name,
        size: formatBytes(file.size),
        url,
        time: t('messages.now'),
        read: true,
      });
    });
    if (files.length)
      toast(
        t(
          files.some((file) => file.type.startsWith('image/') || file.type.startsWith('video/'))
            ? 'messages.mediaSent'
            : 'messages.fileSent',
        ),
        'success',
      );
    event.target.value = '';
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  };

  const startRecording = async () => {
    if (recording) {
      stopRecording();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast(t('common.error'), 'danger');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!aliveRef.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const duration = Math.max(1, Math.min(60, Math.round(secondsRef.current)));
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size) {
          const url = URL.createObjectURL(blob);
          objectUrlsRef.current.add(url);
          onSend({
            id: `voice-${Date.now()}`,
            dir: 'out',
            kind: 'voice',
            url,
            duration,
            time: t('messages.now'),
            read: true,
          });
          toast(t('messages.voiceSent'), 'success');
        }
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setSeconds(0);
        secondsRef.current = 0;
      };
      recorder.start();
      setRecording(true);
      setSeconds(0);
      secondsRef.current = 0;
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
        if (secondsRef.current >= 60) stopRecording();
      }, 1000);
    } catch {
      toast(t('common.error'), 'danger');
    }
  };

  return (
    <section className={styles.conversation}>
      <header className={styles.conversationHeader}>
        <button
          type="button"
          className={styles.mobileBack}
          onClick={onBack}
          aria-label={t('messages.back')}
        >
          <Icon name="arrowL" size={18} />
        </button>
        <button
          type="button"
          className={styles.profileTrigger}
          onClick={onProfile}
          aria-label={t('messages.openProfile')}
        >
          <ThreadAvatar thread={thread} size={40} />
          <span>
            <strong>{thread.name}</strong>
            <small>{thread.online ? t('messages.online') : thread.role}</small>
          </span>
        </button>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={styles.headerAction}
            onClick={onArchive}
            aria-label={t(thread.archived ? 'messages.unarchive' : 'messages.archive')}
            title={t(thread.archived ? 'messages.unarchive' : 'messages.archive')}
          >
            <Icon name="archive" size={17} />
          </button>
          <button
            type="button"
            className={`${styles.headerAction} ${styles.dangerAction}`}
            onClick={onDelete}
            aria-label={t('messages.deleteChat')}
            title={t('messages.deleteChat')}
          >
            <Icon name="trash" size={17} />
          </button>
          <button
            type="button"
            className={styles.headerAction}
            onClick={onProfile}
            aria-label={t('messages.openProfile')}
            title={t('messages.openProfile')}
          >
            <Icon name="user" size={17} />
          </button>
        </div>
      </header>

      <div className={styles.messageBody} ref={bodyRef}>
        <div className={styles.dayLabel}>{t('messages.today')}</div>
        {messages.map((message, index) => (
          <MessageBubble key={message.id ?? index} message={message} thread={thread} />
        ))}
        {!messages.length && (
          <div className={styles.emptyMessages}>
            <span>
              <StarMark size={28} color="var(--sf-primary)" />
            </span>
            <strong>{t('messages.noMessages')}</strong>
            <p>{t('messages.startConversation')}</p>
          </div>
        )}
      </div>

      {recording && (
        <div className={styles.recordingBar} role="status">
          <span className={styles.recordingPulse} />
          <strong>{t('messages.recording')}</strong>
          <time className="sf-mono">{formatDuration(seconds)} / 01:00</time>
          <small>{t('messages.maxVoice')}</small>
        </div>
      )}

      <form className={styles.composer} onSubmit={sendText}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          multiple
          hidden
          onChange={attachFiles}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t('messages.attach')}
        >
          <Icon name="attach" size={18} />
        </button>
        <textarea
          rows={1}
          aria-label={t('messages.typeMessage')}
          placeholder={t('messages.typeMessage')}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) sendText(event);
          }}
          disabled={recording}
        />
        {draft.trim() ? (
          <button type="submit" className={styles.sendButton} aria-label={t('messages.send')}>
            <Icon name="send" size={17} />
          </button>
        ) : (
          <button
            type="button"
            className={recording ? styles.recordingButton : styles.micButton}
            onClick={startRecording}
            aria-label={recording ? t('messages.stopRecording') : t('messages.voice')}
          >
            <Icon name={recording ? 'x' : 'mic'} size={17} />
          </button>
        )}
      </form>
    </section>
  );
}

function MessageBubble({ message, thread }) {
  if (message.dir === 'card') {
    return <div className={styles.systemMessage}>{message.taskCard?.title}</div>;
  }
  const outgoing = message.dir === 'out';
  const kind = message.kind ?? 'text';
  return (
    <div className={outgoing ? styles.outgoingRow : styles.incomingRow}>
      {!outgoing && thread.kind !== 'group' && <Avatar name={thread.name} size={26} />}
      <div className={`${styles.bubble} ${outgoing ? styles.outgoing : styles.incoming}`}>
        {kind === 'text' && <div>{message.text}</div>}
        {kind === 'image' && <img src={message.url} alt={message.name} />}
        {kind === 'video' && <video src={message.url} controls preload="metadata" />}
        {kind === 'voice' && (
          <div className={styles.voiceMessage}>
            <span>
              <Icon name="mic" size={16} />
            </span>
            <audio src={message.url} controls preload="metadata" />
            <small className="sf-mono">{formatDuration(message.duration)}</small>
          </div>
        )}
        {kind === 'file' && (
          <div className={styles.fileMessage}>
            <span>
              <Icon name="doc" size={19} />
            </span>
            <div>
              <strong>{message.name}</strong>
              <small>{message.size}</small>
            </div>
          </div>
        )}
        {(kind === 'image' || kind === 'video') && (
          <div className={styles.mediaName}>{message.name}</div>
        )}
        <div className={styles.messageMeta}>
          {message.time}
          {outgoing && message.read ? ' ✓✓' : ''}
        </div>
      </div>
    </div>
  );
}

function ProfilePanel({ thread, messages, t }) {
  const mediaCount = messages.filter((message) =>
    ['image', 'video', 'file', 'voice'].includes(message.kind),
  ).length;
  return (
    <aside className={styles.profilePanel}>
      <ProfileContent thread={thread} mediaCount={mediaCount} t={t} />
    </aside>
  );
}

function ProfileContent({ thread, mediaCount, t }) {
  return (
    <div className={styles.profileContent}>
      <ThreadAvatar thread={thread} size={76} />
      <h2>{thread.name}</h2>
      <p>{thread.profileType || thread.role}</p>
      <Chip tone={thread.online ? 'success' : 'neutral'}>
        {thread.online ? t('messages.online') : t('messages.lastSeen')}
      </Chip>
      {thread.groupName && (
        <div className={styles.profileFact}>
          <Icon name="cohort" size={15} />
          <span>{thread.groupName}</span>
        </div>
      )}
      {thread.memberCount > 0 && (
        <div className={styles.profileFact}>
          <Icon name="users" size={15} />
          <span>
            {thread.memberCount} {t('messages.members')}
          </span>
        </div>
      )}
      <div className={styles.mediaSummary}>
        <span>
          <Icon name="image" size={18} />
        </span>
        <div>
          <strong>{t('messages.sharedMedia')}</strong>
          <small>{mediaCount}</small>
        </div>
      </div>
    </div>
  );
}

function NewChatModal({ open, onClose, contacts, onSelect, t }) {
  const [query, setQuery] = useState('');
  useEffect(() => {
    if (open) setQuery('');
  }, [open]);
  const normalized = query.trim().toLowerCase();
  const filtered = contacts.filter((contact) =>
    `${contact.name} ${contact.role} ${contact.groupName ?? ''}`.toLowerCase().includes(normalized),
  );
  const sections = [
    ['management', filtered.filter((contact) => contact.kind === 'management')],
    ['myGroups', filtered.filter((contact) => contact.kind === 'group')],
    ['students', filtered.filter((contact) => contact.kind === 'student')],
  ];
  return (
    <Modal open={open} onClose={onClose} title={t('messages.newChat')}>
      <div className={styles.contactHint}>
        <Icon name="shield" size={16} />
        <span>{t('messages.eligibleHint')}</span>
      </div>
      <label className={styles.contactSearch}>
        <Icon name="search" size={14} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('messages.contacts')}
          autoFocus
        />
      </label>
      <div className={styles.contactList}>
        {sections.map(
          ([key, items]) =>
            items.length > 0 && (
              <section key={key}>
                <h3>{t(`messages.${key}`)}</h3>
                {items.map((contact) => (
                  <button key={contact.key} type="button" onClick={() => onSelect(contact)}>
                    <ThreadAvatar thread={contact} size={38} />
                    <span>
                      <strong>{contact.name}</strong>
                      <small>
                        {contact.role}
                        {contact.groupName ? ` · ${contact.groupName}` : ''}
                      </small>
                    </span>
                    <Icon name="chevR" size={14} />
                  </button>
                ))}
              </section>
            ),
        )}
        {!filtered.length && <div className={styles.noResults}>{t('messages.noContacts')}</div>}
      </div>
    </Modal>
  );
}

function ProfileModal({ open, onClose, thread, messages, t }) {
  if (!thread) return null;
  const mediaCount = messages.filter((message) =>
    ['image', 'video', 'file', 'voice'].includes(message.kind),
  ).length;
  return (
    <Modal open={open} onClose={onClose} title={t('messages.profile')}>
      <ProfileContent thread={thread} mediaCount={mediaCount} t={t} />
    </Modal>
  );
}

function buildContacts(data, staffThreads, t) {
  const staff = staffThreads
    .filter((thread) => !thread.channel)
    .map((thread) => ({
      key: `staff-${thread.id}`,
      threadId: thread.id,
      name: thread.name,
      role: thread.role,
      kind: 'management',
      online: thread.online,
      profileType: thread.role,
    }));
  const groups = data.cohorts.map((cohort) => ({
    key: `group-${cohort.id}`,
    threadId: `group-${cohort.id}`,
    name: cohort.name,
    role: `${cohort.studentCount ?? 0} ${t('messages.members')}`,
    kind: 'group',
    online: true,
    groupName: cohort.name,
    memberCount: cohort.studentCount ?? 0,
    profileType: t('messages.groupChat'),
  }));
  const seen = new Set();
  const students = data.rosterPairs.flatMap(([cohort, roster]) =>
    (roster ?? []).flatMap((student) => {
      if (seen.has(student.id)) return [];
      seen.add(student.id);
      return [
        {
          key: `student-${student.id}`,
          name: student.name,
          role: t('messages.student'),
          kind: 'student',
          online: false,
          groupName: cohort.name,
          profileType: t('messages.student'),
        },
      ];
    }),
  );
  return [...staff, ...groups, ...students];
}

function formatDuration(seconds = 0) {
  const safe = Math.max(0, Math.min(60, Number(seconds) || 0));
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`;
}

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
