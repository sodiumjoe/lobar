import {
  assign,
  chain,
  dropRight,
  fill,
  first,
  forEach,
  includes,
  isEmpty,
  isNil,
  keys,
  last,
  map,
  pick,
  repeat,
  some
} from 'lodash';
import Trie from 'triejs';
import { copy as cp } from 'copy-paste';
import { parse } from 'shell-quote';
import sfy from 'maquillage';
import strip from 'strip-ansi';
import * as actions from './actions.js';
import commands from './commands';
import { parseArgs, validateArgs } from '../parseArgs.js';
import { evalChain } from '../eval.js';

export default function buffer(data, args, width, height, rawKeypresses) {

  const initialInput = parsePreserveQuotes(args).join(' ');
  const { result: initialResult, completions, completionPos } = evalWithInput(data, initialInput);
  const initialJson = isNil(initialResult) ? data : initialResult;
  const initialOutput = getVisible(stringify(initialJson, width), width, height);

  return commands(rawKeypresses).scan((acc, command) => {

    const { action, key } = command;

    if (action === 'copy') {
      cp(acc.input);
      return acc;
    }

    if (action === 'completion.next' && !isEmpty(acc.completions)) {
      const selectedCompletionIndex = acc.selectedCompletionIndex === null
        ? 0
        : acc.selectedCompletionIndex === acc.completions.length - 1
          ? null
          : acc.selectedCompletionIndex + 1;

      const input = acc.selectedCompletionIndex === acc.completions.length - 1
        ? acc.preCompletionInput
        : acc.input.slice(0, acc.completionPos) + acc.completions[selectedCompletionIndex];

      const { result } = evalWithInput(data, input, acc.pos);

      const preCompletionInput = acc.selectedCompletionIndex === null ? acc.input : acc.preCompletionInput;

      return assign(acc, {
        selectedCompletionIndex,
        preCompletionInput,
        input,
        pos: input.length,
        output: !isNil(result) ? getVisible(stringify(result, width), width, height) : acc.output,
        json: isNil(result) ? acc.json : result,
        valid: !isNil(result)
      });

    }

    if (action === 'completion.previous' && !isEmpty(acc.completions)) {

      const selectedCompletionIndex = acc.selectedCompletionIndex === null
        ? acc.completions.length - 1
        : acc.selectedCompletionIndex === 0
          ? null
          : acc.selectedCompletionIndex - 1;

      const input = acc.selectedCompletionIndex === 0
        ? acc.preCompletionInput
        : acc.input.slice(0, acc.completionPos) + acc.completions[selectedCompletionIndex];

      const { result } = evalWithInput(data, input, acc.pos);

      const preCompletionInput = acc.selectedCompletionIndex === null ? acc.input : acc.preCompletionInput;

      return assign(acc, {
        selectedCompletionIndex,
        preCompletionInput,
        input,
        pos: input.length,
        output: !isNil(result) ? getVisible(stringify(result, width), width, height) : acc.output,
        json: isNil(result) ? acc.json : result,
        valid: !isNil(result)
      });

    }

    if (action === 'scroll') {
      const scroll = scrollAction(acc.scroll, key, acc.json, height, width);
      if (scroll !== acc.scroll) {
        return assign(acc, {
          action,
          scroll,
          output: getVisible(stringify(acc.json, width), width, height, scroll)
        });
      }
      return acc;
    }

    if (action === 'redo') {
      if (isEmpty(acc.redos)) {
        return acc;
      }
      const nextState = last(acc.redos);
      return assign(acc, nextState, {
        undos: acc.undos.concat(nextState),
        redos: dropRight(acc.redos),
        scroll: 0
      });
    }

    if (action === 'undo') {
      if (isEmpty(acc.undos)) {
        return acc;
      }
      const lastState = last(acc.undos);
      return assign(acc, lastState, {
        undos: dropRight(acc.undos),
        redos: acc.redos.concat(pick(acc, ['input', 'output', 'json', 'valid', 'pos'])),
        scroll: 0
      });
    }

    const {
      pos,
      input
    } = actions[action](assign({}, acc, command));

    if (input !== acc.input) {

      const { result, completions, completionPos } = evalWithInput(data, input, pos);

      return assign(acc, {
        completions,
        completionPos,
        selectedCompletionIndex: null,
        preCompletionInput: null,
        pos,
        input,
        output: !isNil(result) ? getVisible(stringify(result, width), width, height) : acc.output,
        json: isNil(result) ? acc.json : result,
        valid: !isNil(result),
        scroll: 0,
        undos: acc.undos.concat(pick(acc, ['input', 'output', 'json', 'valid', 'pos'])),
        redos: []
      });

    }

    if (pos !== acc.pos) {
      return assign(acc, { pos });
    }

    return acc;

  }, {
    completions,
    completionPos,
    selectedCompletionIndex: null,
    input: initialInput,
    json: initialJson,
    output: initialOutput,
    pos: initialInput.length,
    redos: [],
    scroll: 0,
    undos: [],
    valid: !isNil(initialResult)
  })
  .startWith({
    completions,
    completionPos,
    selectedCompletionIndex: null,
    input: initialInput,
    json: initialJson,
    output: initialOutput,
    pos: initialInput.length,
    redos: [],
    scroll: 0,
    undos: [],
    valid: !isNil(initialResult)
  });

}

const scrollAction = (scroll = 0, { name, shift }, json, height, width) => {
  const max = stringify(json, width).split('\n').length - height;
  if (name === 'j') {
    return Math.min(max, scroll + 1);
  }
  if (name === 'k') {
    return Math.max(0, scroll - 1);
  }
  if (name === 'd') {
    return Math.min(max, scroll + height);
  }
  if (name === 'u') {
    return Math.max(0, scroll - height);
  }
  if (name === 'g' && shift) {
    return max;
  }
  if (name === 'g') {
    return 0;
  }
  return scroll;
};

const stringify = (json, width) => {
  const re = new RegExp(`.{1,${width}}`, 'g');
  return chain(sfy(json).split('\n')).map(line => line.match(re)).flatten().join('\n').value();
};

const parsePreserveQuotes = args => map(args, arg => {
  if (typeof arg === 'string' && some(arg.split(''), char => includes([' ', '=', '>', '(', ')'], char))) {
    return `"${arg}"`;
  }
  return arg;
});

function getVisible(str, width, height, n = 0) {
  const blank = fill(Array(height), repeat(' ', width));
  const lines = str.split('\n');
  return chain(lines)
  .slice(n, n + height)
  // pad end of each line
  .map(line => `${line}${repeat(' ', width - strip(line).length)}`)
  // clear under end of input if it doesn't fill height of terminal
  .concat(blank)
  .slice(0, height)
  .join('\n')
  .value();
}

function evalWithInput(data, input, pos) {

  if (isEmpty(input)) {
    return {
      result: data,
      completions: [],
      completionPos: null
    };
  }

  const args = parseArgs(parse(input));

  try {
    validateArgs(args);
    const result = evalChain(data, args);
    if (!isNil(result)) {
      return {
        result,
        completions: [],
        completionPos: null
      };
    }
  } catch(e) {
    if (e.message !== 'Error: not enough arguments') {
      return {
        result: null,
        completions: [],
        completionPos: null
      };
    }
  }

  try {
    return assign({
      result: null
    }, getCompletions(data, input, pos, args));
  } catch(e) {/* */ }

  return {
    result: null,
    completions: [],
    completionPos: null
  };

}

function getCompletions(data, input, pos, args) {
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
