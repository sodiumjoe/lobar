import _, {
  chain,
  head,
  isEmpty,
  reduce
} from 'lodash';

export function parseArgs(args, verbose) {

  const parsed = reduce(args, (memo, arg) => {
    if (head(arg) === '.') {
      if (arg.length === 1) {
        return memo.concat(['get']);
      }
      const path = arg.slice(1).split('.');
      return memo.concat(reduce(path, (memo, p) => memo.concat(isEmpty(p) ? ['get'] : ['get', p]), []));
    }
    if ((memo.length % 2 === 0) && _[arg] && _[arg].length === 1) {
      return memo.concat([arg, undefined]);
    }
    return memo.concat(arg);
  }, []);

  verbose && console.log(`arguments:
${parsed}`);

  return parsed;

}

export function validateArgs(args) {
  const invalidArgs = chain(args)
  .filter((arg, i) => (i + 1) % 2)
  .filter(arg => !_[arg])
  .value();
  if (!isEmpty(invalidArgs)) {
    if (invalidArgs.length === 1) {
      throw new Error(`Error: ${invalidArgs[0]} is not a lodash method`);
    }
    throw new Error(`Error: not lodash methods: ${invalidArgs.join(', ')}`);
  }
  if (isEmpty(args) || args.length % 2 !== 0) {
    throw new Error('Error: not enough arguments');
  }
}
