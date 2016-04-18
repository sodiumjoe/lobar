import _, {
  assign,
  chain,
  isNull,
  reduce
} from 'lodash';
import vm from 'vm';

const lodashContext = new vm.createContext(_);

export function evalChain(data, args, verbose) {

  const pairs = makePairs(args);

  verbose && verbose > 1 && console.log('lodash string:');
  verbose && verbose > 1 && console.log(reduce(pairs, function(memo, pair) {
    return memo + '.' + pair[0] + '(' + pair[1] + ')';
  }, '_.chain(data)') + '.value()');

  return reduce(pairs, (chainObj, [method, arg]) => {

    let parsedArg;

    try {
      parsedArg = evalWith(arg, lodashContext);
    } catch(e) {
      parsedArg = arg;
    }

    return chainObj[method](parsedArg);

  }, chain(data)).value();

}

export function evalWith(str, context) {
  const script = new vm.Script(str);
  return script.runInContext(context);
}

function makePairs(args) {
  return reduce(args, (memo, arg) => {
    if (isNull(memo.method)) {
      return assign({}, memo, { method: arg });
    }
    return assign({}, memo, {
      pairs: memo.pairs.concat([[memo.method, arg]]),
      method: null
    });
  }, {
    method: null,
    pairs: []
  }).pairs;
}
