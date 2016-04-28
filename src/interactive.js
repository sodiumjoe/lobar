import {
  chain,
  includes,
  isEmpty,
  matchesProperty
} from 'lodash';
import { realTerminal as term } from 'terminal-kit';
import { Observable } from 'rxjs';
import parseArgs from './parseArgs.js';
import { evalChain } from './eval.js';

const {
  concat,
  create,
  empty,
  fromEvent,
  of
} = Observable;

export default function interactive(data, args) {

  const initialJson = getVisible(JSON.stringify(data, null, 2));

  term.fullscreen();
  term.grabInput(true);

  const initialInput = of(args.join(' '))
  .map(input => ({ action: 'insert', key: input }));

  const keypresses = fromEvent(term, 'key', (key, matches, data) => ({ key, matches, data })).share();

  const insert = key => ({ action: 'insert', key });
  const move = key => ({ action: 'move', key });
  const del = () => ({ action: 'del' });

  const actions = {
    move(pos, input, key) {
      if (key === 'ESCAPE') {
        return { pos: Math.min(pos, input.length - 1), input };
      }
      if (key === 'append') {
        return { pos: pos + 1, input };
      }
      if (includes(['h', 'LEFT'], key)) {
        return { pos: Math.max(pos - 1, 0), input };
      }
      if (includes(['l', 'RIGHT'], key)) {
        return { pos: Math.min(pos + 1, input.length - 1), input };
      }
      if (key === '0') {
        return { pos: 0, input };
      }
      if (key === '$') {
        return { pos: input.length - 1, input };
      }
      if (includes(['w', 'CTRL_RIGHT'], key)) {
        const newPos = chain(input.slice(pos)).words().transform((acc, word) => {
          acc.pos = acc.pos + word.length + 1;
          return acc.pos < pos;
        }, { pos }).value().pos + chain(input.slice(pos)).trim().size() - chain(input.slice(pos)).words().join(' ').size();
        return {
          pos: Math.min(newPos, input.length - 1),
          input
        };
      }
      if (key === 'e') {
        const newPos = chain(input.slice(pos)).words().transform((acc, word) => {
          if (word.length === 1) {
            acc.pos = acc.pos + 2;
            return true;
          }
          acc.pos = acc.pos + word.length - 1;
          return acc.pos < pos + 1;
        }, { pos }).value().pos + chain(input.slice(pos)).trim().size() - chain(input.slice(pos)).words().join(' ').size();
        return {
          pos: Math.min(newPos, input.length - 1),
          input
        };
      }
      if (includes(['b', 'CTRL_LEFT'], key)) {
        const leftPad = chain(input).trim().size() - chain(input).words().join(' ').size();
        if (pos <= leftPad) {
          return { pos: 0, input };
        }
        const newPos = chain(input).words().transform((acc, word) => {
          if (acc.pos + word.length + 2 > pos) {
            return false;
          }
          acc.pos = acc.pos + word.length + 1;
          return true;
        }, { pos: leftPad }).value().pos;
        return {
          pos: newPos,
          input
        };
      }
    },

    insert(pos, input, key) {
      if (pos === 0) {
        return { pos: key.length, input: key + input };
      }
      return {
        pos: pos + key.length,
        input: input.slice(0, pos) + key + input.slice(pos)
      };
    },

    del(pos, input) {
      if (pos === 0) {
        return { pos, input };
      }
      return { pos: pos - 1, input: input.slice(0, pos - 1) + input.slice(pos) };
    }
  };

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

  const switchConcat = (input, switchFn, onError, onComplete) => create(obs => {
    const init = () => {
      input.take(1).subscribe(e => {
        switchFn(e).subscribe(e => obs.next(e), onError, () => init());
      }, onError, onComplete);
    };
    init();
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

    return empty();
  }));

  const inputBuffer = concat(initialInput, commands)
  .scan((acc, { action, key }) => actions[action](acc.pos, acc.input, key), { pos: 0, input: '' });

  const output = inputBuffer.scan((acc, { pos, input }) => {
    let json;
    let valid;
    if (isEmpty(input)) {
      return { pos, input, json: initialJson };
    }
    try {
      const args = parseArgs(input.split(' '));
      const result = evalChain(data, args);
      json = getVisible(JSON.stringify(result, null, 2));
      valid = true;
    } catch(e) {
      json = acc.json;
      valid = false;
    }
    return { pos, input, json, valid };
  }, { pos: 0, input: '', json: initialJson, valid: true });

  output.subscribe(({ pos, input, json, valid }) => {
    term.clear();
    if (valid) {
      term(`${input}\n`);
    } else {
      term.red(`${input}\n`);
    }
    term(json);
    term.moveTo(pos + 1, 1);
  });

  keypresses.filter(matchesProperty('key', 'CTRL_C')).subscribe(term.processExit.bind(term, 0));

}

function getVisible(str) {
  const lines = str.split('\n');
  return lines.slice(0, term.height - 3).join('\n');
}
