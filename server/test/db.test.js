import assert from 'node:assert/strict';
import test from 'node:test';
import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/db.js';

const testUri = 'mongodb://127.0.0.1:27017/fleetflow_test';

test('connectDatabase awaits mongoose.connect and returns the connection', async (t) => {
  const connect = t.mock.method(mongoose, 'connect', async (uri, options) => {
    assert.equal(uri, testUri);
    assert.equal(options.serverSelectionTimeoutMS, 30000);
    return mongoose;
  });
  assert.equal(await connectDatabase(testUri), mongoose.connection);
  assert.equal(connect.mock.callCount(), 1);
});

test('an established connection is reused without connecting again', async (t) => {
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 1 });
  t.after(() => { delete mongoose.connection.readyState; });
  const connect = t.mock.method(mongoose, 'connect', async () => mongoose);
  assert.equal(await connectDatabase(testUri), mongoose.connection);
  assert.equal(connect.mock.callCount(), 0);
});

test('an in-progress connection is awaited without opening another connection', async (t) => {
  Object.defineProperty(mongoose.connection, 'readyState', { configurable: true, get: () => 2 });
  t.after(() => { delete mongoose.connection.readyState; });
  const waiting = t.mock.method(mongoose.connection, 'asPromise', async () => mongoose.connection);
  const connect = t.mock.method(mongoose, 'connect', async () => mongoose);
  await connectDatabase(testUri);
  assert.equal(waiting.mock.callCount(), 1);
  assert.equal(connect.mock.callCount(), 0);
});

test('connection failure propagates but logs never contain the driver error', async (t) => {
  const failure = new Error('fake-private-driver-details');
  t.mock.method(mongoose, 'connect', async () => { throw failure; });
  const log = t.mock.method(console, 'error', () => {});
  await assert.rejects(connectDatabase(testUri), (error) => error === failure);
  assert.match(log.mock.calls[0].arguments[0], /MongoDB connection failed/);
  assert.doesNotMatch(JSON.stringify(log.mock.calls), /fake-private-driver-details/);
});

test('runtime connection error events log a safe message', (t) => {
  const log = t.mock.method(console, 'error', () => {});
  mongoose.connection.emit('error', new Error('fake-private-driver-details'));
  assert.match(log.mock.calls[0].arguments[0], /MongoDB connection error/);
  assert.doesNotMatch(JSON.stringify(log.mock.calls), /fake-private-driver-details/);
});

test('disconnectDatabase closes the Mongoose connection', async (t) => {
  const disconnect = t.mock.method(mongoose, 'disconnect', async () => {});
  await disconnectDatabase();
  assert.equal(disconnect.mock.callCount(), 1);
});
