import {
  assign,
  chain,
  dropRight,
  fill,
  includes,
  isEmpty,
  last,
  map,
  matchesProperty,
  pick,
  repeat,
  some
} from 'lodash';
import { Observable } from 'rxjs';
import { parse } from 'shell-quote';
import sfy from 'maquillage';
import strip from 'strip-ansi';
import * as actions from './actions.js';
import parseArgs from '../parseArgs.js';
import { evalChain } from '../eval.js';

const {
  create,
  empty,
  of
} = Observable;

export default function buffer(data, args, width, height, rawKeypresses) {

  const [ enter, keypresses ] = rawKeypresses.partition(matchesProperty('name', 'return'));

  const initialInput = parsePreserveQuotes(args).join(' ');
  const initialResult = evalWithInput(data, initialInput);
  const initialJson = initialResult || data;
  const initialOutput = getVisible(stringify(initialJson, width), width, height);

  const insert = key => ({ action: 'insert', key });
  const move = (key, meta) => ({ action: 'move', key, meta });
  const scroll = key => ({ action: 'scroll', key });
  const del = (key, meta) => ({ action: 'del', key, meta });
  const undo = () => ({ action: 'undo' });
  const redo = () => ({ action: 'redo' });

  const insertMode = () => create(obs => {
    keypresses.subscribe(key => {
      const { name, ctrl, meta, sequence } = key;
      if (name === 'escape') {
        obs.next(move());
        return obs.complete();
      }
      if (name === 'backspace') {
        return obs.next(del());
      }
      if (name === 'b' && meta) {
        return obs.next(move('b'));
      }
      if (name === 'f' && meta) {
        return obs.next(move('w'));
      }
      if (name === 'right') {
        return obs.next(move('append'));
      }
      if (name === 'left') {
        return obs.next(move(name));
      }
      if (!ctrl && !meta) {
        return obs.next(insert(sequence));
      }
    });
  });

  const deleteMode = cmd => switchMapOnce(keypresses, ({ name, shift }) => {
    if (name === 'escape') {
      return of(move());
    }
    if (name === cmd) {
      return of(move('0'), del('$'));
    }
    if (includes(['h', 'l', 'w', 'e', 'b', '0', '$'], name)) {
      return of(del(name));
    }
    if (includes(['i', 'a'], name)) {
      return switchMapOnce(keypresses, ({ name: meta }) => {
        if (meta === 'escape') {
          return of(move());
        }
        if (meta === 'w') {
          return of(del(name, 'word'), move());
        }
        if (includes(['{', '}', '(', ')', '[', ']', '\'', '"'], meta)) {
          return of(del(name, meta));
        }
        return of(move());
      });
    }
    if (name === 't' && shift) {
      return switchMapOnce(keypresses, ({ name, meta, ctrl, sequence }) => {
        if (name === 'escape' || meta || ctrl) {
          return of(move());
        }
        return of(del('Til', sequence));
      });
    }
    if (name === 'f' && shift) {
      return switchMapOnce(keypresses, ({ name, meta, ctrl, sequence }) => {
        if (name === 'escape' || meta || ctrl) {
          return of(move());
        }
        return of(del('For', sequence));
      });
    }
    if (name === 't') {
      return switchMapOnce(keypresses, ({ name, meta, ctrl, sequence }) => {
        if (name === 'escape' || meta || ctrl) {
          return of(move());
        }
        return of(del('til', sequence));
      });
    }
    if (name === 'f') {
      return switchMapOnce(keypresses, ({ name, meta, ctrl, sequence }) => {
        if (name === 'escape' || meta || ctrl) {
          return of(move());
        }
        return of(del('for', sequence));
      });
    }
    return empty();
  });

  const replaceOne = () => switchMapOnce(keypresses, ({ meta, ctrl, sequence }) => {
    if (meta || ctrl) {
      return empty();
    }
    return of(move('append'), del(), insert(sequence), move());
  });

  const commands = insertMode().concat(switchConcat(keypresses, key => {

    const { name, shift, meta, ctrl } = key;

    if (includes(['j', 'k'], name) || (includes(['d', 'u'], name) && ctrl) || (name == 'g' && shift)) {
      return of(scroll(key));
    }

    if (name === 'r' && ctrl) {
      return of(redo());
    }

    if (meta || ctrl) { return empty(); }

    if (name === 'u') {
      return of(undo());
    }

    if (name === 'x') {
      return of(move('append'), del(), move());
    }
    if (name === 'i' && shift) {
      return of(move('0')).concat(insertMode());
    }
    if (name === 'i') {
      return insertMode();
    }
    if (includes(['h', 'l', 'right', 'left', 'b', 'w', 'e', '0', '$'], name)) {
      return of(move(name));
    }
    if (name === 'a' && shift) {
      return of(move('$'), move('append')).concat(insertMode());
    }
    if (name === 'a') {
      return of(move('append')).concat(insertMode());
    }
    if (name === 'd') {
      return deleteMode(name);
    }
    if (name === 'c') {
      return create(obs => deleteMode(name).subscribe(
        key => {
          const { name } = key;
          if (name === 'escape') {
            obs.next(move());
            return obs.complete();
          }
          return obs.next(key);
        },
        obs.error,
        () => insertMode().subscribe(obs)
      ));
    }
    if (name === 'r') {
      return replaceOne();
    }
    if (name === 't' && shift) {
      return switchMapOnce(keypresses, ({ name, sequence }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(move('Til', sequence));
      });
    }
    if (name === 't') {
      return switchMapOnce(keypresses, ({ name, sequence }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(move('til', sequence));
      });
    }
    if (name === 'f' && shift) {
      return switchMapOnce(keypresses, ({ name, sequence }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(move('For', sequence));
      });
    }
    if (name === 'f') {
      return switchMapOnce(keypresses, ({ name, sequence }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(move('for', sequence));
      });
    }
    if (name === 'g') {
      return switchMapOnce(keypresses, ({ name, shift }) => {
        if (name === 'g' && !shift) {
          return of(scroll(key));
        }
        return empty();
      });
    }

    return empty();
  })).takeUntil(enter);

  return commands.scan((acc, command) => {
    const { action, key } = command;

    if (action === 'scroll') {
      const scroll = scrollAction(acc.scroll, key, acc.json, height, width);
      if (scroll !== acc.scroll) {
        return assign({}, acc, {
          action,
          scroll,
          output: getVisible(stringify(evalWithInput(data, acc.input) || acc.json, width), width, height, scroll)
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

const switchMapOnce = (input, switchFn) => create(obs => input.take(1).subscribe(e => switchFn(e).subscribe(obs)));

const switchConcat = (input, switchFn, onError, onComplete) => create(obs => {
  const init = () => {
    input.take(1).subscribe(e => {
      switchFn(e).subscribe(e => obs.next(e), onError, () => init());
    }, onError, onComplete);
  };
  init();
});

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
