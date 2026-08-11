import { registerSeeder } from './seedData.js';
import { createTask } from '../tasks.js';
import { notify, SEVERITY } from '../notifications.js';

// Cross-cutting demo data that doesn't belong to a single domain module:
// tasks spread across modules (so Command Center / Tasks / Family Load /
// Chief of Staff all have something to analyze) and a couple of seed
// notifications so the Notification Center isn't empty on first login.
registerSeeder(async ({ dielly, esposa }) => {
  const today = new Date().toISOString().slice(0, 10);
  const future = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

  const tasks = [
    { title: 'Preparar apresentação trimestral (DEMO)', module: 'work', priority: 'HIGH', owner: dielly.id, dueDate: today },
    { title: 'Revisar findings de segurança (DEMO)', module: 'work', priority: 'CRITICAL', owner: dielly.id, dueDate: future(-1) },
    { title: 'Levar Sofia ao dentista (DEMO)', module: 'family', priority: 'MEDIUM', owner: esposa.id, dueDate: future(2) },
    { title: 'Organizar culto de jovens (DEMO)', module: 'church', priority: 'MEDIUM', owner: dielly.id, dueDate: future(3) },
    { title: 'Estudar para certificação AWS (DEMO)', module: 'studies', priority: 'HIGH', owner: dielly.id, dueDate: future(10) },
    { title: 'Praticar inglês técnico (DEMO)', module: 'english', priority: 'MEDIUM', owner: dielly.id, dueDate: today },
    { title: 'Revisar orçamento de viagem (DEMO)', module: 'hobbies', priority: 'LOW', owner: esposa.id, dueDate: future(5) },
    { title: 'Atualizar currículo (DEMO)', module: 'career', priority: 'MEDIUM', owner: dielly.id, dueDate: future(7) },
  ];
  for (const t of tasks) await createTask({ ...t, status: 'TODO', source: 'DEMO_SEED' });
  await createTask({ title: 'Fechar relatório mensal financeiro (DEMO)', module: 'finance', priority: 'MEDIUM', owner: dielly.id, dueDate: future(-3), status: 'DONE', source: 'DEMO_SEED' });

  await notify({ userId: 'ALL', module: 'system', severity: SEVERITY.INFO, title: 'Bem-vindo(a) ao Dielly OS', message: 'Este é um ambiente com dados de demonstração (DEMO). Explore os módulos no menu lateral.' });
  await notify({ userId: dielly.id, module: 'work', severity: SEVERITY.WARNING, title: 'Ticket de segurança em atraso (DEMO)', message: 'SEC-4821 está vencido desde ontem.' });
});
