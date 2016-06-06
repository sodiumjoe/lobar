import _, {
  assign,
  chain,
  dropRight,
  first,
  forEach,
  includes,
  isArray,
  isEmpty,
  isPlainObject,
  keys,
  last
} from 'lodash';
import Trie from 'triejs';
import { parse } from 'shell-quote';
import { parseArgs } from '../parseArgs.js';
import { evalChain } from '../eval.js';
import { ARRAY, ARRAY_MATCHES, OBJECT, OBJECT_MATCHES } from './constants.js';

export function getCompletions(data, input, pos) {
  const partialInput = input.slice(0, pos);
  const args = parseArgs(parse(partialInput));
  const defaultCompletionPos = chain(partialInput)
    .findLastIndex(ch => includes([' ', '.'], ch))
    .thru(i => i === -1 ? 0 : i + 1)
    .value();

  try {
    const {
      completions = [],
      completionPos = defaultCompletionPos
    } = getCompletionList(data, args, partialInput);
    const preCompletionInput = input.slice(completionPos, pos);
    return {
      completions: chain([preCompletionInput]).concat(completions).uniq().value(),
      completionPos
    };
  } catch(e) {
    const preCompletionInput = input.slice(defaultCompletionPos, pos);
    return {
      completions: [preCompletionInput],
      completionPos: defaultCompletionPos
    };
  }
}

function getCompletionList(data, args, input) {

  const { method, arg } = last(args);

  if (last(input) === '.') {
    return {
      completionPos: input.length,
      completions: inferArg(data, dropRight(args), method)
    };
  }

  if (last(input) === ' ') {

    // single arg method
    if (_[method].length === 1) {
      return { completions: inferMethod(data, args) };
    }

    // complete method/arg pair
    if (!isEmpty(arg)) {
      return { completions: inferMethod(data, args) };
    }

    // incomplete method/arg pair
    if (isEmpty(arg)) {
      return { completions: inferArg(data, dropRight(args), method) };
    }

  }

  // mid-method
  // infer rest of method
  if (isEmpty(arg)) {
    return { completions: inferMethod(data, dropRight(args), method) };
  }

  // mid-arg
  // infer rest of arg
  return { completions: inferArg(data, dropRight(args), method, arg) };

}

function inferMethod(data, args, methodFragment) {
  const result = evalChain(data, args);
  const completions = isPlainObject(result)
    ? OBJECT
    : isArray(result)
      ? ARRAY
      : [];
  if (!methodFragment) {
    return completions;
  }
  const trie = new Trie();
  forEach(completions, method => trie.add(method, method));
  return trie.find(methodFragment);
}

function inferArg(data, args, method, argFragment) {
  const result = evalChain(data, args);
  const completions = getArgCompletions(result, method);
  if (!argFragment) {
    return completions;
  }
  const trie = new Trie();
  forEach(completions, arg => trie.add(arg, arg));
  return trie.find(argFragment);
}

function getArgCompletions(result, method) {
  if (
    isArray(result)
    && includes(ARRAY_MATCHES, method)
    && isPlainObject(first(result))
  ) {
    return chain(result).flatMap(keys).uniq().value();
  }
  if (isPlainObject(result)) {
    if (includes(OBJECT_MATCHES.concat('get'), method)) {
      return keys(result);
    }
    if (method === 'mapValues') {
      const values = values(result);
      const firstValue = first(values);
      if (isPlainObject(firstValue)) {
        return chain(values).flatMap(keys).uniq().value();
      }
      if (isArray(firstValue)) {
        return ARRAY;
      }
    }
  }
  return [];
}
