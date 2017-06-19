// Like universalify, but with separate data/err callbacks
module.exports = function (fn) {
  return Object.defineProperty(function () {
    if (arguments.length >= 2 && typeof arguments[arguments.length - 1] === 'function' && typeof arguments[arguments.length - 2] === 'function') fn.apply(this, arguments);
    else {
      return new Promise((resolve, reject) => {
        arguments[arguments.length] = function (res) {
          resolve(res);
        };
        arguments.length++;
        arguments[arguments.length] = function (err) {
          reject(err);
        };
        arguments.length++
        fn.apply(this, arguments)
      })
    }
  }, 'name', { value: fn.name });
}
