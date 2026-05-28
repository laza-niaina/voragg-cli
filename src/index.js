#!/usr/bin/env node

import { AnimeDL } from './cli.js';

async function main() {
  const app = new AnimeDL();
  try {
    await app.run(process.argv);
  } catch (err) {
    console.error(`Fatal error: ${err.message}`);
    process.exit(1);
  }
}

main();
