'use strict';
// preload.js — レンダラーへ渡す最小限の橋渡し（contextIsolation 有効前提）
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('maid', {
  getState: () => ipcRenderer.invoke('get-state'),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('state-changed', listener);
    return () => ipcRenderer.removeListener('state-changed', listener);
  },
  toggleCheck: (period, itemId) => ipcRenderer.invoke('toggle-check', { period, itemId }),
  adjustResource: (id, delta) => ipcRenderer.invoke('adjust-resource', { id, delta }),
  setAddress: (value) => ipcRenderer.invoke('set-address', value),
  setShowAgent: (value) => ipcRenderer.invoke('set-show-agent', value),
  setCharacter: (value) => ipcRenderer.invoke('set-character', value),
  setNotify: (itemId, value) => ipcRenderer.invoke('set-notify', { itemId, value }),
  setAnchor: (value) => ipcRenderer.invoke('set-anchor', value),
  setDockMode: (mode) => ipcRenderer.invoke('set-dock-mode', mode),
  quitApp: () => ipcRenderer.invoke('quit-app'),
});
