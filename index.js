#! /usr/bin/env node

const _ = require('lodash');
const argv = require('yargs')
    .usage('Usage: $0 <input JSON string> <operators> [options]')
    .example('$0 "[\'foo\']" ".map(upperCase)"', 'upperCase array elements')
    .boolean('v')
    .alias('v', 'verbose')
    .boolean('p')
    .alias('v', 'prettyPrint')
    .help('h')
    .alias('h', 'help')
    .check(argv => {
      if (process.stdin.isTTY && argv._.length < 2) {
        throw new Error('not enough arguments');
      }
      if (!process.stdin.isTTY && _.isEmpty(argv._)) {
        throw new Error('not enough arguments');
      }
      return true;
    })
    .argv;

const args = argv['_'];

getInputs().then(inputs => {
  'use strict';
  const jsonString = inputs.jsonString || '';
  argv.v && console.log('input JSON: ' + jsonString);
  const operators = inputs.operators || '';
  argv.v && console.log('operators: ' + operators);
  const evalStr = '_.chain(' + jsonString.trim() + ')' + operators + '.value()';
  argv.v && console.log('string to eval: ' + evalStr);
  const result = evalWith(evalStr);
  const output = JSON.stringify(result, null, argv.p ? 2 : 0)
  argv.v && console.log('result: ');
  console.log(output);
}).catch(console.error.bind(console));

function getInputs() {
  'use strict';

  return new Promise((resolve, reject) => {

    try {

      let jsonString = '';
      let operators = '';

      if (process.stdin.isTTY) {
        jsonString = args[0];
        operators = args[1];
        return resolve({ jsonString: jsonString, operators: operators });
      }

      process.stdin.on('data', chunk => {
        jsonString += chunk;
      });

      operators = args[0];

      process.stdin.on('end', () => {
        resolve({ jsonString: jsonString, operators: operators });
      });

    } catch(e) {
      reject(new Error(e));
    }

  });

}

function evalWith(str) {
  with(_)
  return eval(str);
}
