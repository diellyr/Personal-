// Mobile off-canvas sidebar toggle. The sidebar/backdrop elements are static
// (declared once in index.html / rendered once by sidebar.js), so this just
// flips classes — safe to call on desktop too since the CSS that reacts to
// `.open` only exists inside the mobile media query.
export function openSidebar() {
  document.getElementById('sidebar')?.classList.add('open');
  document.getElementById('sidebar-backdrop')?.classList.add('open');
}

export function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-backdrop')?.classList.remove('open');
}

export function toggleSidebar() {
  const el = document.getElementById('sidebar');
  if (el?.classList.contains('open')) closeSidebar();
  else openSidebar();
}

export function initSidebarToggle() {
  document.getElementById('sidebar-backdrop')?.addEventListener('click', closeSidebar);
}
