import {
  chain,
  dropRight,
  first,
  forEach,
  includes,
  isArray,
  isPlainObject,
  keys,
  last
} from 'lodash';
import Trie from 'triejs';
import { parse } from 'shell-quote';
import { parseArgs } from '../parseArgs.js';
import { evalChain } from '../eval.js';
import { ARRAY, ARRAY_MATCHES, OBJECT, OBJECT_MATCHES } from './constants.js';

const noCompletions = {
  completions: []
};

export function getCompletions(data, input, pos) {
  const partialInput = input.slice(0, pos);
  const args = parseArgs(parse(partialInput));
  const {
    completions = [],
    completionPos = chain(input)
      .findLastIndex(ch => includes([' ', '.'], ch))
      .thru(i => i === -1 ? 0 : i + 1)
      .value()
  } = getCompletionList(data, args, partialInput);
  const preCompletionInput = input.slice(completionPos, pos);
  return {
    completions: chain(preCompletionInput).concat(completions).uniq().value(),
    completionPos
  };
}

function getCompletionList(data, args, input) {

  const trie = new Trie();

  if (args.length % 2 === 0) {

    // infer possible next method
    if (last(input) === ' ') {
      const result = evalChain(data, args);
      if (isPlainObject(result)) {
        return {
          completions: OBJECT
        };
      }
      if (isArray(result)) {
        return {
          completions: ARRAY
        };
      }
      return noCompletions;
    }

    // infer rest of current arg
    const [currentMethod, currentArg] = args.slice(-2);
    const result = evalChain(data, dropRight(args, 2));
    if (currentMethod === 'get') {
      forEach(keys(result), key => trie.add(key, key));
      const completions = trie.find(currentArg);
      return {
        completions
      };
    }
    if (isArray(result) && includes(ARRAY_MATCHES, currentMethod)) {
      const item = first(result);
      if (isPlainObject(item)) {
        forEach(keys(item), key => trie.add(key, key));
        return {
          completions: trie.find(currentArg)
        };
      }
    }
    if (isPlainObject(result)) {
      if (includes(OBJECT_MATCHES, currentMethod)) {
        forEach(keys(result), key => trie.add(key, key));
        return {
          completions: trie.find(currentArg)
        };
      }
      if (currentMethod === 'mapValues') {
        const firstValue = chain(result).values().first().value();
        forEach(keys(firstValue), key => trie.add(key, key));
        if (isPlainObject(firstValue)) {
          return {
            completions: trie.find(currentArg)
          };
        }
        if (isArray(firstValue)) {
          forEach(ARRAY, key => trie.add(key, key));
          return {
            completions: trie.find(currentArg)
          };
        }
      }
    }
    return noCompletions;
  }

  const result = evalChain(data, dropRight(args));
  const currentMethod = last(args);

  // infer `get` path
  if (last(input) === '.' || (currentMethod === 'get' && last(input) === ' ')) {
    return {
      completions: keys(result),
      completionPos: input.length
    };
  }

  // infer next arg
  if (last(input) === ' ') {
    if (isArray(result) && includes(ARRAY_MATCHES, currentMethod)) {
      const item = first(result);
      if (isPlainObject(item)) {
        return {
          completions: keys(item)
        };
      }
    }
    if (isPlainObject(result)) {
      if (includes(OBJECT_MATCHES, currentMethod)) {
        return {
          completions: keys(result)
        };
      }
      if (currentMethod === 'mapValues') {
        const firstValue = chain(result).values().first().value();
        if (isPlainObject(firstValue)) {
          return {
            completions: keys(firstValue)
          };
        }
        if (isArray(firstValue)) {
          return {
            completions: ARRAY
          };
        }
      }
    }
    return noCompletions;
  }

  // infer rest of method
  if (isPlainObject(result)) {
    forEach(OBJECT, method => trie.add(method, method));
    return { completions: trie.find(last(args)) };
  }
  if (isArray(result)) {
    forEach(ARRAY, method => trie.add(method, method));
    return { completions: trie.find(last(args)) };
  }
  return noCompletions;

}
