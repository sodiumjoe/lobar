import _, {
  assign,
  chain,
  includes,
  isNull,
  reduce
} from 'lodash';
import vm from 'vm';

const lodashContext = new vm.createContext(_);

export function evalChain(data, args, verbose) {

  const pairs = makePairs(args);

  verbose && verbose > 1 && console.log('lodash string:');
  verbose && verbose > 1 && console.log(reduce(pairs, (memo, [method, arg]) => {
    return `${memo}.${method}(${arg})`;
  }, '_.chain(data)') + '.value()');

  return reduce(pairs, (chainObj, [method, arg]) => {

    if (includes(['name', 'VERSION', 'arguments', 'apply', 'call'], arg)) {
      return chainObj[method](arg);
    }

    try {
      const evaluatedArg = evalWith(arg, lodashContext);
      return chainObj[method](evaluatedArg);
    } catch(e) {
      return chainObj[method](arg);
    }


  }, chain(data)).value();

}

export function evalWith(str, context) {
  const script = new vm.Script(str);
  return script.runInContext(context);
}

function makePairs(args) {
  return reduce(args, (memo, arg) => {
    if (isNull(memo.method)) {
      return assign(memo, { method: arg });
    }
    return assign(memo, {
      pairs: memo.pairs.concat([[memo.method, arg]]),
      method: null
    });
  }, {
    method: null,
    pairs: []
  }).pairs;
}
