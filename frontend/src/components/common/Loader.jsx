export default function Loader({ text }) {
  return (
    <div className="vr-loading" role="status" aria-live="polite">
      <span className="material-symbols-outlined log-spin">progress_activity</span>
      <span>{text || 'Loading…'}</span>
    </div>
  );
}
