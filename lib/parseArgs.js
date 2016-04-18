var _ = require('lodash');

module.exports = function parseArgs(args, verbose) {

  var parsed = _.reduce(args, function(memo, arg) {
    if (_.head(arg) === '.') {
      return memo.concat(['get', arg.slice(1)]);
    }
    if (memo.length % 2 === 0 && !_[arg]) {
      throw new Error('Error: ' + arg + ' is not a lodash method');
    }
    if ((memo.length % 2 === 0) && _[arg].length === 1) {
      return memo.concat([arg, undefined]);
    }
    return memo.concat(arg);
  }, []);

  if (_.isEmpty(parsed) || parsed.length % 2 !== 0) {
    throw new Error('Error: not enough arguments');
  }

  verbose && console.log('arguments:');
  verbose && console.log(parsed);

  return parsed;

};
