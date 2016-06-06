import _, {
  castArray,
  chain,
  includes,
  isFunction,
  isString,
  isUndefined,
  map,
  reduce
} from 'lodash';
import vm from 'vm';

const lodashContext = new vm.createContext(_);

export function evalChain(data, args, verbose) {

  verbose && verbose > 1 && console.log('lodash string:');

  const evaluatedArgs = map(args, ({ method, arg }) => {
    if (includes(['name', 'VERSION', 'arguments', 'apply', 'call'], arg)) {
      return { method, args: castArray(arg) };
    }
    try {
      return { method, args: castArray(evalWith(arg, lodashContext)) };
    } catch(e) {
      return { method, args: castArray(arg) };
    }
  });

  verbose && verbose > 1 && console.log(reduce(evaluatedArgs, (memo, { method, args }) => {
    const argString = map(args, arg => isUndefined(arg)
      ? ''
      : isString(arg)
        ? `"${arg}"`
        : isFunction(arg)
          ? arg.name
          : arg).join(', ');
    return `${memo}.${method}(${argString})`;
  }, '_.chain(data)') + '.value()');

  return reduce(evaluatedArgs, (chainObj, { method, args }) => chainObj[method](...args), chain(data))
  .value();

}

export function evalWith(str, context) {
  const script = new vm.Script(str);
  return script.runInContext(context);
}
