// Tiny flag consulted by BaseRepository/notifications/tasks while a demo-data
// seed pass is running, so every record created during that pass gets tagged
// `source: 'DEMO_SEED'` automatically — without every one of the ~20 module
// seeders having to remember to pass it explicitly. This is what lets
// Backup & Restore's "Excluir dados demo" find (and only find) seeded rows.
let seeding = false;

export function isSeeding() {
  return seeding;
}

export function setSeeding(value) {
  seeding = value;
}
