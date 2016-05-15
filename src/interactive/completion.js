import {
  chain,
  dropRight,
  forEach,
  includes,
  isEmpty,
  keys,
  last
} from 'lodash';
import Trie from 'triejs';
import { evalChain } from '../eval.js';


export function getCompletionState(action, state) {

  if (action === 'completion.next' && !isEmpty(state.completions)) {
    const selectedCompletionIndex = state.selectedCompletionIndex === null
    ? 0
    : state.selectedCompletionIndex === state.completions.length - 1
    ? null
    : state.selectedCompletionIndex + 1;

    const input = state.selectedCompletionIndex === state.completions.length - 1
    ? state.preCompletionInput
    : state.input.slice(0, state.completionPos) + state.completions[selectedCompletionIndex];

    const preCompletionInput = state.selectedCompletionIndex === null ? state.input : state.preCompletionInput;

    return {
      selectedCompletionIndex,
      preCompletionInput,
      input
    };

  }

  const selectedCompletionIndex = state.selectedCompletionIndex === null
    ? state.completions.length - 1
    : state.selectedCompletionIndex === 0
      ? null
      : state.selectedCompletionIndex - 1;

  const input = state.selectedCompletionIndex === 0
  ? state.preCompletionInput
  : state.input.slice(0, state.completionPos) + state.completions[selectedCompletionIndex];

  const preCompletionInput = state.selectedCompletionIndex === null ? state.input : state.preCompletionInput;

  return {
    selectedCompletionIndex,
    preCompletionInput,
    input
  };

}

export function getCompletions(data, input, pos, args) {
  const trie = new Trie();
  if (args.length % 2 === 0) {
    const [currentMethod, currentArg] = args.slice(-2);
    if (currentMethod === 'get') {
      const result = evalChain(data, dropRight(args));
      const resultKeys = keys(result);
      forEach(resultKeys, key => trie.add(key, key));
      return {
        completions: trie.find(currentArg),
        completionPos: chain(input).split(' ').flatMap(s => s.split('.')).slice(0, -1).join(' ').size().value() + 1
      };
    }
  }
  if (includes(['.', ' '], last(input))) {
    const currentMethod = last(args);
    if (currentMethod === 'get' || last(input) === '.') {
      const result = evalChain(data, args);
      return {
        completions: keys(result),
        completionPos: input.length
      };
    }
  }
  return {
    completions: [],
    completionPos: null
  };
}
