import { h, clear, fmtDateTime } from '../ui/dom.js';
import { sectionTitle, statTile, badge } from '../ui/components/misc.js';
import { exportBackupToFile, validateBackup, restoreBackup, getLastBackupAt, isBackupStale } from '../core/backupService.js';
import { readFileAsText } from '../core/importUtils.js';
import { confirmDialog } from '../ui/components/modal.js';
import { reportSuccess, reportError } from '../core/errorHandler.js';
import { isOwner } from '../core/permissions.js';

export async function render(container, ctx) {
  const { user } = ctx;
  clear(container);
  container.appendChild(h('h1', {}, '🗄️ Backup & Restore'));
  container.appendChild(h('p', {}, 'Backup completo do banco de dados local (IndexedDB) em JSON, com restauração por merge ou substituição total.'));

  const lastBackup = await getLastBackupAt();
  const stale = isBackupStale(lastBackup);
  container.appendChild(h('div', { class: 'grid grid-2' }, [
    statTile('Último backup', lastBackup ? fmtDateTime(lastBackup) : 'Nunca'),
    h('div', { class: `card stat-tile` }, [h('div', { class: 'stat-label' }, 'Status'), h('div', {}, stale ? badge('Backup desatualizado (>7 dias)', 'warning') : badge('Em dia', 'success'))]),
  ]));

  container.appendChild(sectionTitle('⬇️ Exportar Backup'));
  container.appendChild(h('div', { class: 'card' }, [
    h('p', {}, 'Gera um arquivo JSON com todos os dados: { schemaVersion, exportedAt, data }.'),
    h('button', { class: 'btn btn-primary', onClick: async () => { await exportBackupToFile(); reportSuccess('Backup exportado.'); location.reload(); } }, 'Exportar backup completo'),
  ]));

  if (isOwner(user)) {
    container.appendChild(sectionTitle('⬆️ Restaurar Backup'));
    const fileInput = h('input', { type: 'file', accept: '.json' });
    const modeSelect = h('select', {}, [h('option', { value: 'MERGE' }, 'Merge (mesclar com dados atuais)'), h('option', { value: 'REPLACE' }, 'Replace (substituir tudo)')]);
    const statusHost = h('div', { style: 'margin-top:10px' });
    container.appendChild(h('div', { class: 'card' }, [
      h('div', { class: 'form-field' }, [h('label', {}, 'Arquivo de backup (.json)'), fileInput]),
      h('div', { class: 'form-field' }, [h('label', {}, 'Modo de restauração'), modeSelect]),
      h('button', { class: 'btn btn-danger', onClick: async () => {
        const file = fileInput.files[0];
        if (!file) return reportError(new Error('Selecione um arquivo.'));
        try {
          const text = await readFileAsText(file);
          const obj = JSON.parse(text);
          const { valid, errors } = validateBackup(obj);
          clear(statusHost);
          if (!valid) { statusHost.appendChild(h('div', { class: 'insight-card CRITICAL' }, errors.join(' '))); return; }
          const ok = await confirmDialog({ message: `Restaurar backup em modo ${modeSelect.value}? ${modeSelect.value === 'REPLACE' ? 'TODOS os dados atuais serão substituídos.' : 'Dados serão mesclados.'}` });
          if (!ok) return;
          const result = await restoreBackup(obj, modeSelect.value);
          reportSuccess(`Backup restaurado (${result.count} registros). Recarregando…`);
          setTimeout(() => location.reload(), 1200);
        } catch (err) {
          reportError(err, 'restore');
        }
      } }, 'Restaurar backup'),
      statusHost,
    ]));
  }
}
