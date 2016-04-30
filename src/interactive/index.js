import {
  matchesProperty
} from 'lodash';
import { realTerminal as term } from 'terminal-kit';
import { Observable } from 'rxjs';
import buffer from './buffer.js';

const { fromEvent } = Observable;

export default function interactive(data, args) {

  term.fullscreen();
  term.grabInput(true);

  const keypresses = fromEvent(term, 'key', (key, matches, data) => ({ key, matches, data })).share();

  buffer(data, args, term.height - 1, term.width, keypresses)
  .subscribe(({ pos, input, json, scroll, valid }) => {
    term.clear();
    if (valid) {
      term(`${input}\n`);
    } else {
      term.red(`${input}\n`);
    }
    term(getVisible(json, scroll));
    term.moveTo(pos + 1, 1);
  });

  keypresses.filter(matchesProperty('key', 'CTRL_C')).subscribe(term.processExit.bind(term, 0));

}

function getVisible(str, n = 0) {
  const lines = str.split('\n');
  return lines.slice(n, n + term.height - 1).join('\n');
}
