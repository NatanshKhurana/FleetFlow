// Optional real MongoDB check. Never import env.js or load a private .env file.
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import mongoose from 'mongoose';
import app from '../src/app.js';
import Agent from '../src/models/Agent.js';
import { verifyCrudFlow } from '../test-support/crudFlow.js';

const uri = process.env.FLEETFLOW_TEST_MONGODB_URI?.trim();
if (!uri) {
  console.error('Set FLEETFLOW_TEST_MONGODB_URI privately in the process environment to run the optional CRUD integration check. No .env file is loaded.');
  process.exit(1);
}

const collectionName = `fleetflow_step12_check_${randomUUID().replaceAll('-', '')}`;
const connection = mongoose.createConnection();
const originals = new Map();
let server;
let collectionReady = false;
const timeout = setTimeout(() => {
  console.error(`CRUD integration check timed out. Check for leftover collection ${collectionName}.`);
  process.exit(1);
}, 45000);

try {
  // A separate connection/model prevents initialization of the normal agents collection.
  await connection.openUri(uri, { serverSelectionTimeoutMS: 10000 });
  const TestAgent = connection.model('Step12IntegrationAgent', Agent.schema.clone(), collectionName);
  await TestAgent.init();
  collectionReady = true;
  for (const method of ['init', 'create', 'find', 'countDocuments', 'findById', 'findByIdAndUpdate', 'findByIdAndDelete']) {
    originals.set(method, Agent[method]);
    Agent[method] = (...args) => TestAgent[method](...args);
  }
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  await verifyCrudFlow(`http://127.0.0.1:${server.address().port}`);
  console.log('PASS real MongoDB: all five CRUD endpoints, duplicate/invalid writes, update readback, targeted deletion, and missing records.');
} catch {
  // Assertions and driver errors can contain private details; keep output fixed.
  console.error('CRUD integration check failed. Check the private test URI, network access, and database permissions.');
  process.exitCode = 1;
} finally {
  for (const [method, original] of originals) Agent[method] = original;
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  try {
    // Drop only this run's randomly named collection, including after failed initialization.
    if (connection.readyState === 1 && /^fleetflow_step12_check_[a-f0-9]{32}$/.test(collectionName)) {
      try {
        await connection.dropCollection(collectionName);
        console.log('Disposable CRUD integration collection removed.');
      } catch (error) {
        if (error.code !== 26 || collectionReady) throw error;
      }
    }
  } catch {
    console.error(`CRUD cleanup failed. Check for leftover collection ${collectionName}.`);
    process.exitCode = 1;
  } finally {
    try {
      await connection.close();
    } catch {
      console.error('CRUD integration connection cleanup failed.');
      process.exitCode = 1;
    }
    clearTimeout(timeout);
  }
}
