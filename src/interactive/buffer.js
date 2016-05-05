import {
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

  const getInserts = () => create(obs => {
    keypresses.subscribe(({ key, data: { isCharacter } }) => {
      if (key === 'ENTER') {
        obs.next({ action: 'enter', key });
        return obs.complete();
      }
      if (key === 'ESCAPE') {
        obs.next(move(key));
        return obs.complete();
      }
      if (key === 'BACKSPACE') {
        return obs.next(del());
      }
      if (includes(['RIGHT', 'LEFT', 'CTRL_LEFT', 'CTRL_RIGHT'], key)) {
        return obs.next(move(key));
      }
      if (isCharacter) {
        return obs.next(insert(key));
      }
    });
  });

  const getDeletes = cmd => switchMapOnce(keypresses, ({ key }) => {
    if (key === 'ESCAPE') {
      return of(move(key));
    }
    if (key === cmd) {
      return of(move('0'), del('$'));
    }
    if (includes(['h', 'l', 'w', 'e', 'b', '0', '$'], key)) {
      return of(del(key));
    }
    if (key === 'i') {
      return switchMapOnce(keypresses, ({ key }) => {
        if (key === 'ESCAPE') {
          return of(move(key));
        }
        if (key === 'w') {
          return of(del('word'));
        }
      });
    }
    if (key === 't') {
      return switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
        if (key === 'ESCAPE' || !isCharacter) {
          return of(move(key));
        }
        return of(del('til', key));
      });
    }
    if (key === 'f') {
      return switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
        if (key === 'ESCAPE' || !isCharacter) {
          return of(move(key));
        }
        return of(del('for', key));
      });
    }
    if (key === 'T') {
      return switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
        if (key === 'ESCAPE' || !isCharacter) {
          return of(move(key));
        }
        return of(del('Til', key));
      });
    }
    if (key === 'F') {
      return switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
        if (key === 'ESCAPE' || !isCharacter) {
          return of(move(key));
        }
        return of(del('For', key));
      });
    }
    return empty();
  });

  const getReplacement = () => switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
    if (!isCharacter) {
      return empty();
    }
    return of(move('append'), del(), insert(key), move('ESCAPE'));
  });

  const commands = getInserts().concat(switchConcat(keypresses, ({ key }) => {
    if (key === 'x') {
      return of(move('append'), del(), move('ESCAPE'));
    }
    if (key === 'i') {
      return getInserts();
    }
    if (includes(['h', 'l', 'RIGHT', 'LEFT', 'b', 'w', 'e', '0', '$'], key)) {
      return of(move(key));
    }
    if (key === 'a') {
      return of(move('append')).concat(getInserts());
    }
    if (key === 'A') {
      return of(move('$'), move('append')).concat(getInserts());
    }
    if (key === 'I') {
      return of(move('0')).concat(getInserts());
    }
    if (key === 'd') {
      return getDeletes(key);
    }
    if (key === 'c') {
      return create(obs => getDeletes(key).subscribe(
        e => {
          const { key } = e;
          if (key === 'ESCAPE') {
            obs.next(move(key));
            return obs.complete();
          }
          return obs.next(e);
        },
        obs.error,
        () => getInserts().subscribe(obs)
      ));
    }
    if (key === 'r') {
      return getReplacement();
    }
    if (key === 't') {
      return switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
        if (key === 'ESCAPE' || !isCharacter) {
          return of(move(key));
        }
        return of(move('til', key));
      });
    }
    if (key === 'T') {
      return switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
        if (key === 'ESCAPE' || !isCharacter) {
          return of(move(key));
        }
        return of(move('Til', key));
      });
    }
    if (key === 'f') {
      return switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
        if (key === 'ESCAPE' || !isCharacter) {
          return of(move(key));
        }
        return of(move('for', key));
      });
    }
    if (key === 'F') {
      return switchMapOnce(keypresses, ({ key, data: { isCharacter } }) => {
        if (key === 'ESCAPE' || !isCharacter) {
          return of(move(key));
        }
        return of(move('For', key));
      });
    }
    if (includes(['G', 'j', 'k', 'CTRL_D', 'CTRL_U'], key)) {
      return of(scroll(key));
    }
    if (key === 'g') {
      return switchMapOnce(keypresses, ({ key }) => {
        if (key === 'g') {
          return of(scroll(key));
        }
        return empty();
      });
    }
    if (key === 'ENTER') {
      return of({ action: 'enter', key });
    }

    return empty();
  }));

  return concat(initialInput, commands)
  .scan((acc, command) => {
    const { action, key } = command;
    if (action === 'scroll') {
      return assign({}, acc, { scroll: scrollAction(acc.scroll, key, acc.json, height, width) });
    }
    if (action === 'enter') {
      return assign({}, acc, { key });
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
      key
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

const scrollAction = (scroll = 0, key, json, height, width) => {
  const max = stringify(json, width).split('\n').length - height;
  if (key === 'j') {
    return Math.min(max, scroll + 1);
  }
  if (key === 'k') {
    return Math.max(0, scroll - 1);
  }
  if (key === 'CTRL_D') {
    return Math.min(max, scroll + height);
  }
  if (key === 'CTRL_U') {
    return Math.max(0, scroll - height);
  }
  if (key === 'G') {
    return max;
  }
  if (key === 'g') {
    return 0;
  }
  return scroll;
};

export const stringify = (json, width) => {
  const re = new RegExp(`.{1,${width}}`, 'g');
  return chain(sfy(json).split('\n')).map(line => line.match(re)).flatten().join('\n').value();
};

const parsePreserveQuotes = args => map(args, arg => arg.match(/[^A-Za-z]/) ? `"${arg}"` : arg);
