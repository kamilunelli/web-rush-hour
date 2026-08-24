// Configuração do browser-sync (servidor + live-reload).
// usePolling: true é ESSENCIAL no Docker/Windows, onde os eventos de
// alteração de arquivo não são propagados para dentro do container.
module.exports = {
  server: "./",
  port: 3000,
  open: false,
  notify: false,
  ui: false,
  files: ["*.html", "src/js/**/*.js", "src/css/output.css"],
  watchOptions: {
    usePolling: true,
    interval: 400,
  },
};
