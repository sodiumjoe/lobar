#! /usr/bin/env node

var _ = require('lodash');
var jsome = require('jsome');
var yargs = require('yargs');
var argv = yargs
  .env('LOBAR')
  .version()
  .alias('V', 'version')
  .usage('Usage: $0 <JSON> <method> <arg> [method arg, ...] [options]')
  .example('$0 \'["foo"]\' map upperCase', '["FOO"]')
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

  var jsonString = inputs.jsonString;

  var args = parseArgs(inputs.args);

  if (_.isEmpty(args) || args.length % 2 !== 0) {
    console.error('Error: not enough arguments\n');
    return yargs.showHelp();
  }

  argv.v && console.log('arguments:');
  argv.v && console.log(args);

  var data;

  try {
    data = argv.l ? eval( '(' + jsonString + ')' ) : JSON.parse(jsonString);
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
    if ((memo.length % 2 === 0)
        && _[arg]
        && _[arg].length === 1) {
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

function getInputs(argv, cb) {
  'use strict';

  try {

    var jsonString = '';

    if (process.stdin.isTTY) {
      if (!argv.d) {
        yargs.showHelp();
        console.error('Missing required argument: d');
        process.exit();
      }
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

function evalWith(str, context) {
  with(context)
  return eval(str);
}
