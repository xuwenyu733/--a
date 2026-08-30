const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { clientMessage } = require('../utils/safeError');

describe('safeError.clientMessage', () => {
  let prevEnv;

  beforeEach(() => {
    prevEnv = process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env.NODE_ENV = prevEnv;
  });

  it('returns err.message in development', () => {
    process.env.NODE_ENV = 'development';
    assert.equal(clientMessage(new Error('db down'), '服务器错误'), 'db down');
  });

  it('returns fallback in production', () => {
    process.env.NODE_ENV = 'production';
    assert.equal(clientMessage(new Error('db down'), '服务器错误'), '服务器错误');
  });
});
