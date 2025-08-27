// Este archivo es un shim para proporcionar un objeto process en el navegador
window.process = window.process || {
  env: {},
  nextTick: (callback) => setTimeout(callback, 0),
  browser: true,
  version: '',
  versions: {},
  platform: 'browser',
  release: {},
  stdout: {},
  stderr: {},
  cwd: () => '/'
};

export default window.process;
