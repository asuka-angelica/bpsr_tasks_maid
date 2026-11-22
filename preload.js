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
  setVoiceEnabled: (value) => ipcRenderer.invoke('set-voice-enabled', value),
  setShowBubble: (value) => ipcRenderer.invoke('set-show-bubble', value),
  setCharacter: (value) => ipcRenderer.invoke('set-character', value),
  setDisplayFormat: (value) => ipcRenderer.invoke('set-display-format', value),
  setCharacterAddress: (charId, value) => ipcRenderer.invoke('set-character-address', { charId, value }),
  pickFile: (kind) => ipcRenderer.invoke('pick-file', kind),
  registerCharacter: (payload) => ipcRenderer.invoke('register-character', payload),
  exportCharacter: (charId) => ipcRenderer.invoke('export-character', charId),
  importCharacter: () => ipcRenderer.invoke('import-character'),
  deleteCharacter: (charId) => ipcRenderer.invoke('delete-character', charId),
  setNotify: (itemId, value) => ipcRenderer.invoke('set-notify', { itemId, value }),
  setAnchor: (value) => ipcRenderer.invoke('set-anchor', value),
  setDockMode: (mode) => ipcRenderer.invoke('set-dock-mode', mode),
  quitApp: () => ipcRenderer.invoke('quit-app'),
});
