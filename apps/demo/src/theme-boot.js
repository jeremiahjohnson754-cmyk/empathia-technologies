// Applies the remembered theme before first paint (D9: follow the system; a manual Light or Dark choice always wins). A separate file
// because the Content-Security-Policy forbids inline scripts. The choice lives in localStorage['empathia.theme']: 'light' | 'dark' |
// absent (system). The current View-as role is applied too, so the role colour is right on the first frame.
try {
  var t = localStorage.getItem('empathia.theme');
  if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  var r = localStorage.getItem('empathia.demo.perspective');
  if (r && /^[a-z]{2,10}$/.test(r)) document.documentElement.setAttribute('data-role', r);
} catch (e) { /* storage unavailable: the system theme applies */ }
