#! /usr/bin/env node

var _ = require('lodash');
var jsome = require('jsome');
var yargs = require('yargs');
var argv = yargs
  .env('LOBAR')
  .usage('Usage: $0 <JSON> <method> <arg> [method arg, ...] [options]')
  .example('$0 "[\'foo\']" map upperCase"', 'upperCase array elements')
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

  var args = _.reduce(inputs.args, function(memo, arg) {
    if (_.head(arg) === '.') {
      return memo.concat(['get', arg.slice(1)]);
    }
    if (_.last(arg) === '.') {
      return memo.concat([arg.slice(0, -1), undefined]);
    }
    return memo.concat(arg);
  }, []);

  if (args.length % 2 !== 0 || _.isEmpty(args)) {
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

  var pairs = _.reduce(args, function(memo, arg, i) {
    if (i % 2 === 0) {
      return memo.concat([[arg]]);
    }
    _.last(memo).push(arg);
    return memo;
  }, []);

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
