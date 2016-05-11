import {
  assign,
  chain,
  dropRight,
  fill,
  includes,
  isEmpty,
  last,
  map,
  pick,
  repeat,
  some
} from 'lodash';
import { copy as cp } from 'copy-paste';
import { parse } from 'shell-quote';
import sfy from 'maquillage';
import strip from 'strip-ansi';
import * as actions from './actions.js';
import commands from './commands';
import parseArgs from '../parseArgs.js';
import { evalChain } from '../eval.js';

export default function buffer(data, args, width, height, rawKeypresses) {

  const initialInput = parsePreserveQuotes(args).join(' ');
  const initialResult = evalWithInput(data, initialInput);
  const initialJson = initialResult || data;
  const initialOutput = getVisible(stringify(initialJson, width), width, height);

  return commands(rawKeypresses).scan((acc, command) => {

    const { action, key } = command;

    if (action === 'copy') {
      cp(acc.input);
      return acc;
    }

    if (action === 'scroll') {
      const scroll = scrollAction(acc.scroll, key, acc.json, height, width);
      if (scroll !== acc.scroll) {
        return assign({}, acc, {
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
      return assign({}, acc, nextState, {
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
      return assign({}, acc, lastState, {
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

      const result = evalWithInput(data, input);

      return assign({}, acc, {
        pos,
        input,
        output: result ? getVisible(stringify(result, width), width, height) : acc.output,
        json: result || acc.json,
        valid: !!result,
        scroll: 0,
        undos: acc.undos.concat(pick(acc, ['input', 'output', 'json', 'valid', 'pos']))
      });

    }

    if (pos !== acc.pos) {
      return assign({}, acc, { pos });
    }

    return acc;

  }, {
    input: initialInput,
    json: initialJson,
    output: initialOutput,
    pos: initialInput.length,
    scroll: 0,
    valid: !!initialResult,
    undos: [],
    redos: []
  })
  .startWith({
    input: initialInput,
    json: initialJson,
    output: initialOutput,
    pos: initialInput.length,
    scroll: 0,
    valid: !!initialResult,
    undos: [],
    redos: []
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

function evalWithInput(data, input) {
  if (isEmpty(input)) {
    return data;
  }
  try {
    const args = parseArgs(parse(input));
    return evalChain(data, args);
  } catch(e) {
    return null;
  }
}
