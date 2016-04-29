import {
  isEmpty,
  matchesProperty
} from 'lodash';
import { realTerminal as term } from 'terminal-kit';
import { Observable } from 'rxjs';
import parseArgs from '../parseArgs.js';
import { evalChain } from '../eval.js';
import buffer from './buffer.js';

const { fromEvent } = Observable;

export default function interactive(data, args) {

  const initialJson = getVisible(JSON.stringify(data, null, 2));

  term.fullscreen();
  term.grabInput(true);

  const keypresses = fromEvent(term, 'key', (key, matches, data) => ({ key, matches, data })).share();

  buffer(args, keypresses).scan((acc, { pos, input }) => {
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
