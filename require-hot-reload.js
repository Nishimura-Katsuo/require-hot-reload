const fs = require('fs');
const mod = require('module');

const requirearchy = [];
const requireParents = {};
const watching = {};

function requireWithHotReload(...args) {
  let modulePath = require.resolve(args[0]);

  requirearchy.push(modulePath);

  let ret = mod.prototype._require.apply(this, args);
  requirearchy.pop();

  if (ret && fs.existsSync(modulePath)) {
    requireParents[modulePath] = requireParents[modulePath] || {};

    if (!watching[modulePath]) {
      watching[modulePath] = fs.watch(modulePath, {
        persistent: false,
      }, function () {
        let resetList = [modulePath];

        if (requireParents[modulePath]) {
          for (let key in requireParents[modulePath]) {
            if (requireParents[modulePath][key]) {
              resetList.push(key);
            }
          }
        }

        resetList.forEach(key => {
          if (require.cache[key]) {
            delete require.cache[key];
          }

          if (watching[key]) {
            watching[key].close();
            watching[key] = false;
          }
        });
      });
    }

    requirearchy.forEach(parent => {
      if (fs.existsSync(parent)) {
        requireParents[modulePath][parent] = true;
      }
    });
  }

  return ret;
}

function initHotReload () {
  if (!mod.prototype._require && mod.prototype.require !== requireWithHotReload) {
    mod.prototype._require = mod.prototype.require;
    mod.prototype.require = requireWithHotReload;
  } else {
    throw new Error('Unable to init require with hot reload!');
  }
}

module.exports = initHotReload;
module.exports.init = initHotReload;
module.exports.requireParents = requireParents;
module.exports.watching = watching;
