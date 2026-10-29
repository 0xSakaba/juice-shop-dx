const Module = require('node:module')
const net = require('node:net')
const fs = require('node:fs')

const receipt = { startupSeamLoads: 0, blockedConnections: 0, forcedLoopbackListeners: 0, allowedConnectionHosts: {} }
const originalLoad = Module._load
Module._load = function (name, parent, isMain) {
  const loaded = originalLoad.apply(this, arguments)
  if (name.includes('validatePreconditions') && parent?.filename.startsWith(process.cwd() + require('node:path').sep)) {
    receipt.startupSeamLoads++
    return { ...loaded, __esModule: true, default: async () => true, preconditionsReady: Promise.resolve() }
  }
  return loaded
}

const originalListen = net.Server.prototype.listen
net.Server.prototype.listen = function (...args) {
  if (typeof args[0] === 'number') {
    const callback = args.find(value => typeof value === 'function')
    args = [args[0], '127.0.0.1', ...(callback ? [callback] : [])]
  } else if (args[0] && typeof args[0] === 'object') {
    if (args[0].path) throw new Error('Unix listeners disallowed in isolated API fixture')
    args[0] = { ...args[0], host: '127.0.0.1' }
  } else throw new Error('Unexpected listener in isolated API fixture')
  receipt.forcedLoopbackListeners++
  return originalListen.apply(this, args)
}

const originalConnect = net.Socket.prototype.connect
net.Socket.prototype.connect = function (...args) {
  const input = Array.isArray(args[0]) ? args[0] : args
  const options = typeof input[0] === 'object' ? input[0] : typeof input[0] === 'string' ? { path: input[0] } : { host: typeof input[1] === 'string' ? input[1] : 'localhost' }
  const host = options.host ?? options.hostname ?? 'localhost'
  if (options.path || !['localhost', '127.0.0.1', '::1'].includes(host)) {
    receipt.blockedConnections++
    throw new Error('External connection disallowed in isolated API fixture')
  }
  receipt.allowedConnectionHosts[host] = (receipt.allowedConnectionHosts[host] ?? 0) + 1
  return originalConnect.apply(this, args)
}
globalThis.fetch = async () => {
  receipt.blockedConnections++
  throw new Error('Fetch disallowed in isolated API fixture')
}
process.on('exit', () => {
  if (process.env.BASKET_ISOLATION_RECEIPT && receipt.startupSeamLoads > 0) fs.writeFileSync(process.env.BASKET_ISOLATION_RECEIPT, JSON.stringify(receipt, null, 2) + '\n')
})
