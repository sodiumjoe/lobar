import {
} from 'lodash';
import { parse } from 'shell-quote';
import { evalChain } from '../eval.js';
import { parseArgs } from '../parseArgs.js';

export default function getComputedJson(buffer, data, debounce = 10) {

  return buffer
  .debounceTime(debounce)
  .pluck('input')
  .distinctUntilChanged()
  .map(input => {
    try {
      const args = parseArgs(parse(input));
      return evalChain(data, args);
    } catch(e) { /* */ }
  });

}
