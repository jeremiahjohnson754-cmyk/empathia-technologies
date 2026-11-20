// Applies the remembered View-as role before first paint, so the role colour is right on the first frame (the theme itself is applied
// by @empathia/design-tokens' theme-init.js). A separate file because the Content-Security-Policy forbids inline scripts.
try {
  var r = localStorage.getItem('empathia.demo.perspective');
  if (r && /^[a-z]{2,10}$/.test(r)) document.documentElement.setAttribute('data-role', r);
} catch (e) { /* storage unavailable: the default role's colour applies */ }
