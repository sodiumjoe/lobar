#! /usr/bin/env node

var _ = require('lodash');
var jsome = require('jsome');
var yargs = require('yargs');
var parseJson = require('./lib/parseJson.js');
var parseArgs = require('./lib/parseArgs.js');
var evalUtils = require('./lib/eval.js');

var argv = yargs
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
  .boolean('l')
  .alias('l', 'loose')
  .count('v')
  .alias('v', 'verbose')
  .describe('v', 'verbosity level')
  .boolean('p')
  .alias('p', 'prettyPrint')
  .describe('p', 'pretty print output')
  .help('h')
  .alias('h', 'help')
  .argv;

getInputs(argv, function(err, inputs) {
  'use strict';

  if (err) { return console.error(err); }

  var data;

  try {
    data = parseJson(inputs.jsonString, argv.l);
  } catch(e) {
    console.error('Error: invalid json input');
    console.error(e.stack);
    return yargs.showHelp();
  }

  var args;

  try {
    args = parseArgs(inputs.args, argv.v);
  } catch(e) {
    console.error(e.message);
    return yargs.showHelp();
  }

  var result = evalUtils.chain(data, args, argv.v);

  argv.p ? jsome(result) : console.log(JSON.stringify(result));

});

function getInputs(argv, cb) {
  'use strict';

  try {

    var jsonString = '';

    if (process.stdin.isTTY && !argv.d) {
      yargs.showHelp();
      console.error('Missing required argument: d');
      return process.exit();
    }

    if (process.stdin.isTTY) {
      return cb(null, { jsonString: argv.d, args: argv._ });
    }

    process.stdin.on('data', function(chunk) {
      jsonString += chunk;
    });

    process.stdin.on('end', function() {
      cb(null, { jsonString: jsonString, args: argv._ });
    });

  } catch(e) {
    cb(new Error(e));
  }

}
