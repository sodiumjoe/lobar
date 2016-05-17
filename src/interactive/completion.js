import {
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
import { evalChain } from '../eval.js';
import { ARRAY, ARRAY_MATCHES, OBJECT, OBJECT_MATCHES } from './constants.js';

export function getCompletionState(action, state) {

  if (isEmpty(state.completions)) {
    return state;
  }

  if (action === 'completion.next') {

    const selectedCompletionIndex = state.selectedCompletionIndex === null
      ? 0
      : state.selectedCompletionIndex === state.completions.length - 1
        ? null
        : state.selectedCompletionIndex + 1;

    const input = state.selectedCompletionIndex === state.completions.length - 1
      ? state.preCompletionInput
      : state.input.slice(0, state.completionPos) + state.completions[selectedCompletionIndex] + state.input.slice(state.pos);

    const preCompletionInput = state.selectedCompletionIndex === null ? state.input : state.preCompletionInput;

    const preCompletionPos = state.selectedCompletionIndex === null ? state.pos : state.preCompletionPos;

    const pos = state.selectedCompletionIndex === state.completions.length - 1
      ? state.preCompletionPos
      : state.completionPos + state.completions[selectedCompletionIndex].length;

    return {
      selectedCompletionIndex,
      preCompletionInput,
      preCompletionPos,
      input,
      pos
    };

  }

  const selectedCompletionIndex = state.selectedCompletionIndex === null
    ? state.completions.length - 1
    : state.selectedCompletionIndex === 0
      ? null
      : state.selectedCompletionIndex - 1;

  const input = state.selectedCompletionIndex === 0
    ? state.preCompletionInput
    : state.input.slice(0, state.completionPos) + state.completions[selectedCompletionIndex] + state.input.slice(state.pos);

  const preCompletionInput = state.selectedCompletionIndex === null ? state.input : state.preCompletionInput;

  const preCompletionPos = state.selectedCompletionIndex === null ? state.pos : state.preCompletionPos;

  const pos = state.selectedCompletionIndex === 0
    ? state.preCompletionPos
    : state.completionPos + state.completions[selectedCompletionIndex].length;

  return {
    selectedCompletionIndex,
    preCompletionInput,
    preCompletionPos,
    input,
    pos
  };

}

const noCompletions = {
  completions: [],
  completionPos: null
};

export function getCompletions(data, input, args) {
  const trie = new Trie();
  const completionPos = chain(input).split(' ').flatMap(s => s.split('.')).slice(0, -1).join(' ').size().value() + 1;

  if (args.length % 2 === 0) {

    // infer possible next method
    if (last(input) === ' ') {
      const result = evalChain(data, args);
      if (isPlainObject(result)) {
        return {
          completions: OBJECT,
          completionPos
        };
      }
      if (isArray(result)) {
        return {
          completions: ARRAY,
          completionPos
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
      if (completions.length === 1 && first(completions) === currentArg) {
        return noCompletions;
      }
      return {
        completions,
        completionPos
      };
    }
    if (isArray(result) && includes(ARRAY_MATCHES, currentMethod)) {
      const item = first(result);
      if (isPlainObject(item)) {
        forEach(keys(item), key => trie.add(key, key));
        return {
          completions: trie.find(currentArg),
          completionPos
        };
      }
    }
    if (isPlainObject(result) && includes(OBJECT_MATCHES, currentMethod)) {
      return {
        completions: keys(result),
        completionPos
      };
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
          completions: keys(item),
          completionPos
        };
      }
    }
    if (isPlainObject(result) && includes(OBJECT_MATCHES, currentMethod)) {
      return {
        completions: keys(result),
        completionPos
      };
    }
    return noCompletions;
  }

  // infer rest of method
  if (isPlainObject(result)) {
    forEach(OBJECT, method => trie.add(method, method));
  }
  if (isArray(result)) {
    forEach(ARRAY, method => trie.add(method, method));
  }
  return {
    completions: trie.find(last(args)),
    completionPos
  };

}
