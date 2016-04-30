import {
  includes
} from 'lodash';
import { Observable } from 'rxjs';
import * as actions from './actions.js';

const {
  create,
  concat,
  empty,
  of
} = Observable;

export default function buffer(args, keypresses) {

  const initialInput = of(args.join(' ')).map(input => ({ action: 'insert', key: input }));

  const insert = key => ({ action: 'insert', key });
  const move = (key, meta) => ({ action: 'move', key, meta });
  const del = (key, meta) => ({ action: 'del', key, meta });

  const getInserts = () => create(obs => {
    keypresses.subscribe(({ key, data: { isCharacter } }) => {
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

    return empty();
  }));

  return concat(initialInput, commands)
  .scan((acc, { action, key, meta }) => actions[action](acc.pos, acc.input, key, meta), { pos: 0, input: '' });

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
