import {
  some,
  assign,
  chain,
  includes,
  isEmpty,
  map
} from 'lodash';
import { Observable } from 'rxjs';
import { parse } from 'shell-quote';
import * as actions from './actions.js';
import parseArgs from '../parseArgs.js';
import { evalChain } from '../eval.js';
import sfy from 'maquillage';

const {
  create,
  concat,
  empty,
  of
} = Observable;

export default function buffer(data, args, height, width, keypresses) {

  const initialInput = of(parsePreserveQuotes(args).join(' ')).map(input => ({ action: 'insert', key: input }));

  const insert = key => ({ action: 'insert', key });
  const move = (key, meta) => ({ action: 'move', key, meta });
  const scroll = key => ({ action: 'scroll', key });
  const del = (key, meta) => ({ action: 'del', key, meta });

  const insertMode = () => create(obs => {
    keypresses.subscribe(key => {
      const { name, ctrl, meta, sequence } = key;
      if (includes(['linefeed', 'return'], name)) {
        obs.next({ action: 'enter' });
        return obs.complete();
      }
      if (name === 'escape') {
        obs.next(move());
        return obs.complete();
      }
      if (name === 'backspace') {
        return obs.next(del());
      }
      if (includes(['right', 'left'], name)) {
        return obs.next(move(name));
      }
      if (!ctrl && !meta) {
        return obs.next(insert(sequence));
      }
    });
  });

  const deleteMode = cmd => switchMapOnce(keypresses, ({ name }) => {
    if (name === 'escape') {
      return of(move());
    }
    if (name === cmd) {
      return of(move('0'), del('$'));
    }
    if (includes(['h', 'l', 'w', 'e', 'b', '0', '$'], name)) {
      return of(del(name));
    }
    if (name === 'i') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'escape') {
          return of(move());
        }
        if (name === 'w') {
          return of(del('word'));
        }
      });
    }
    if (name === 't') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'ESCAPE') {
          return of(move());
        }
        return of(del('til', name));
      });
    }
    if (name === 'f') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(del('for', name));
      });
    }
    if (name === 'T') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(del('Til', name));
      });
    }
    if (name === 'F') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(del('For', name));
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

    if (includes(['j', 'k'], name) ||
        (name == 'd' && ctrl) ||
        (name == 'u' && ctrl) ||
        (name == 'g' && shift)) {
      return of(scroll(key));
    }

    if (meta || ctrl) { return empty(); }

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
    if (name === 't') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(move('til', name));
      });
    }
    if (name === 'T') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(move('Til', name));
      });
    }
    if (name === 'f') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(move('for', name));
      });
    }
    if (name === 'F') {
      return switchMapOnce(keypresses, ({ name }) => {
        if (name === 'escape') {
          return of(move());
        }
        return of(move('for', name));
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
    if (includes(['linefeed', 'return'], name)) {
      return of({ action: 'enter' });
    }

    return empty();
  }));

  return concat(initialInput, commands)
  .scan((acc, command) => {
    const { action, key } = command;
    if (action === 'scroll') {
      return assign({}, acc, {
        action,
        scroll: scrollAction(acc.scroll, key, acc.json, height, width)
      });
    }
    if (action === 'enter') {
      return assign({}, acc, { key: 'enter', action });
    }

    const {
      pos,
      input
    } = actions[action](assign({}, acc, command));

    let result;

    if (isEmpty(input)) {
      result = data;
    } else {
      try {
        const args = parseArgs(parse(input));
        result = evalChain(data, args);
      } catch(e) {/* */}
    }

    return {
      pos,
      input,
      json: result || acc.json,
      valid: !!result,
      scroll: 0,
      key,
      action
    };
  }, {
    pos: 0,
    input: '',
    scroll: 0,
    json: data,
    valid: false,
    key: null
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

export const stringify = (json, width) => {
  const re = new RegExp(`.{1,${width}}`, 'g');
  return chain(sfy(json).split('\n')).map(line => line.match(re)).flatten().join('\n').value();
};

const parsePreserveQuotes = args => map(args, arg => {
  if (typeof arg === 'string' && some(arg.split(''), char => includes([' ', '=', '>', '(', ')'], char))) {
    return `"${arg}"`;
  }
  return arg;
});
