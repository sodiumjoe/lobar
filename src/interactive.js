import {
  includes,
  isEmpty,
  matchesProperty,
  property
} from 'lodash';
import { realTerminal as term } from 'terminal-kit';
import { Observable } from 'rxjs';
import parseArgs from './parseArgs.js';
import { evalChain } from './eval.js';

const {
  concat,
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

  const mode = concat(of('insert'), keypresses).scan((current, { key }) => {
    if (key === 'ESCAPE') {
      return 'normal';
    }
    if (current === 'normal' && key === 'I') {
      return 'insertLine';
    }
    if (current === 'normal' && key === 'A') {
      return 'appendLine';
    }
    if (current === 'normal' && key === 'i') {
      return 'insert';
    }
    if (current === 'normal' && key === 'a') {
      return 'append';
    }
    return current;
  }).distinctUntilChanged().share();

  const moves = keypresses.pluck('key').filter(key => includes(['h', 'l', '0', '$'], key)).map(key => ({ action: 'move', key }));
  const [chars, controls] = keypresses.partition(property('data.isCharacter'));
  const deletes = controls.filter(matchesProperty('key', 'BACKSPACE')).map(() => ({ action: 'del' }));
  const inserts = chars.pluck('key').map(key => ({ action: 'insert', key })).merge(deletes);

  const inputs = mode.switchMap(mode => {
    if (mode === 'insert') {
      return inserts;
    }
    if (mode === 'append') {
      return concat(of({ action: 'move', key: 'append' }), inserts);
    }
    if (mode === 'insertLine') {
      return concat(of({ action: 'move', key: '0' }), inserts);
    }
    if (mode === 'appendLine') {
      return concat(of({ action: 'move', key: '$' }), of({ action: 'move', key: 'append' }), inserts);
    }
    return concat(of({ action: 'move', key: 'h' }), moves);
  });

  const actions = { move, insert, del };

  concat(initialInput, inputs).scan((acc, { action, key }) => {
    const { pos, input } = actions[action](acc.pos, acc.input, key);
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
  }, { pos: 0, input: '', json: initialJson, valid: true })
  .subscribe(({ pos, input, json, valid }) => {
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

function move(pos, input, key) {
  if (key === 'append') {
    return { pos: pos + 1, input };
  }
  if (key === 'h') {
    return { pos: Math.max(pos - 1, 0), input };
  }
  if (key === 'l') {
    return { pos: Math.min(pos + 1, input.length - 1), input };
  }
  if (key === '0') {
    return { pos: 0, input };
  }
  if (key === '$') {
    return { pos: input.length - 1, input };
  }
}

function insert(pos, input, key) {
  if (pos === 0) {
    return { pos: key.length, input: key + input };
  }
  return {
    pos: pos + key.length,
    input: input.slice(0, pos) + key + input.slice(pos)
  };
}

function del(pos, input) {
  if (pos === 0) {
    return { pos, input };
  }
  return { pos: pos - 1, input: input.slice(0, pos - 1) + input.slice(pos) };
}
