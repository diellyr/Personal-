import { h, clear, fmtDateTime } from '../ui/dom.js';
import { sectionTitle, statTile, badge } from '../ui/components/misc.js';
import { exportBackupToFile, validateBackup, restoreBackup, getLastBackupAt, isBackupStale } from '../core/backupService.js';
import { readFileAsText } from '../core/importUtils.js';
import { confirmDialog } from '../ui/components/modal.js';
import { reportSuccess, reportError } from '../core/errorHandler.js';
import { isOwner } from '../core/permissions.js';
import { deleteAllDemoData, reseedDemoData } from '../core/demoDataService.js';

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
    container.appendChild(sectionTitle('🧪 Dados Demo'));
    const demoStatusHost = h('div', { style: 'margin-top:10px' });
    container.appendChild(h('div', { class: 'card' }, [
      h('p', {}, 'Dados fictícios (marcados internamente como DEMO_SEED) usados para explorar o app. Editar um registro demo pelo formulário normal o transforma em dado real — ele deixa de ser afetado por estes botões.'),
      h('div', { class: 'flex gap-8' }, [
        h('button', { class: 'btn btn-primary', onClick: async () => {
          const ok = await confirmDialog({
            danger: false,
            message: 'Carregar dados demo? Isso remove qualquer dado demo existente (evitando duplicados) e recria um conjunto completo e consistente de exemplos em todos os módulos. Seus dados reais não são afetados.',
            confirmLabel: 'Carregar dados demo',
          });
          if (!ok) return;
          clear(demoStatusHost);
          demoStatusHost.appendChild(h('div', { class: 'muted' }, 'Carregando…'));
          try {
            await reseedDemoData();
            reportSuccess('Dados demo carregados. Recarregando…');
            setTimeout(() => location.reload(), 1000);
          } catch (err) {
            reportError(err, 'demo-data');
          }
        } }, '⬇️ Carregar dados demo'),
        h('button', { class: 'btn btn-danger', onClick: async () => {
          const ok = await confirmDialog({
            message: 'Excluir todos os dados demo? Esta ação é permanente (não é soft delete). Seus dados reais (tudo que você criou ou editou manualmente) não são afetados.',
            confirmLabel: 'Excluir dados demo',
          });
          if (!ok) return;
          clear(demoStatusHost);
          demoStatusHost.appendChild(h('div', { class: 'muted' }, 'Excluindo…'));
          try {
            const count = await deleteAllDemoData();
            reportSuccess(`${count} registro(s) demo excluído(s). Recarregando…`);
            setTimeout(() => location.reload(), 1000);
          } catch (err) {
            reportError(err, 'demo-data');
          }
        } }, '🗑️ Excluir dados demo'),
      ]),
      demoStatusHost,
    ]));

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
