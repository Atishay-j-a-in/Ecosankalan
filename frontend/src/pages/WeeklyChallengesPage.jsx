import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/common/Navbar';
import BottomNav from '../components/common/BottomNav';
import { getActiveChallenges } from '../services/api';
import { useLanguage } from '../i18n/LanguageContext';
import '../styles/weekly-challenges.css';

const FILTER_TABS = ['All', 'In Progress', 'Not Started', 'Completed'];

// Map task actions to icons
const ICON_MAP = {
  log_waste:    { icon: 'recycling',       bg: 'var(--secondary-container)',       color: 'var(--on-secondary-container)' },
  rsvp:         { icon: 'event',           bg: 'var(--tertiary-fixed)',            color: 'var(--on-tertiary-fixed-variant)' },
  quiz:         { icon: 'quiz',            bg: 'var(--primary-container)',         color: 'var(--on-primary-container)' },
  default:      { icon: 'emoji_events',   bg: 'var(--surface-container-high)',    color: 'var(--on-surface-variant)' },
};

// Derive user-facing status from challenge progress
const deriveStatus = (challenge) => {
  const prog = challenge.progress;
  if (!prog || !prog.taskProgress) return 'Not Started';
  if (prog.allCompleted) return 'Completed';
  const anyDone = prog.taskProgress.some(t => t.currentCount > 0);
  return anyDone ? 'In Progress' : 'Not Started';
};

// Derive percentage from task progress
const derivePercent = (challenge) => {
  const tasks = challenge.tasks || [];
  const prog = challenge.progress?.taskProgress || [];
  if (!tasks.length) return 0;
  const done = prog.filter(p => p.completed).length;
  return Math.round((done / tasks.length) * 100);
};

// Time left until Sunday 23:59 IST
const timeLeft = (deadline) => {
  if (!deadline) return null;
  const diff = new Date(deadline) - new Date();
  if (diff <= 0) return null;
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ${h % 24}h`;
  return `${h}h`;
};

export default function WeeklyChallengesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [tab, setTab] = useState('All');
  const [actionError, setActionError] = useState('');

  const { data: challenges = [], isLoading: loading, error: queryError } = useQuery({
    queryKey: ['challenges', 'active'],
    queryFn: async () => {
      const res = await getActiveChallenges();
      return res.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const error = actionError || (queryError ? (queryError.message || 'Failed to load challenges') : '');

  const enriched = challenges.map((ch) => ({
    ...ch,
    _status:  deriveStatus(ch),
    _percent: derivePercent(ch),
    _timeLeft: timeLeft(ch.deadline),
  }));

  const visible = tab === 'All'
    ? enriched
    : enriched.filter(c => c._status === tab);

  const buildNavState = (ch) => ({
    challenge: {
      id: ch._id,
      tag: t('home.weeklyMission'),
      title: ch.title,
      subtitle: ch.title,
      desc: ch.description || t('ch.taskDesc', { n: ch.tasks?.length || 0 }),
      progress: ch._percent,
      tasksCompleted: (ch.progress?.taskProgress || []).filter(t => t.completed).length,
      tasksTotal: ch.tasks?.length || 0,
      deadline: ch.deadline,
      reward: { points: ch.rewardPoints || 100, note: t('ch.rewardNote', { p: ch.rewardPoints || 100 }) },
      tasks: (ch.tasks || []).map((t, i) => ({
        id: i,
        label: t.label || t.description || `Task ${i + 1}`,
        done: ch.progress?.taskProgress?.[i]?.completed || false,
        pending: !ch.progress?.taskProgress?.[i]?.completed && (ch.progress?.taskProgress?.[i]?.currentCount || 0) > 0,
      })),
    },
  });

  return (
    <div className="wc-root">
      <Navbar />

      <main className="wc-main">

        {/* ── Header */}
        <div className="wc-header">
          <button className="wc-back-btn" onClick={() => navigate('/dashboard')}>
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <span className="wc-eyebrow">{t('ch.week')}</span>
            <h1 className="wc-title">{t('ch.title')}</h1>
            <p className="wc-subtitle">{t('ch.subtitle')}</p>
          </div>
        </div>

        {/* ── Filter tabs */}
        <div className="wc-tabs">
          {FILTER_TABS.map(tabName => (
            <button
              key={tabName}
              className={`wc-tab${tab === tabName ? ' active' : ''}`}
              onClick={() => setTab(tabName)}
            >
              {{ All: t('ch.tabAll'), 'In Progress': t('home.inProgress'), 'Not Started': t('home.notStarted'), 'Completed': t('ch.completed') }[tabName]}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="wc-empty">
            <span className="material-symbols-outlined wc-empty-icon" style={{ animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p>{t('ch.loading')}</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="wc-empty">
            <span className="material-symbols-outlined wc-empty-icon" style={{ color: 'var(--error)' }}>error</span>
            <p>{error}</p>
          </div>
        )}

        {/* ── Cards grid */}
        <div className="wc-grid">
          {!loading && visible.length === 0 && (
            <div className="wc-empty">
              <span className="material-symbols-outlined wc-empty-icon">inbox</span>
              <p>{t('ch.empty')}</p>
            </div>
          )}

          {visible.map(ch => {
            const iconMeta = ICON_MAP[ch.tasks?.[0]?.action] || ICON_MAP.default;
            const isCompleted = ch._status === 'Completed';
            return (
              <article
                key={ch._id}
                className={`wc-card${isCompleted ? ' completed' : ''}`}
              >
                {isCompleted && <div className="wc-card-completed-bg" />}

                <div className="wc-card-top-row">
                  {/* Icon */}
                  <div className="wc-card-icon-wrap" style={{ background: iconMeta.bg, color: iconMeta.color }}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{iconMeta.icon}</span>
                  </div>

                  {/* Status badge */}
                  {ch._timeLeft ? (
                    <div className="wc-badge timer">
                      <span className="material-symbols-outlined wc-badge-icon" style={{ color: 'var(--tertiary)' }}>timer</span>
                      <span>{t('ch.endsIn', { t: ch._timeLeft })}</span>
                    </div>
                  ) : ch.rewardPoints ? (
                    <div className="wc-badge bonus">
                      <span className="material-symbols-outlined wc-badge-icon">stars</span>
                      <span>{t('ch.pts', { p: ch.rewardPoints })}</span>
                    </div>
                  ) : isCompleted ? (
                    <div className="wc-badge done">
                      <span className="material-symbols-outlined wc-badge-icon">check_circle</span>
                      <span>{t('ch.unlocked')}</span>
                    </div>
                  ) : null}
                </div>

                <h3 className="wc-card-title">{ch.title}</h3>
                <p className="wc-card-desc">{ch.description || t('ch.taskDesc', { n: ch.tasks?.length || 0 })}</p>

                {/* Progress bar */}
                <div className={`wc-progress-wrap${ch._status === 'Not Started' ? ' muted' : ''}`}>
                  <div className="wc-progress-labels">
                    <span className={`wc-progress-status ${ch._status === 'In Progress' ? 'inprogress' : isCompleted ? 'complete' : 'nostart'}`}>
                      {{ All: t('ch.tabAll'), 'In Progress': t('home.inProgress'), 'Not Started': t('home.notStarted'), 'Completed': t('ch.completed') }[ch._status] || ch._status}
                    </span>
                    <span className="wc-progress-pct">{ch._percent}%</span>
                  </div>
                  <div className="wc-progress-bar">
                    <div className="wc-progress-fill" style={{ width: `${ch._percent}%` }} />
                  </div>
                </div>

                {/* CTA */}
                {isCompleted ? (
                  <div className="wc-completed-label">{t('ch.completedLabel')}</div>
                ) : ch._status === 'In Progress' ? (
                  <button className="wc-btn continue"
                    onClick={() => navigate('/challenge-progress', { state: buildNavState(ch) })}>
                    {t('ch.continue')}
                  </button>
                ) : (
                  <button className="wc-btn start"
                    onClick={() => navigate('/challenge-progress', { state: buildNavState(ch) })}>
                    {t('ch.start')}
                  </button>
                )}
              </article>
            );
          })}
        </div>

      </main>

      <BottomNav />
    </div>
  );
}
