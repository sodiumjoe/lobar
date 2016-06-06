import _, {
  chain,
  dropRight,
  has,
  head,
  isEmpty,
  last,
  map,
  reduce
} from 'lodash';
import { stripIndent } from 'common-tags';

export function parseArgs(args, verbose) {

  const parsed = reduce(args, (memo, arg) => {
    if (head(arg) === '.') {
      const path = arg.slice(1).split('.');
      return memo.concat(map(path, p => ({ method: 'get', arg: p })));
    }
    const previous = last(memo);
    const { method } = previous;
    if (!has(previous, 'arg')) {
      return dropRight(memo).concat({ method, arg });
    }
    return memo.concat((_[arg] && _[arg].length === 1)
      ? { method: arg, arg: undefined }
      : { method: arg }
    );
  }, []);

  verbose && console.log(stripIndent`
    arguments:
    ${JSON.stringify(parsed)}`
  );

  return parsed;

}

export function validateArgs(args) {
  const invalidArgs = chain(args)
  .map('method')
  .filter(method => !_[method])
  .value();
  if (!isEmpty(invalidArgs)) {
    if (invalidArgs.length === 1) {
      throw new Error(`Error: ${invalidArgs[0]} is not a lodash method`);
    }
    throw new Error(`Error: not lodash methods: ${invalidArgs.join(', ')}`);
  }
}
