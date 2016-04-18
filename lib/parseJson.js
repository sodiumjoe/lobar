var vm = require('vm');
var emptyContext = new vm.createContext({});
var evalUtils = require('./eval.js');
module.exports = function parseJson(str, loose) {
  return loose ? evalUtils.with('(' + str + ')', emptyContext) : JSON.parse(str);
};
