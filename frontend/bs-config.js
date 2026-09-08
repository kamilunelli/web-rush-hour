// browser-sync: servidor + live-reload.
// usePolling é essencial no Docker/Windows (eventos de arquivo não propagam).
module.exports = {
  server: "./",
  port: 3000,
  open: false,
  notify: false,
  ui: false,
  files: ["*.html", "src/js/**/*.js", "src/css/output.css"],
  watchOptions: { usePolling: true, interval: 400 },
};
