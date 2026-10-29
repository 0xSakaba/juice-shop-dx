/*
 * Copyright (c) 2014-2026 Bjoern Kimminich & the OWASP Juice Shop contributors.
 * SPDX-License-Identifier: MIT
 */
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { createRequire } = require('node:module')
const { execFileSync } = require('node:child_process')
const expectedSource = 'f189f521266f42c6bd05884468292000cee852ed'
const actualSource = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
const actualTree = execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim()
assert.equal(actualSource, expectedSource)
assert.equal(execFileSync('git', ['diff', '--name-only', 'HEAD'], { encoding: 'utf8' }).trim(), '')
const fromSource = createRequire(path.join(process.cwd(), 'package.json'))
const request = fromSource('supertest')
const { createTestApp } = fromSource('./test/api/helpers/setup.ts')
const { register, login } = fromSource('./test/api/helpers/auth.ts')
const { BasketModel } = fromSource('./models/basket.ts')

test('NEW baseline: f189 cross_user_basket_read with two disposable users', { timeout: 60000 }, async () => {
  const { app, sequelize } = await createTestApp()
  const report = {
    label: 'NEW baseline',
    sourceRepository: 'https://github.com/0xSakaba/juice-shop-dx',
    sourceCommit: actualSource,
    sourceTree: actualTree,
    historicalImageSourceEquivalence: 'UNVERIFIED; not asserted',
    startedAt: new Date().toISOString(),
    setup: [],
    observations: [],
    fixture: [],
    vulnerableReproduced: false,
    patchedHeadTested: false
  }
  const actors = []
  try {
    for (const name of ['a', 'b']) {
      const email = `new-baseline-${name}@example.invalid`
      const password = `Disposable-basket-${name}-20261029!`
      const registration = await register(app, { email, password })
      assert.equal(registration.status, 201)
      const uid = registration.body.data.id
      report.setup.push({ operation: `register-${name.toUpperCase()}`, status: registration.status, userId: uid })
      const auth = await login(app, { email, password })
      assert.ok(auth.token)
      assert.ok(auth.bid)
      const basket = await BasketModel.findByPk(auth.bid)
      assert.equal(basket.UserId, uid)
      const actor = { name: name.toUpperCase(), uid, bid: auth.bid, token: auth.token }
      actors.push(actor)
      report.setup.push({ operation: `login-${actor.name}`, status: 200, userId: uid, basketId: auth.bid })
      report.fixture.push({ actor: actor.name, userId: uid, basketId: auth.bid, emptyBasket: true })
    }
    assert.notEqual(actors[0].uid, actors[1].uid)
    assert.notEqual(actors[0].bid, actors[1].bid)
    const [a, b] = actors
    const cases = [
      ['own-A', a, a], ['own-B', b, b],
      ['cross-A-to-B', a, b], ['cross-B-to-A', b, a],
      ['anonymous-A', null, a], ['anonymous-B', null, b],
      ['invalid-A', 'invalid', a], ['invalid-B', 'invalid', b]
    ]
    for (const [name, actor, target] of cases) {
      const req = request(app).get(`/rest/basket/${target.bid}`)
      if (actor) req.set('Authorization', `Bearer ${actor === 'invalid' ? 'not-a-jwt' : actor.token}`)
      const res = await req
      const data = res.body?.data
      const denied = !actor || actor === 'invalid'
      const matchesTargetFixture = data?.id === target.bid && data?.UserId === target.uid && Array.isArray(data?.Products) && data.Products.length === 0
      report.observations.push({
        case: name, status: res.status,
        actorUserId: actor && actor !== 'invalid' ? actor.uid : null,
        requestedBasketId: target.bid, requestedOwnerId: target.uid,
        matchesTargetFixture,
        responseBody: Object.keys(res.body).length ? res.body : res.text,
        baselineExpectation: denied ? '401 and no basket data' : '200 and matches requested basket owner',
        remediationExpectation: name.startsWith('cross-') ? '401/403/404 and no other-user basket data' : denied ? '401 and no basket data' : '200 and own basket data'
      })
      if (denied) {
        assert.equal(res.status, 401)
        assert.equal(data, undefined)
        assert.ok(!res.text.includes(`"UserId":${target.uid}`))
      } else {
        assert.equal(res.status, 200)
        assert.equal(matchesTargetFixture, true)
      }
    }
    report.vulnerableReproduced = report.observations.filter(o => o.case.startsWith('cross-')).every(o => o.status === 200 && o.matchesTargetFixture)
    assert.equal(report.vulnerableReproduced, true)
    report.totalHttpRequests = report.setup.length + report.observations.length
  } finally {
    report.completedAt = new Date().toISOString()
    fs.writeFileSync(process.env.BASKET_RESULT, JSON.stringify(report, null, 2) + '\n')
    await sequelize.close()
  }
})
