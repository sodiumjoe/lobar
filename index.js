#! /usr/bin/env node

var _ = require('lodash');
var jsome = require('jsome');
var yargs = require('yargs');
var argv = yargs
  .env('LOBAR')
  .version()
  .alias('V', 'version')
  .usage('Usage: $0 <JSON> <method> <arg> [method arg, ...] [options]')
  .example('$0 \'["foo"]\' map upperCase"', 'upperCase array elements')
  .count('v')
  .alias('v', 'verbose')
  .describe('v', 'verbosity level')
  .boolean('p')
  .alias('p', 'prettyPrint')
  .describe('p', 'pretty print output')
  .help('h')
  .alias('h', 'help')
  .argv;

var args = argv['_'];

getInputs(function(err, inputs) {
  'use strict';

  if (err) { return console.error(err); }

  var jsonString = inputs.jsonString || '';
  // argv.p ? jsome(jsonString) : console.log(JSON.stringify(jsonString));

  var args = parseArgs(inputs.args);

  if (_.isEmpty(args) || args.length % 2 !== 0) {
    console.error('Error: not enough arguments\n');
    return yargs.showHelp();
  }

  argv.v && console.log('arguments:');
  argv.v && console.log(args);

  var data;

  try {
    data = JSON.parse(jsonString);
  } catch(e) {
    console.error('Error: invalid json input');
    console.error(e.stack);
    return yargs.showHelp();
  }

  var pairs = makePairs(args);

  argv.v && argv.v > 1 && console.log('lodash string:');
  argv.v && argv.v > 1 && console.log(_.reduce(pairs, function(memo, pair, i) {
    return memo + '.' + pair[0] + '(' + pair[1] + ')';
  }, '_.chain(data)') + '.value()');

  var result = _.reduce(pairs, function(chainObj, pair) {

    var method = pair[0];
    var arg = pair[1];
    var parsedArg;

    try {
      parsedArg = evalWith(arg, _);
    } catch(e) {
      parsedArg = arg;
    }

    return chainObj[method](parsedArg);

  }, _.chain(data)).value();

  argv.p ? jsome(result) : console.log(JSON.stringify(result));

});

function parseArgs(args) {
  return _.reduce(args, function(memo, arg) {
    if (_.head(arg) === '.') {
      return memo.concat(['get', arg.slice(1)]);
    }
    if (_[arg] && _[arg].length === 1) {
      return memo.concat([arg, undefined]);
    }
    return memo.concat(arg);
  }, []);
}

function makePairs(args) {
  return _.reduce(args, function(memo, arg, i) {
    if (i % 2 === 0) {
      return _.assign({}, memo, {
        temp: arg
      });
    }
    return _.assign({}, memo, {
      temp: null,
      memo: memo.memo.concat([[memo.temp, arg]])
    });
  }, {
    temp: null,
    memo: []
  }).memo;
}

function getInputs(cb) {
  'use strict';

  try {

    var jsonString = '';

    if (process.stdin.isTTY) {
      return cb(null, { jsonString: args[0], args: args.slice(1)});
    }

    process.stdin.on('data', function(chunk) {
      jsonString += chunk;
    });

    process.stdin.on('end', function() {
      cb(null, { jsonString: jsonString, args: args.slice(0) });
    });

  } catch(e) {
    cb(new Error(e));
  }

}

function evalWith(str, context) {
  with(context)
  return eval(str);
}
