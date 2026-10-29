const { test } = require('node:test')
const assert = require('node:assert/strict')
const net = require('node:net')

test('isolation rejects external connect forms and fetch; listener binds loopback', async () => {
  assert.throws(() => new net.Socket().connect({ host: '198.51.100.1', port: 9 }), /External connection disallowed/)
  assert.throws(() => new net.Socket().connect([{ host: '198.51.100.1', port: 9 }]), /External connection disallowed/)
  assert.throws(() => new net.Socket().connect('/tmp/basket-forbidden-socket'), /External connection disallowed/)
  await assert.rejects(fetch('https://example.invalid'), /Fetch disallowed/)
  const server = net.createServer()
  await new Promise(resolve => server.listen(0, resolve))
  assert.equal(server.address().address, '127.0.0.1')
  await new Promise(resolve => server.close(resolve))
})
