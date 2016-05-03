#! /usr/bin/env node

import { readFile } from 'fs';
import stringify from 'maquillage';
import yargs from 'yargs';
import parseJson from './parseJson.js';
import parseArgs from './parseArgs.js';
import { evalChain } from './eval.js';
import interactive from './interactive';

const argv = yargs
  .env('LOBAR')
  .version()
  .alias('V', 'version')
  .usage('Usage: $0 <JSON> <method> <arg> [method arg, ...] [options]')
  .example('$0 -d \'["foo"]\' map upperCase', '["FOO"]')
  .example('echo \'{"foo": "bar"}\' | $0 get foo', '"bar"')
  .example('echo \'{"foo": "bar"}\' | $0 .foo', '"bar"')
  .wrap(null)
  .option('d', {
    alias: 'data',
    describe: '<required> input json',
    type: 'string'
  })
  .option('f', {
    alias: 'filename',
    describe: '<required> input json file',
    type: 'string'
  })
  .normalize()
  .boolean('l')
  .alias('l', 'loose')
  .count('v')
  .alias('v', 'verbose')
  .describe('v', 'verbosity level')
  .boolean('p')
  .alias('p', 'prettyPrint')
  .describe('p', 'pretty print output')
  .boolean('i')
  .alias('i', 'interactive')
  .describe('i', 'interactive mode')
  .help('h')
  .alias('h', 'help')
  .argv;

getInputs(argv, (err, inputs) => {

  if (err) { return console.error(err); }

  let data;

  try {
    data = parseJson(inputs.jsonString, argv.l);
  } catch(e) {
    console.error('Error: invalid json input');
    console.error(e.stack);
    return yargs.showHelp();
  }

  if (argv.i) {
    return interactive(data, inputs.args, result => {
      console.log(stringify(result, { colors: argv.p ? undefined : false }));
      process.exit(0);
    });
  }

  let args;

  try {
    args = parseArgs(inputs.args, argv.v);
  } catch(e) {
    console.error(e.message);
    return yargs.showHelp();
  }

  const result = evalChain(data, args, argv.v);

  console.log(stringify(result, { colors: argv.p ? undefined : false }));
  process.exit(0);

});

function getInputs(argv, cb) {

  try {

    let jsonString = '';

    if (process.stdin.isTTY && !argv.d && !argv.f) {
      yargs.showHelp();
      console.error('Missing required argument: d or f');
      return process.exit();
    }

    if (process.stdin.isTTY) {
      if (argv.d) {
        return cb(null, { jsonString: argv.d, args: argv._ });
      }
      return readFile(argv.f, 'utf8', (err, data) => err ? cb(new Error(err)) : cb(null, { jsonString: data, args: argv._ }));
    }

    process.stdin.on('data', chunk => jsonString += chunk);

    process.stdin.on('end', () => cb(null, { jsonString, args: argv._ }));

  } catch(e) {
    cb(new Error(e));
  }

}
