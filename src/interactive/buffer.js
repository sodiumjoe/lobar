import {
  assign,
  chain,
  dropRight,
  includes,
  isEmpty,
  isNil,
  last,
  map,
  pick,
  some
} from 'lodash';
import { copy as cp } from 'copy-paste';
import { parse } from 'shell-quote';
import sfy from 'maquillage';
import * as actions from './actions.js';
import commands from './commands';
import { getCompletions, getCompletionState } from './completion.js';
import { parseArgs } from '../parseArgs.js';
import { evalChain } from '../eval.js';

export default function buffer(data, args, width, height, rawKeypresses) {

  const initialInput = parsePreserveQuotes(args).join(' ');
  const { result: initialResult, completions, completionPos } = evalWithInput(data, initialInput);
  const initialJson = isNil(initialResult) ? data : initialResult;
  const initialOutput = getVisible(stringify(initialJson, width), width, height);

  return commands(rawKeypresses).scan((state, command) => {

    try {

      const { action, key, mode = state.mode } = command;

      if (action === 'copy') {
        cp(state.input);
        return state;
      }

      if (action === 'mode') {
        if (mode === 'insert' && state.mode === 'normal') {
          return assign(state, {
            mode,
            undos: state.undos.concat(pick(state, ['input', 'output', 'json', 'valid', 'pos']))
          });
        }
        return assign(state, { mode });
      }

      if (action === 'completion' && !isEmpty(state.completions)) {
        const {
          input,
          pos,
          preCompletionInput,
          preCompletionPos,
          selectedCompletionIndex
        } = getCompletionState(key, state);
        const { result } = evalWithInput(data, input, state.pos);
        return assign(state, {
          selectedCompletionIndex,
          preCompletionInput,
          preCompletionPos,
          input,
          pos,
          undos: state.undos.concat(pick(state, ['input', 'output', 'json', 'valid', 'pos'])),
          output: !isNil(result) ? getVisible(stringify(result, width), width, height) : state.output,
          json: isNil(result) ? state.json : result,
          valid: !isNil(result)
        });
      }

      if (action === 'scroll') {
        const scroll = scrollAction(state.scroll, key, state.json, height, width);
        if (scroll !== state.scroll) {
          return assign(state, {
            action,
            scroll,
            output: getVisible(stringify(state.json, width), width, height, scroll)
          });
        }
        return state;
      }

      if (action === 'redo') {
        if (isEmpty(state.redos)) {
          return state;
        }
        const nextState = last(state.redos);
        return assign(state, nextState, {
          undos: state.undos.concat(pick(state, ['input', 'output', 'json', 'valid', 'pos'])),
          redos: dropRight(state.redos),
          scroll: 0
        });
      }

      if (action === 'undo') {
        if (isEmpty(state.undos)) {
          return state;
        }
        const lastState = last(state.undos);
        return assign(state, lastState, {
          undos: dropRight(state.undos),
          redos: state.redos.concat(pick(state, ['input', 'output', 'json', 'valid', 'pos'])),
          scroll: 0
        });
      }

      const {
        pos,
        input
      } = actions[action](assign({}, state, command));

      if (input !== state.input) {

        const lastState = pick(state, ['input', 'output', 'json', 'valid', 'pos']);
        const { result, completions, completionPos } = evalWithInput(data, input, pos);
        const undos = action === 'insert'
          ? state.undos
          : state.undos.concat(lastState);

        return assign(state, {
          completions,
          completionPos,
          selectedCompletionIndex: null,
          preCompletionInput: null,
          pos,
          input,
          output: !isNil(result) ? getVisible(stringify(result, width), width, height) : state.output,
          json: isNil(result) ? state.json : result,
          valid: !isNil(result),
          scroll: 0,
          undos,
          redos: []
        });

      }

      if (pos !== state.pos) {
        return assign(state, { pos });
      }

      return state;

    } catch(error) {
      return {
        state,
        command,
        error
      };
    }

  }, {
    completions,
    completionPos,
    selectedCompletionIndex: null,
    input: initialInput,
    json: initialJson,
    mode: 'normal',
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
    mode: 'normal',
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
  const lines = str.split('\n');
  return chain(lines)
  .slice(n, n + height)
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
  const partialInput = input.slice(0, pos);
  const partialArgs = parseArgs(parse(partialInput));

  let completions, completionPos;

  try{
    const completionState = getCompletions(data, partialInput, partialArgs);
    completions = completionState.completions;
    completionPos = completionState.completionPos;
  } catch(e) {
    completions = [];
    completionPos = null;
  }

  try {
    return {
      result: evalChain(data, args),
      completions,
      completionPos
    };
  } catch(e) {
    return {
      result: null,
      completions,
      completionPos
    };
  }

}
