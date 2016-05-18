import {
  includes,
  matchesProperty
} from 'lodash';
import { Observable } from 'rxjs';

const {
  create,
  empty,
  of
} = Observable;

export default function commands(rawKeypresses) {

  const [ enter, keypresses ] = rawKeypresses.partition(matchesProperty('name', 'return'));

  const insert = key => ({ action: 'insert', key });
  const move = (key, meta) => ({ action: 'move', key, meta });
  const scroll = key => ({ action: 'scroll', key });
  const del = (key, meta) => ({ action: 'del', key, meta });
  const undo = () => ({ action: 'undo' });
  const redo = () => ({ action: 'redo' });
  const copy = () => ({ action: 'copy' });
  const complete = key => ({ action: 'completion', key });
  const changeMode = mode => ({ action: 'mode', mode });

  const insertMode = () => create(obs => {
    obs.next(changeMode('insert'));
    keypresses.subscribe(key => {
      const { name, ctrl, meta, shift, sequence } = key;
      if (name === 'escape') {
        obs.next(move());
        obs.next(changeMode('normal'));
        return obs.complete();
      }
      if ((name === 'tab' && shift) || (name === 'p' && ctrl)) {
        return obs.next(complete('previous'));
      }
      if ((name === 'tab') || (name === 'n' && ctrl)) {
        return obs.next(complete('next'));
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
          return of(del(name, 'word'));
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

  return insertMode().concat(switchConcat(keypresses, key => {

    const { name, shift, meta, ctrl } = key;

    if (includes(['j', 'k'], name) || (includes(['d', 'u'], name) && ctrl) || (name == 'g' && shift)) {
      return of(scroll(key));
    }

    if (name === 'r' && ctrl) {
      return of(redo());
    }

    if (meta || ctrl) { return empty(); }

    if (name === 'y') {
      return of(copy());
    }

    if (name === 'u') {
      return of(undo());
    }

    if (name === 'x') {
      return of(move('append'), del(), move(), changeMode('normal'));
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
            obs.next(changeMode('normal'));
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
          return of(move(), changeMode('normal'));
        }
        return of(move('Til', sequence));
      });
    }
    if (name === 't') {
      return switchMapOnce(keypresses, ({ name, sequence }) => {
        if (name === 'escape') {
          return of(move(), changeMode('normal'));
        }
        return of(move('til', sequence));
      });
    }
    if (name === 'f' && shift) {
      return switchMapOnce(keypresses, ({ name, sequence }) => {
        if (name === 'escape') {
          return of(move(), changeMode('normal'));
        }
        return of(move('For', sequence));
      });
    }
    if (name === 'f') {
      return switchMapOnce(keypresses, ({ name, sequence }) => {
        if (name === 'escape') {
          return of(move(), changeMode('normal'));
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
