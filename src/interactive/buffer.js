import {
  assign,
  dropRight,
  includes,
  isEmpty,
  last,
  map,
  pick,
  some
} from 'lodash';
import * as actions from './actions.js';
import { BufferError } from './error.js';

const UNDO_KEYS = ['input', 'pos'];

export default function buffer(data, initialArgs, commands, getCompletions = () => ({ completions: [], completionPos: 0 })) {

  const initialInput = parsePreserveQuotes(initialArgs).join(' ');

  const {
    completions,
    completionPos
  } = getCompletions(data, initialInput, initialInput.length);

  const initialState = {
    input: initialInput,
    mode: 'normal',
    pos: initialInput.length,
    redos: [],
    undos: [],
    completions,
    completionPos,
    selectedCompletionIndex: 0
  };

  return commands.scan((state, command) => {

    try {

      const { action, key, mode = state.mode } = command;

      if (action === 'mode') {
        if (mode === 'insert' && state.mode === 'normal') {
          return assign(state, {
            mode,
            undos: state.undos.concat(pick(state, UNDO_KEYS))
          });
        }
        return assign(state, { mode });
      }

      if (action === 'redo') {
        if (isEmpty(state.redos)) {
          return state;
        }
        const nextState = last(state.redos);
        return assign(state, nextState, {
          undos: state.undos.concat(pick(state, UNDO_KEYS)),
          redos: dropRight(state.redos)
        });
      }

      if (action === 'undo') {
        if (isEmpty(state.undos)) {
          return state;
        }
        const lastState = last(state.undos);
        return assign(state, lastState, {
          undos: dropRight(state.undos),
          redos: state.redos.concat(pick(state, UNDO_KEYS))
        });
      }

      if (action === 'completion') {

        const {
          completions,
          completions: { length },
          completionPos
        } = state;

        const selectedCompletionIndex = key === 'next'
          ? (state.selectedCompletionIndex + 1) % length
          : (state.selectedCompletionIndex - 1 + length) % length;

        const selectedCompletion = completions[selectedCompletionIndex];

        const input = state.input.slice(0, completionPos)
          + selectedCompletion
          + state.input.slice(completionPos + completions[state.selectedCompletionIndex].length);

        const pos = completionPos + selectedCompletion.length;

        return assign(state, {
          pos,
          input,
          selectedCompletionIndex
        });
      }

      const {
        pos,
        input
      } = actions[action](assign({}, state, command));

      if (input !== state.input) {

        const lastState = pick(state, UNDO_KEYS);
        const undos = action === 'insert'
          ? state.undos
          : state.undos.concat(lastState);

        return assign(state, {
          selectedCompletionIndex: 0,
          pos,
          input,
          undos,
          redos: []
        }, getCompletions(data, input, pos));

      }

      if (pos !== state.pos) {
        return assign(state, { pos }, getCompletions(data, input, pos));
      }

      return state;

    } catch(error) {
      throw new BufferError(error, {
        state,
        command
      });
    }

  }, initialState)
  .startWith(initialState);

}

const parsePreserveQuotes = args => map(args, arg => {
  if (typeof arg === 'string' && some(arg.split(''), char => includes([' ', '=', '>', '(', ')'], char))) {
    return `"${arg}"`;
  }
  return arg;
});
