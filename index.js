#! /usr/bin/env node

var _ = require('lodash');
var jsome = require('jsome');
var argv = require('yargs')
    .usage('Usage: $0 <input JSON string> <operators> [options]')
    .example('$0 "[\'foo\']" ".map(upperCase)"', 'upperCase array elements')
    .boolean('v')
    .alias('v', 'verbose')
    .boolean('p')
    .alias('v', 'prettyPrint')
    .help('h')
    .alias('h', 'help')
    .check(function(argv) {
      if (process.stdin.isTTY && argv._.length < 2) {
        throw new Error('not enough arguments');
      }
      if (!process.stdin.isTTY && _.isEmpty(argv._)) {
        throw new Error('not enough arguments');
      }
      return true;
    })
    .argv;

var args = argv['_'];

getInputs(function(err, inputs) {
  'use strict';
  if (err) { return console.error(err); }
  var jsonString = inputs.jsonString || '';
  argv.v && console.log('input JSON: ' + jsonString);
  var operators = inputs.operators || '';
  argv.v && console.log('operators: ' + operators);
  var evalStr = '_.chain(' + jsonString.trim() + ')' + operators + '.value()';
  argv.v && console.log('string to eval: ' + evalStr);
  var result = evalWith(evalStr);
  argv.v && console.log('result: ');
  argv.p ? jsome(result) : console.log(JSON.stringify(result));
});

function getInputs(cb) {
  'use strict';

  try {

    var jsonString = '';
    var operators = '';

    if (process.stdin.isTTY) {
      jsonString = args[0];
      operators = args[1];
      return cb(null, { jsonString: jsonString, operators: operators });
    }

    process.stdin.on('data', function(chunk) {
      jsonString += chunk;
    });

    operators = args[0];

    process.stdin.on('end', function() {
      cb(null, { jsonString: jsonString, operators: operators });
    });

  } catch(e) {
    cb(new Error(e));
  }

}

function evalWith(str) {
  with(_)
  return eval(str);
}
