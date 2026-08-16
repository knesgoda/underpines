import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Trash2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { currentBuildId, fetchLatestBuildId, isNewBuild } from '@/lib/buildVersion';
import { FORCE_REFRESH_VERSION, readForceRefreshReport, type ForceRefreshReport } from '@/lib/forceRefresh';
import { readWorkerReport, purgeCachesAndWorkers, type WorkerReport } from '@/lib/swDiagnostics';
import { readClientLog, clearClientLog, formatClientLog, logClientEvent, type ClientLogEntry } from '@/lib/clientLog';

/**
 * "Is this browser running the build I just published?"
 *
 * Everything here is read from the browser itself — no network calls beyond
 * one uncached fetch of index.html — so it works even when someone is stuck on
 * an old shell and cannot be trusted to describe what they see.
 */
const Diagnostics = () => {
  const navigate = useNavigate();
  const [worker, setWorker] = useState<WorkerReport | null>(null);
  const [report, setReport] = useState<ForceRefreshReport | null>(null);
  const [log, setLog] = useState<ClientLogEntry[]>([]);
  const [latest, setLatest] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [busy, setBusy] = useState(false);

  const build = currentBuildId();

  const refresh = useCallback(async () => {
    setWorker(await readWorkerReport());
    setReport(readForceRefreshReport());
    setLog(readClientLog().slice().reverse());
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const checkForUpdate = async () => {
    setChecking(true);
    const next = await fetchLatestBuildId();
    setLatest(next);
    logClientEvent(
      'diagnostics',
      next ? `server build is ${next}${isNewBuild(build, next) ? ' (newer than this tab)' : ' (same as this tab)'}` : 'could not read the server build',
      next ? 'info' : 'warn',
    );
    setChecking(false);
    void refresh();
  };

  const purge = async () => {
    setBusy(true);
    const result = await purgeCachesAndWorkers();
    setBusy(false);
    await refresh();
    toast[result.ok ? 'success' : 'error'](
      result.ok
        ? `Cleared ${result.cachesDeleted} cache${result.cachesDeleted === 1 ? '' : 's'} and ${result.workersUnregistered} worker${result.workersUnregistered === 1 ? '' : 's'}.`
        : 'Some caches could not be cleared. The log has the details.',
    );
  };

  const copyLog = async () => {
    try {
      await navigator.clipboard.writeText(formatClientLog(log.slice().reverse()));
      toast.success('Log copied.');
    } catch {
      toast.error('Could not copy the log.');
    }
  };

  const updateAvailable = isNewBuild(build, latest);

  return (
    <div className="diag-page">
      <button type="button" className="diag-back" onClick={() => navigate('/settings')}>
        <ArrowLeft size={15} aria-hidden="true" />
        Back to settings
      </button>

      <h1 className="diag-title">Troubleshooting</h1>
      <p className="diag-lede">
        What this browser is actually running, and whether the last cleanup worked.
      </p>

      <section className="panel diag-section">
        <h2 className="diag-heading">This build</h2>
        <dl className="diag-list">
          <div><dt>Running</dt><dd>{build ?? 'development build'}</dd></div>
          <div><dt>On the server</dt><dd>{latest ?? 'not checked yet'}</dd></div>
          <div>
            <dt>Status</dt>
            <dd>{latest ? (updateAvailable ? 'A newer version is available — reload to pick it up.' : 'Up to date.') : '—'}</dd>
          </div>
        </dl>
        <div className="diag-actions">
          <button type="button" className="diag-btn" onClick={checkForUpdate} disabled={checking}>
            <RefreshCw size={13} aria-hidden="true" />
            {checking ? 'Checking…' : 'Check for a new version'}
          </button>
          {updateAvailable && (
            <button type="button" className="diag-btn is-primary" onClick={() => window.location.reload()}>
              Reload now
            </button>
          )}
        </div>
      </section>

      <section className="panel diag-section">
        <h2 className="diag-heading">Service worker</h2>
        {!worker ? (
          <p className="diag-note">Reading…</p>
        ) : !worker.supported ? (
          <p className="diag-note">This browser has no service worker support — nothing can go stale here.</p>
        ) : worker.registrations.length === 0 ? (
          <p className="diag-note">
            None registered. That is the expected state: offline caching is retired, so every
            publish arrives on a normal reload.
          </p>
        ) : (
          <ul className="diag-rows">
            {worker.registrations.map(reg => (
              <li key={reg.scope + (reg.scriptUrl ?? '')}>
                <span className="diag-row-main">{reg.scriptUrl ?? 'unknown script'}</span>
                <span className="diag-row-meta">
                  {reg.state}
                  {reg.controllingThisPage ? ' · controlling this page' : ' · not controlling'}
                  {' · scope '}
                  {reg.scope}
                </span>
              </li>
            ))}
          </ul>
        )}

        <h3 className="diag-subheading">Stored caches</h3>
        {worker && worker.cacheNames.length > 0 ? (
          <ul className="diag-rows">
            {worker.cacheNames.map(name => (
              <li key={name}><span className="diag-row-main">{name}</span></li>
            ))}
          </ul>
        ) : (
          <p className="diag-note">No cache buckets stored.</p>
        )}

        <div className="diag-actions">
          <button type="button" className="diag-btn" onClick={purge} disabled={busy}>
            <Trash2 size={13} aria-hidden="true" />
            {busy ? 'Clearing…' : 'Clear caches and workers'}
          </button>
        </div>
      </section>

      <section className="panel diag-section">
        <h2 className="diag-heading">Last automatic cleanup</h2>
        <dl className="diag-list">
          <div><dt>Cleanup version</dt><dd>{FORCE_REFRESH_VERSION}</dd></div>
          {report ? (
            <>
              <div><dt>Ran</dt><dd>{new Date(report.startedAt).toLocaleString()} (for {report.version})</dd></div>
              <div>
                <dt>Purge</dt>
                <dd>
                  {report.cachesFailed || report.workersFailed ? 'Partly failed — ' : 'Succeeded — '}
                  {report.cachesDeleted} cache(s) deleted, {report.workersUnregistered} worker(s) unregistered
                  {report.cachesFailed || report.workersFailed
                    ? `, ${report.cachesFailed} cache and ${report.workersFailed} worker failure(s)`
                    : ''}
                </dd>
              </div>
              <div>
                <dt>Reload</dt>
                <dd>{report.reloadedAt ? `Succeeded ${new Date(report.reloadedAt).toLocaleString()}` : 'Not confirmed yet'}</dd>
              </div>
            </>
          ) : (
            <div><dt>Ran</dt><dd>Never on this browser.</dd></div>
          )}
        </dl>
      </section>

      <section className="panel diag-section">
        <h2 className="diag-heading">Event log</h2>
        {log.length === 0 ? (
          <p className="diag-note">Nothing recorded yet.</p>
        ) : (
          <ul className="diag-log">
            {log.map((entry, i) => (
              <li key={`${entry.at}-${i}`} data-level={entry.level}>
                <span className="diag-log-time">{new Date(entry.at).toLocaleString()}</span>
                <span className="diag-log-scope">{entry.scope}</span>
                <span className="diag-log-msg">{entry.message}</span>
              </li>
            ))}
          </ul>
        )}
        <div className="diag-actions">
          <button type="button" className="diag-btn" onClick={copyLog} disabled={log.length === 0}>
            <Copy size={13} aria-hidden="true" />
            Copy log
          </button>
          <button
            type="button"
            className="diag-btn"
            onClick={() => { clearClientLog(); setLog([]); }}
            disabled={log.length === 0}
          >
            Clear log
          </button>
        </div>
      </section>
    </div>
  );
};

export default Diagnostics;
