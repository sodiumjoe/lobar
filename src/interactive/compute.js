import { parse } from 'shell-quote';
import { evalChain } from '../eval.js';
import { parseArgs } from '../parseArgs.js';

export default function getComputedJson(data, buffer, debounce = 10) {

  return buffer
  .debounceTime(debounce)
  .pluck('input')
  .startWith('')
  .distinctUntilChanged()
  .map(input => {
    try {
      return evalChain(data, parseArgs(parse(input)));
    } catch(e) { /* */ }
  });

}
