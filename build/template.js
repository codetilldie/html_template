(function() {
  var Filter, HTMLTemplate, assert, each, escapeChars, indexOf, isArray, isObject, logicOperators, stripslashes, trim;

  HTMLTemplate = (function() {
    HTMLTemplate.prototype._compiled = false;

    HTMLTemplate.prototype._handlers = null;

    function HTMLTemplate() {
      this._handlers = [];
      this._filter = new Filter;
      return this;
    }

    HTMLTemplate.prototype.compileString = function(templateString) {
      var err, v, varstr;
      if (this._compiled) {
        throw 'The instance has compiled template';
      }
      this._checkGlobalSyntax(templateString);
      this._args = [];
      templateString = this._clearComments(templateString);
      templateString = this._addSlashes(templateString);
      templateString = this._parseSyntax(templateString);
      templateString = this._parseData(templateString);
      varstr = (function() {
        var _i, _len, _ref, _results;
        _ref = this._args;
        _results = [];
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          v = _ref[_i];
          _results.push("" + v + " = __context['" + v + "']");
        }
        return _results;
      }).call(this);
      this._compiledString = "var " + (varstr.join(',')) + ";\nvar __ret = [];\n__ret.push(\"" + templateString + "\");\nreturn __ret.join('');";
      try {
        this._render = new Function('__context', '__filter', '__assert', '__isArray', '__isObject', '__foreach', this._compiledString);
      } catch (_error) {
        err = _error;
        if (this._templateUrl) {
          console.log('HTMLTemplate Error:', this._templateUrl);
        }
        throw err;
      }
      this._compiled = true;
      this._oncompiled();
      return this;
    };

    HTMLTemplate.prototype.compileFunction = function(templateFunction) {
      if (this._compiled) {
        throw 'This instance has compiled template';
      }
      if (typeof templateFunction !== 'function') {
        throw "HTMLTemplate.compileFunction: given not a function";
      }
      return this.compileString(templateFunction.toString().replace(this._regFlag, ''));
    };

    HTMLTemplate.prototype.loadTemplate = function(templateUrl) {
      var failStr, xhr;
      if (!templateUrl) {
        throw 'HTMLTemplate.loadTemplate: templateUrl required';
      }
      this._templateUrl = templateUrl;
      if (HTMLTemplate._htmlCache[templateUrl]) {
        return this.compileString(HTMLTemplate._htmlCache[templateUrl]);
      }
      failStr = "HTMLTemplate.loadTemplate: " + templateUrl + " loaded fail";
      if (typeof XMLHttpRequest !== 'undefined') {
        xhr = new XMLHttpRequest;
      } else if (typeof ActiveXObject !== 'undefined') {
        xhr = new ActiveXObject('Microsoft.XMLHTTP');
      } else {
        throw 'Your browser not supported XMLHTTP';
      }
      xhr.onreadystatechange = (function(_this) {
        return function() {
          var _ref;
          if (xhr.readyState === 4 && (200 <= (_ref = xhr.status) && _ref < 400)) {
            HTMLTemplate._htmlCache[templateUrl] = xhr.responseText;
            _this.compileString(xhr.responseText);
            return xhr = null;
          }
        };
      })(this);
      xhr.open('GET', templateUrl, true);
      xhr.send(null);
      return this;
    };

    HTMLTemplate.prototype.oncompiled = function(handler, data) {
      if (typeof handler !== 'function') {
        throw 'HTMLTemplate.oncompiled(handler): handler must be function';
      }
      if (this._compiled) {
        handler.call(this, this.renderToHtml(data));
      } else {
        this._handlers.push({
          fn: handler,
          data: data
        });
      }
      return this;
    };

    HTMLTemplate.prototype.renderToDom = function(node, data) {
      var elem, html;
      if (arguments.length !== 2) {
        throw "HTMLTemplate.renderToDom(node, data): args required 2";
      }
      if (!this._compiled) {
        this._handlers.push({
          to: node,
          data: data
        });
        return this;
      }
      html = this.renderToHtml(data);
      elem = function(id) {
        return document.getElementById(id);
      };
      if (node.nodeType) {
        node.innerHTML = html;
      } else if (typeof node === 'string' && (node = elem(node))) {
        node.innerHTML = html;
      } else {
        throw 'HTMLTemplate.renderToDom(node, data): invalid node';
      }
      return this;
    };

    HTMLTemplate.prototype.renderAtDom = function(node, data) {
      var elem, html;
      if (arguments.length !== 2) {
        throw "HTMLTemplate.renderAtDom(node, data): args required 2";
      }
      if (!this._compiled) {
        this._handlers.push({
          at: node,
          data: data
        });
        return this;
      }
      html = this.renderToHtml(data);
      if (!this.__wrap) {
        this.__wrap = document.createElement('div');
        this.__frag = document.createDocumentFragment();
      }
      this.__wrap.innerHTML = html;
      while (this.__wrap.firstChild) {
        this.__frag.appendChild(this.__wrap.firstChild);
      }
      elem = function(id) {
        return document.getElementById(id);
      };
      if (node.nodeType) {
        node.parentNode.replaceChild(this.__frag, node);
      } else if (typeof node === 'string' && (node = elem(node))) {
        node.parentNode.replaceChild(this.__frag, node);
      } else {
        throw 'HTMLTemplate.renderAtDom(node, data): invalid node';
      }
      return this;
    };

    HTMLTemplate.prototype.renderToHtml = function(context) {
      if (context !== void 0 && !isObject(context)) {
        throw 'HTMLTemplate.renderToHtml(context): context must be JSON';
      }
      context = context || {};
      return this._render(context, this._filter, assert, isArray, isObject, each);
    };

    HTMLTemplate.prototype.addFilter = function(name, func) {
      if (arguments.length !== 2) {
        throw "HTMLTemplate.addFilter(name, func): args required 2";
      }
      this._filter[name] = func;
      return this;
    };

    HTMLTemplate.prototype.addFilters = function(filters) {
      if (!isObject(filters)) {
        throw "HTMLTemplate.addFilters(filters): filters must be an object";
      }
      each(filters, (function(_this) {
        return function(func, name) {
          return _this._filter[name] = func;
        };
      })(this));
      return this;
    };

    HTMLTemplate.prototype.debug = function() {
      return console.log(this._render.toString());
    };

    HTMLTemplate.prototype._render = function() {
      return 'This instance has not compiled template yet';
    };

    HTMLTemplate.prototype._oncompiled = function() {
      var handler, _results;
      if (this._handlers.length === 0) {
        return;
      }
      _results = [];
      while (this._handlers.length) {
        handler = this._handlers.shift();
        if (handler.to) {
          _results.push(this.renderToDom(handler.to, handler.data));
        } else if (handler.at) {
          _results.push(this.renderAtDom(handler.at, handler.data));
        } else if (handler.fn) {
          _results.push(this.oncompiled(handler.fn, handler.data));
        } else {
          _results.push(void 0);
        }
      }
      return _results;
    };

    HTMLTemplate.prototype._data_idx = 0;

    HTMLTemplate.prototype._indent_count = 0;

    HTMLTemplate.prototype._syntaxRe = /^([\s\S]*?){%\s*((\w+) [\s\S]*?)%}(.+){%\s*end\3[^%]+%}(.*)$/g;

    HTMLTemplate.prototype._regFlag = new RegExp("[^\\/*]+\\/\\*<!--|-->\\*\\/[^}]*\\}", 'gm');

    HTMLTemplate.prototype._indent = function() {
      return new Array(this._indent_count + 1).join('  ');
    };

    HTMLTemplate.prototype._checkGlobalSyntax = function(str) {
      var closeReExp, closeStack, keyword, startReExp, startStack, warnString, _i, _len, _ref, _results;
      _ref = ['for', 'if', 'ifequal', 'ifnotequal'];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        keyword = _ref[_i];
        startReExp = new RegExp("{%\\s*" + keyword + " ([\\s\\S]*?)%}", 'g');
        closeReExp = new RegExp("{%\\s*end" + keyword + "\\s*%}", 'g');
        startStack = str.match(startReExp);
        closeStack = str.match(closeReExp);
        warnString = "{% " + keyword + " %} not match {% end" + keyword + " %}";
        _results.push(this._syntaxMatch(startStack, closeStack, warnString));
      }
      return _results;
    };

    HTMLTemplate.prototype._syntaxMatch = function(a, b, warn) {
      if (a === null) {
        if (b !== null) {
          console.log('---------------------------------------------');
          console.log(a);
          console.log(b);
          console.log('---------------------------------------------');
          throw "HTMLTemplate Error: " + warn + " from " + this._templateUrl;
        }
      } else {
        if (b === null || a.length !== b.length) {
          console.log('---------------------------------------------');
          console.log(a);
          console.log(b);
          console.log('---------------------------------------------');
          throw "HTMLTemplate Error: " + warn + " from " + this._templateUrl;
        }
      }
    };

    HTMLTemplate.prototype._clearComments = function(str) {
      return str.replace(/{#([\s\S]*?)#}/g, '').replace(/(\r*\n|\t|\s)+/g, ' ');
    };

    HTMLTemplate.prototype._addSlashes = function(str) {
      return str.replace(/("|')/g, "\\$1");
    };

    HTMLTemplate.prototype._parseSyntax = function(str) {
      return str.replace(/{%([\s\S]*?)%}/g, (function(_this) {
        return function(a, s) {
          var execute, expr, keyword, method;
          s = stripslashes(s);
          keyword = s.match(/\w+/)[0];
          method = "_" + keyword + "_parser";
          if (typeof _this[method] === 'undefined') {
            throw "HTMLTemplate: unknow syntax " + a;
          }
          expr = s.replace(new RegExp("^\\s*" + keyword), '');
          execute = _this[method](expr);
          return "\");\n" + execute + "\n__ret.push(\"";
        };
      })(this));
    };

    HTMLTemplate.prototype._parseData = function(str) {
      return str.replace(/{{([\s\S]*?)}}/g, (function(_this) {
        return function(a, s) {
          s = stripslashes(s);
          _this._addArguments(s);
          s = _this._parseFilter("" + a, s);
          return "\", " + s + ", \"";
        };
      })(this));
    };

    HTMLTemplate.prototype._parseFilter = function(str, s) {
      var arr, filters;
      if (s.indexOf("|") === -1) {
        return s;
      }
      filters = trim(s).split(/\s*\|\s*/);
      if (filters.length === 2 && filters[1] === '') {
        throw "HTMLTemplate: invalid syntax " + str;
      }
      arr = ["__filter.__set(" + filters[0] + ", '" + str + "')"];
      filters.shift();
      each(filters, function(f) {
        if (f.indexOf(':') !== -1) {
          f = "__execute('" + (f.replace(':', "',")) + ")";
        } else {
          f = "__execute('" + f + "')";
        }
        return arr[arr.length] = f;
      });
      arr.push('__get()');
      return arr.join(".");
    };

    HTMLTemplate.prototype._stripFilter = function(str) {
      return str.split(/\s*\|\s*/)[0];
    };

    HTMLTemplate.prototype._addArguments = function(str) {
      var arr;
      arr = trim(str).split(/[.| ]+/);
      str = arr[0];
      if (/^[a-zA-Z$_]+$/.test(str) && indexOf(this._args, str) === -1) {
        return this._args.push(str);
      }
    };

    HTMLTemplate.prototype._for_parser = function(expr) {
      var filter, i, key, kv, list, parts, temp, val;
      parts = trim(expr).split(/\s+in\s+/);
      assert(parts.length === 2, "HTMLTemplate: {% for" + expr + " %} invalid syntax");
      list = parts[1];
      this._addArguments(list);
      temp = this._parseFilter("{% for" + expr + " %}", list);
      list = this._stripFilter(list);
      i = this._data_idx++;
      filter = "var __data" + i + " = " + temp + ";\nvar log = \"HTMLTemplate: {% for" + expr + "%} " + list + " invalid list\";\n__assert(__isArray(__data" + i + ") || __isObject(__data" + i + "), log);";
      if (parts[0].indexOf(',') !== -1) {
        kv = parts[0].split(/\s*,\s*/);
        key = kv[0];
        val = kv[1];
        if (key === '' || val === '') {
          throw "HTMLTemplate: {% for" + expr + " %} invalid syntax";
        }
      } else {
        key = '__key';
        val = parts[0];
      }
      return "" + filter + "\n__foreach(__data" + i + ", function (__item, __i) {\n    var " + key + " = __i, " + val + " = __item;";
    };

    HTMLTemplate.prototype._endfor_parser = function(expr) {
      return '});';
    };

    HTMLTemplate.prototype._if_parser = function(expr) {
      expr = trim(expr).replace(/\w+/g, function(key) {
        return logicOperators[key] || key;
      });
      return "if (" + expr + ") {";
    };

    HTMLTemplate.prototype._ifequal_parser = function(expr) {
      var parts;
      parts = trim(expr).split(/\s+/);
      assert(parts.length === 2, "HTMLTemplate: invalid syntax {% ifequeal" + expr + " %}");
      return "if (" + parts[0] + " == " + parts[1] + ") {";
    };

    HTMLTemplate.prototype._ifnotequal_parser = function(expr) {
      var parts;
      parts = trim(expr).split(/\s+/);
      assert(parts.length === 2, "HTMLTemplate: invalid syntax {% " + expr + " %}");
      return "if (" + parts[0] + " != " + parts[1] + ") {";
    };

    HTMLTemplate.prototype._else_parser = function(expr) {
      return "} else {";
    };

    HTMLTemplate.prototype._endif_parser = function() {
      return '}';
    };

    HTMLTemplate.prototype._endifequal_parser = function() {
      return '}';
    };

    HTMLTemplate.prototype._endifnotequal_parser = function() {
      return '}';
    };

    return HTMLTemplate;

  })();

  HTMLTemplate._htmlCache = {};

  isArray = function(unknow) {
    return Object.prototype.toString.call(unknow) === '[object Array]';
  };

  isObject = function(unknow) {
    return Object.prototype.toString.call(unknow) === '[object Object]';
  };

  assert = function(exp, log) {
    if (!exp) {
      throw log;
    }
  };

  each = function(data, callback) {
    var i, item, key, val, _i, _len, _results, _results1;
    if (isArray(data)) {
      _results = [];
      for (i = _i = 0, _len = data.length; _i < _len; i = ++_i) {
        item = data[i];
        _results.push(callback(item, i));
      }
      return _results;
    } else if (isObject(data)) {
      _results1 = [];
      for (key in data) {
        val = data[key];
        _results1.push(callback(val, key));
      }
      return _results1;
    }
  };

  stripslashes = function(str) {
    return str.replace(/\\("|')/g, "$1");
  };

  logicOperators = {
    not: '!',
    and: '&&',
    or: '||',
    lt: '<',
    gt: '>',
    is: '===',
    isnt: '!==',
    lte: '<=',
    gte: '>='
  };

  escapeChars = {
    '&': "&amp;",
    ' ': "&nbsp;",
    '"': "&quot;",
    "'": "#39;",
    "<": "&lt;",
    ">": "&gt;"
  };

  if (typeof this.console === 'undefined') {
    this.console = {
      log: function() {
        return alert(Array.prototype.join.call(arguments, ''));
      }
    };
  }

  if (String.prototype.trim) {
    trim = function(str) {
      return str.trim();
    };
  } else {
    trim = function(str) {
      return str.replace(/^\s+|\s+$/g, '');
    };
  }

  if (Array.prototype.indexOf) {
    indexOf = function(arr, item) {
      return arr.indexOf(item);
    };
  } else {
    indexOf = function(arr, item) {
      var i, v, _i, _len;
      if (item === v) {
        for (v = _i = 0, _len = arr.length; _i < _len; v = ++_i) {
          i = arr[v];
          return i;
        }
      }
      return -1;
    };
  }

  Filter = (function() {
    function Filter() {}

    Filter.prototype.__set = function(data, express) {
      this.data = data;
      this.express = express;
      return this;
    };

    Filter.prototype.__execute = function(method) {
      var args;
      assert(typeof this[method] === 'function', "Filter: '" + method + "' filter not found from " + this.express);
      args = Array.prototype.slice.call(arguments, 1);
      args.unshift(this.data);
      this.data = this[method].apply(this, args);
      return this;
    };

    Filter.prototype.__get = function() {
      return this.data;
    };

    Filter.prototype.trim = function(str) {
      assert(typeof str === 'string', "Filter.trim: " + str + " is not a string, from " + this.express);
      return trim(str);
    };

    Filter.prototype.escape = function(str) {
      assert(typeof str === 'string', "Filter.escape: " + str + " is not a string, from " + this.express);
      return str.replace(/[<>& \r\n"']/gm, function(s) {
        return escapeChars[s];
      });
    };

    Filter.prototype.lower = function(str) {
      assert(typeof str === 'string', "Filter.lower: " + str + " is not a string, from " + this.express);
      return str.toLowerCase();
    };

    Filter.prototype.upper = function(str) {
      assert(typeof str === 'string', "Filter.upper: " + str + " is not a string, from " + this.express);
      return str.toUpperCase();
    };

    Filter.prototype.truncate = function(str, length, addDot) {
      assert(typeof str === 'string', "Filter.truncate: " + str + " is not a string, from " + this.express);
      assert(!isNaN(length), "Filter.truncate: " + length + " is not a number, from " + this.express);
      if (addDot) {
        return "" + (str.slice(0, length)) + "...";
      }
      return "" + (str.slice(0, length));
    };

    Filter.prototype.addslashes = function(str) {
      assert(typeof str === 'string', "Filter.addslashes: " + str + " is not a string, from " + this.express);
      return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
    };

    Filter.prototype.stripslashes = function(str) {
      assert(typeof str === 'string', "Filter.stripslashes:" + str + " is not a string, from " + this.express);
      return str.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\0/g, '\0').replace(/\\\\/g, '\\');
    };

    Filter.prototype.capfirst = function(str) {
      assert(typeof str === 'string', "Filter.capfirst: " + str + " is not a string, from " + this.express);
      return "" + (str[0].toUpperCase()) + (str.slice(1));
    };

    Filter.prototype.length = function(data) {
      assert(data.length !== void 0, "Filter.length: " + data + " has no length, from " + this.express);
      return data.length;
    };

    Filter.prototype.striptags = function(str) {
      assert(typeof str === 'string', "Filter.striptags: " + str + " is not a string, from " + this.express);
      return str.replace(/(<([^>]+)>)/ig, "");
    };

    Filter.prototype["default"] = function(data, val) {
      if (data === void 0 || data === null) {
        return val;
      }
      return data;
    };

    Filter.prototype.reverse = function(arr) {
      var tmp;
      assert(isArray(arr), "Filter.reverse: " + arr + " is not an array, from " + this.express);
      tmp = [];
      each(arr, function(item) {
        return tmp.unshift(item);
      });
      return tmp;
    };

    Filter.prototype.count = function(obj) {
      var count;
      assert(isObject(obj), "Filter.count: " + obj + " is not an object, from " + this.express);
      count = 0;
      each(obj, function() {
        return count += 1;
      });
      return count;
    };

    Filter.prototype.debug = function(data) {
      console.log('[express]:', this.express);
      console.log('[data]:   ', data);
      return data;
    };

    return Filter;

  })();

  if (typeof module !== 'undefined') {
    module.exports = HTMLTemplate;
  } else if (typeof define === 'function' && define.amd) {
    define('HTMLTemplate', [], function() {
      return HTMLTemplate;
    });
  } else {
    this.HTMLTemplate = HTMLTemplate;
  }

}).call(this);
