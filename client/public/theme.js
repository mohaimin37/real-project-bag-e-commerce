// Applies the saved theme before first paint to avoid a light/dark flash.
try {
  var t = localStorage.getItem('wt-theme');
  if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme: dark)').matches)) document.documentElement.dataset.theme = 'dark';
  if (localStorage.getItem('wt-contrast') === 'high') document.documentElement.dataset.contrast = 'high';
} catch (e) {}
