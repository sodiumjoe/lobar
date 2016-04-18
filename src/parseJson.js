import vm from 'vm';
import { evalWith } from './eval.js';
var emptyContext = new vm.createContext({});
export default function parseJson(str, loose) {
  return loose ? evalWith(`(${str})`, emptyContext) : JSON.parse(str);
}
