(function () {

// var tpl = new Template(templateString)
// var tpl = new Template(templateScriptTagId)
// var tpl = new Template(templateFunction)
//
// <script type='text/tpl' id='detailHtml'>
// {# args: data, name #}
// {% for item in data %}
//   <div>{{ name }}</div>
//   <div>{{ data[name] }}</div>
// {% endfor %}
// </script>
// var tpl = new Template('detailHtml')
// tpl.render_to_html(document.body, data)
// document.body.innerHTML = tpl.render(data)

function Template(tmpl) {
    var type = typeof tmpl;
    if (type === 'string') {
        if (document.getElementById(tmpl)) {
            var template = document.getElementById(tmpl);
            this.get_template(template.innerHTML || '');
        } else
            this.get_template(tmpl);
    } else if (type === 'function')
        this.parse_function(tmpl);
}

Template.prototype = function () {
    
    var assert = function (expr, info) {
        if (!expr) throw new Error(info);
    };
    var logicOperators = {
        "not": "!",
        "and": "&&",
        "or":  "||"
    };
    var trim = function () {
        if (String.prototype.trim) {
            return function (str) {
                return str.trim();
            };
        } else {
            return function (str) {
                return str.replace(/^\s+|\s+$/g, '');
            };
        }
    }();
    
    /**
     * 语法编译
     */
    var keywordHandlers = {
        "for" : function (expr) {
            expr = trim(expr).split(/\s+in\s+/);
            var info = [
                "Illegal expression: 'for ",
                expr.join(' '), "."
            ].join('');
            assert(expr.length == 2, info);
            return [
                "__forStack.push({",
                "    counter: 1,",
                "    counter0: 0,",
                "    parentloop: __forStack[__forStack.length - 1],",
                "    _valueOf : Template._get_value_handler(", expr[1], "),",
                "    _isLast : Template._chk_last_handler(", expr[1], ")",
                "});",
                "var __count__;",
                "for (__count__ in " , expr[1] , ") {",
                "    var forloop = __forStack[__forStack.length - 1];",
                "    forloop.first = forloop.counter == 1;",
                "    forloop.last = forloop._isLast(__count__);",
                "    var " , expr[0] , " = forloop._valueOf(__count__, " ,
                expr[1] , ");"
            ].join('');
        },
        "endfor" : function () {
            return [
                "    ++__forStack[__forStack.length - 1].counter;",
                "    ++__forStack[__forStack.length - 1].counter0;",
                "}",
                "__forStack.pop();",
                "if (__forStack.length > 1)",
                "    forloop = __forStack[__forStack.length - 1];"
            ].join('');
        },
        "if" : function (expr) {
            expr = trim(expr).replace(/\w+/g, function (k) {
                return logicOperators[ k ] || k;
            });
            return ["if (" , expr , ") {"].join('');
        },
        "ifequal" : function (expr) {
            expr = trim(expr).split(/\s+/);
            var info = [
                "Illegal expression: 'ifequal ",
                expr.join(' '), "'."
            ].join('');
            assert(expr.length == 2, info);
            return ["if (" , expr[0], " == ", expr[1], ") {"].join('');
        },
        "ifnotequal" : function (expr) {
            expr = trim(expr).split(/\s+/);
            var info = [
                "Illegal expression: 'ifnotequal ",
                expr.join(' '), "'."
            ].join('');
            assert(expr.length == 2, info);
            return ["if (" , expr[0], " != ", expr[1], ") {"].join('');
        },
        "else" : function () {
            return "} else {";
        }
    };
    var _commonHandler = function () {
        return "}";
    };
    
    "endif,endifequal,endifnotequal".replace(/\w+/g,
        function (kw) {
            keywordHandlers[ kw ] = _commonHandler;
        }
    );
    
    /**
     * 数据处理类
     */
    var escapeChars = {
        '&' : "&amp;",
        ' ' : "&nbsp;",
        '"' : "&quot;",
        "'" : "#39;",
        "<" : "&lt;",
        ">" : "&gt;"
    };
    Template._DataFilter = function (data) {
        this.data = data;
        this.toString = function () {
            return this.data;
        };
    };
    Template._DataFilter.prototype = {
        trim : function () {
            assert(typeof this.data === "string",
                   this.data + " is not a string.");
            trim(this.data);
            return this;
        },
        escape : function () {
            assert(typeof this.data === "string",
                   this.data + " is not a string.");
            this.data = this.data.replace(/[<>& \r\n"']/gm,
                function (s) {
                    return escapeChars[s];
                }
            );
            return this;
        },
        lower : function () {
            assert(typeof this.data === "string",
                   this.data + " is not a string.");
            this.data = this.data.toLowerCase();
            return this;
        },
        upper : function () {
            assert(typeof this.data === "string",
                   this.data + " is not a string.");
            this.data = this.data.toUpperCase();
            return this;
        },
        truncatewords : function (num) {
            assert(typeof this.data === "string",
                   this.data + " is not a string.");
            this.data = this.data.slice(0, num) + "...";
            return this;
        },
        addslashes : function () {
            assert(typeof this.data === "string",
                   this.data + " is not a string.");
            this.data = this.data.replace();
            return this;
        },
        debug : function () {
        
        },
        capfirst : function () {
            assert(typeof this.data === "string",
                   this.data + " is not a string.");
            this.data = this.data.charAt(0).toUpperCase() + this.data.slice(1);
            return this;
        },
        length : function () {
            assert(this.data.length !== void 0,
                   this.data + " has no attribute length.");
            return this.data.length;
        },
        striptags : function () {
            assert(typeof this.data === "string",
                   this.data + " is not a string.");
            this.data = this.data.replace();
            return this;
        }
    };
    
    /**
     * 语法编译
     */
    function unescapeQuotes(str) {
        return str.replace(/\\("|')/g, "$1");
    }
    function getArguments(str) {
        var reg = /{#\s*args:([\s\S]*?)\s*#}/;
        var ret = [];
        str.replace(reg, function (a, s) {
            var arr = s.split(/\s*,\s*/);
            for (var i = 0, e; e = arr[i++];) {
                e = e.replace(/^\s*|\s*$/g, '');
                ret.push("var " + e + " = context['" + e + "'];");
            }
        });
        return ret.join('');
    }
    var parseFuncs = [
        function clearComment(str) {
            return str.replace(/{#([\s\S]*?)#}/g, '')
                .replace(/(\r*\n|\t|\s)+/g, ' ');
        },        
        function escapeQuotes(str) {
            return str.replace(/("|')/g, "\\$1");
        },    
        function parseSyntax(str) {
            return str.replace(/{%([\s\S]*?)%}/g, function (a, s) {
                s = unescapeQuotes(s);
                var keyword = s.match(/\w+/)[0];
                var expr = s.replace(new RegExp("^\\s*" + keyword), '');
                
                return [
                    '");',
                    keywordHandlers[ keyword ]( expr ),
                    '_ret.push("'
                ].join('');
            });
        },        
        function parseData(str) {
            return str.replace(/{{([\s\S]*?)}}/g, function (a, s) {
                s = unescapeQuotes(s);
                if (s.indexOf("|") !== -1) {
                    var filters = s.split("|");
                    var arr = ["new Template._DataFilter(" + filters[0] + ")"];
                    for (var i = 1, f; f = filters[i++];) {
                        if (f.match(/:["']/)) {
                            f = f.replace(/:["']([^"']+)["']/, "($1)");
                        } else f += '()';
                        arr[arr.length] = f;
                    }
                    s = arr.join(".");
                }
                return ['",', s, ',"'].join('');
            });
        }
    ];
        
    /**
     * 返回API
     */
    return {
        get_template : function (str) {
            var _args = getArguments(str);
            for (var i = 0, fn; fn = parseFuncs[i++];) {
                str = fn(str);
            }
            this.render = new Function ('context', [
                'context = context || {};',
                _args,
                'var _ret = [];',
                'var __forStack = [{counter: 1, counter0: 0}];',
                '_ret.push("',  str, '");',
                'return _ret.join("");'
            ].join(''));
            return this;
        },
        _re: new RegExp("[^\\/*]+\\/\\*<!--|-->\\*\\/[^}]*\\}", 'gm'),
        parse_function: function (fn) {
            this.get_template(
                fn.toString().replace(this._re, ''));
            return this;
        },
        render : function () {
            throw new Error("This instance has not initialize");
        },
        render_to_html : function (target, context) {
            var html = this.render(context);
            if (target.nodeType) {
                target.innerHTML = html;
            } else if (typeof target === "string"
                && (target = document.getElementById(target))) {
                target.innerHTML = html;
            } else {
                throw new TypeError();
            }
            return this;
        },
        debug : function () {
            //console.log( this._codes );
        }
    };
}();

var tostring = Object.prototype.toString;
var isarray = function (obj) {
    return tostring.call(obj) === '[object Array]';
};

Template._get_value_handler = function () {
    var arr_handler = function (i, arr) {
        return arr[i];
    };
    var obj_handler = function (k) {
        return k;
    };
    return function (obj) {
        return isarray(obj) ? arr_handler :
                              obj_handler;
    };
}();
Template._chk_last_handler = function (obj) {
    if (isarray(obj))
        var len = obj.length;
    else {
        var len = 0;
        for (var i in obj) len++;
    }
    --len;
    return function (j) {
        return j == len;
    };
};

this.Template = Template;

})();
