var _ = require('lodash');
var vm = require('vm');

var lodashContext = new vm.createContext(_);
var emptyContext = new vm.createContext({});

module.exports = {

  evalChain: function evalChain(data, args, verbose) {

    var pairs = makePairs(args);

    verbose && verbose > 1 && console.log('lodash string:');
    verbose && verbose > 1 && console.log(_.reduce(pairs, function(memo, pair, i) {
      return memo + '.' + pair[0] + '(' + pair[1] + ')';
    }, '_.chain(data)') + '.value()');

    return _.reduce(pairs, function(chainObj, pair) {

      var method = pair[0];
      var arg = pair[1];
      var parsedArg;

      try {
        parsedArg = evalWith(arg, lodashContext);
      } catch(e) {
        parsedArg = arg;
      }

      return chainObj[method](parsedArg);

    }, _.chain(data)).value();

  },

  evalWith: function evalWith(str, context) {
    var script = new vm.Script(str);
    return script.runInContext(context);
  }
};

function makePairs(args) {
  return _.reduce(args, function(memo, arg) {
    if (_.isNull(memo.method)) {
      return _.assign({}, memo, {
        method: arg
      });
    }
    return _.assign({}, memo, {
      pairs: memo.pairs.concat([[memo.method, arg]]),
      method: null
    });
  }, {
    method: null,
    pairs: []
  }).pairs;
}
