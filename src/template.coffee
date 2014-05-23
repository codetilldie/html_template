class HTMLTemplate

    _compiled: false
    _handlers: null

    constructor: () ->
        @_handlers = []
        @_filter = new Filter
        return @

    compileString: (templateString) ->
        throw 'The instance has compiled template' if @_compiled
        @_checkGlobalSyntax templateString
        args = @_getArguments templateString
        templateString = @_clearComments templateString
        templateString = @_addSlashes    templateString
        templateString = @_parseSyntax   templateString
        templateString = @_parseData     templateString

        @_compiledString = """
            "use strict";
            #{args}
            var __ret = [];
            __ret.push("#{templateString}");
            return __ret.join('');
        """

        try
            @_render = new Function(
                '__context', '__filter',   '__assert',
                '__isArray', '__isObject', '__foreach', @_compiledString)
        catch err
            console.log('Error from:', @_templateUrl) if @_templateUrl
            throw err
        
        @_compiled = true
        @_oncompiled()
        return @

    compileFunction: (templateFunction) ->
        throw 'This instance has compiled template' if @_compiled
        if typeof templateFunction isnt 'function'
            throw "HTMLTemplate.compileFunction: given not a function"
        return @compileString templateFunction.toString().replace @_regFlag, ''

    loadTemplate: (templateUrl) ->
        if not templateUrl
            throw 'HTMLTemplate.loadTemplate: templateUrl required'

        @_templateUrl = templateUrl
        if HTMLTemplate._htmlCache[templateUrl]
            return @compileString HTMLTemplate._htmlCache[templateUrl]

        failStr = "HTMLTemplate.loadTemplate: #{templateUrl} loaded fail"
        if typeof XMLHttpRequest isnt 'undefined'
            xhr = new XMLHttpRequest
        else if typeof ActiveXObject isnt 'undefined'
            xhr = new ActiveXObject 'Microsoft.XMLHTTP'
        else
            throw 'Your browser not supported XMLHTTP'
        xhr.onreadystatechange = =>
            if xhr.readyState is 4 and 200 <= xhr.status < 400
                HTMLTemplate._htmlCache[templateUrl] = xhr.responseText
                @compileString xhr.responseText
                xhr = null
        xhr.open 'GET', templateUrl, true
        xhr.send null
        return @

    oncompiled: (handler, data) ->
        if typeof handler isnt 'function'
            throw 'HTMLTemplate.oncompiled(handler): handler must be function'
        if @_compiled
            handler.call @, @renderToHtml(data)
        else
            @_handlers.push fn: handler, data: data
        return @
        
    renderToDom: (node, data) ->
        if arguments.length isnt 2
            throw "HTMLTemplate.renderToDom(node, data): args required 2"
        if not @_compiled
            @_handlers.push to: node, data: data
            return @
        html = @renderToHtml data
        elem = (id) -> return document.getElementById id
        if node.nodeType
            node.innerHTML = html
        else if typeof(node) is 'string' and node = elem(node)
            node.innerHTML = html
        else
            throw 'HTMLTemplate.renderToDom(node, data): invalid node'
        return @

    renderAtDom: (node, data) ->
        if arguments.length isnt 2
            throw "HTMLTemplate.renderAtDom(node, data): args required 2"
        if not @_compiled
            @_handlers.push at: node, data: data
            return @
        html = @renderToHtml data
        if not @__wrap
            @__wrap = document.createElement 'div'
            @__frag = document.createDocumentFragment()
        @__wrap.innerHTML = html
        while @__wrap.firstChild
            @__frag.appendChild @__wrap.firstChild
        elem = (id) -> return document.getElementById id
        if node.nodeType
            node.parentNode.replaceChild @__frag, node
        else if typeof(node) is 'string' and node = elem(node)
            node.parentNode.replaceChild @__frag, node
        else
            throw 'HTMLTemplate.renderAtDom(node, data): invalid node'
        return @

    renderToHtml: (context) ->
        if context isnt undefined and not isObject(context)
            throw 'HTMLTemplate.renderToHtml(context): context must be JSON'
        context = context or {}
        return @_render context, @_filter, assert, isArray, isObject, each

    addFilter: (name, func) ->
        if arguments.length isnt 2
            throw "HTMLTemplate.addFilter(name, func): args required 2"
        @_filter[name] = func
        return @

    addFilters: (filters) ->
        if not isObject(filters)
            throw "HTMLTemplate.addFilters(filters): filters must be an object"
        each filters, (func, name) =>
            @_filter[name] = func
        return @

    debug: ->
        console.log @_render.toString()

    _render: ->
        'This instance has not compiled template yet'
    
    _oncompiled: ->
        return if @_handlers.length is 0
        while @_handlers.length
            handler = @_handlers.shift()
            if handler.to
                @renderToDom handler.to, handler.data
            else if handler.at
                @renderAtDom handler.at, handler.data
            else if handler.fn
                @oncompiled  handler.fn, handler.data

    _data_idx: 0
    _indent_count: 0,

    _syntaxRe: /^([\s\S]*?){%\s*((\w+) [\s\S]*?)%}(.+){%\s*end\3[^%]+%}(.*)$/g,

    _regFlag: new RegExp "[^\\/*]+\\/\\*<!--|-->\\*\\/[^}]*\\}", 'gm'

    _indent: ->
        return new Array(@_indent_count + 1).join('  ')

    _checkGlobalSyntax: (str) ->
        for keyword in ['for', 'if', 'ifequal', 'ifnotequal']
            startReExp = new RegExp "{%\\s*#{keyword} ([\\s\\S]*?)%}", 'g'
            closeReExp = new RegExp "{%\\s*end#{keyword}\\s*%}", 'g'
            startStack = str.match startReExp
            closeStack = str.match closeReExp
            warnString = "{% #{keyword} %} not match {% end#{keyword} %}"
            @_syntaxMatch startStack, closeStack, warnString

    _syntaxMatch: (a, b, warn) ->
        if a is null
            if b isnt null
                console.log '---------------------------------------------'
                console.log a
                console.log b
                console.log '---------------------------------------------'
                throw "HTMLTemplate Error: #{warn} from #{@_templateUrl}"
        else
            if b is null or a.length isnt b.length
                console.log '---------------------------------------------'
                console.log a
                console.log b
                console.log '---------------------------------------------'
                throw "HTMLTemplate Error: #{warn} from #{@_templateUrl}"

    _clearComments: (str) ->
        str.replace(/{#([\s\S]*?)#}/g, '').replace(/(\r*\n|\t|\s)+/g, ' ')

    _addSlashes: (str) ->
        str.replace(/("|')/g, "\\$1")

    _parseSyntax: (str) ->
        str.replace /{%([\s\S]*?)%}/g, (a, s) =>
            s       = stripslashes s
            keyword = s.match(/\w+/)[0]
            method  = "_#{keyword}_parser"

            if typeof @[method] is 'undefined'
                throw "HTMLTemplate: unknow syntax #{a}"

            expr    = s.replace(new RegExp("^\\s*" + keyword), '')
            execute = @[method] expr
              
            return """\");
                #{execute}
                __ret.push(\""""

    _parseData: (str) ->
        str.replace /{{([\s\S]*?)}}/g, (a, s) =>
            s = stripslashes s
            s = @_parseFilter "#{a}", s
            return "\", #{s}, \""

    _parseFilter: (str, s) ->
        if s.indexOf("|") is -1
            return s
        filters = trim(s).split /\s*\|\s*/
        if filters.length is 2 and filters[1] is ''
            throw "HTMLTemplate: invalid syntax #{str}"
        arr = ["__filter.__set(#{filters[0]}, '#{str}')"]
        filters.shift()
        each filters, (f) ->
            if f.indexOf(':') isnt -1
                f = "__execute('#{f.replace(':', "',")})"
            else
                f = "__execute('#{f}')"
            arr[arr.length] = f
        arr.push '__get()'
        return arr.join "."

    _stripFilter: (str) ->
        return str.split(/\s*\|\s*/)[0]

    _getArguments: (str) ->
        ret = []
        str.replace /{#\s*args:([\s\S]*?)\s*#}/, (a, s) ->
            vars = s.split /\s*,\s*/
            each vars, (v) ->
                v = v.replace /^\s*|\s*$/g, ''
                ret.push "#{v} = __context['#{v}']"
        return if ret.length then "var #{ret.join(',')};" else ''

    ###
    _include_parser: (url) ->
        console.log url
        return ''
    ###

    _for_parser: (expr) ->
        parts = trim(expr).split /\s+in\s+/
        assert parts.length is 2,
            "HTMLTemplate: {% for#{expr} %} invalid syntax"
        
        list = parts[1]
        temp = @_parseFilter "{% for#{expr} %}", list
        list = @_stripFilter list
        i    = @_data_idx++
        filter = """
            var __data#{i} = #{temp};
            var log = "HTMLTemplate: {% for#{expr}%} #{list} invalid list";
            __assert(__isArray(__data#{i}) || __isObject(__data#{i}), log);
        """

        if parts[0].indexOf(',') isnt -1
            kv = parts[0].split /\s*,\s*/
            key = kv[0]
            val = kv[1]
            if key is '' or val is ''
                throw "HTMLTemplate: {% for#{expr} %} invalid syntax"
        else
            key = '__key'
            val = parts[0]

        return """
            #{filter}
            __foreach(__data#{i}, function (__item, __i) {
                var #{key} = __i, #{val} = __item;
        """

    _endfor_parser: (expr) ->
        return '})'

    _if_parser: (expr) ->
        expr = trim(expr).replace /\w+/g, (key) ->
            logicOperators[key] or key
        return "if (#{expr}) {"

    _ifequal_parser: (expr) ->
        parts = trim(expr).split(/\s+/)
        assert parts.length is 2,
            "HTMLTemplate: invalid syntax {% ifequeal#{expr} %}"
        "if (#{parts[0]} == #{parts[1]}) {"

    _ifnotequal_parser: (expr) ->
        parts = trim(expr).split(/\s+/)
        assert parts.length is 2,
            "HTMLTemplate: invalid syntax {% #{expr} %}"
        "if (#{parts[0]} != #{parts[1]}) {"

    _else_parser: (expr) ->
        "} else {"
    
    _endif_parser: ->
        '}'

    _endifequal_parser: ->
        '}'

    _endifnotequal_parser: ->
        '}'

HTMLTemplate._htmlCache = {}
    
isArray  = (unknow) ->
    Object::toString.call(unknow) is '[object Array]'

isObject = (unknow) ->
    Object::toString.call(unknow) is '[object Object]'

assert = (exp, log) ->
    if not exp
        throw log

each = (data, callback) ->
    if isArray(data)
        for item, i in data
            callback(item, i)
    else if isObject(data)
        for key, val of data
            callback(val, key)

stripslashes = (str) ->
    str.replace /\\("|')/g, "$1"

logicOperators = {
    not:  '!'
    and:  '&&'
    or:   '||'
    lt:   '<'
    gt:   '>'
    is:   '==='
    isnt: '!=='
    lte:  '<='
    gte:  '>='
}

escapeChars = {
    '&' : "&amp;"
    ' ' : "&nbsp;"
    '"' : "&quot;"
    "'" : "#39;"
    "<" : "&lt;"
    ">" : "&gt;"
}

if typeof this.console is 'undefined'
    this.console = log: ->
        alert Array::join.call(arguments, '')

trim = (->
    if String::trim
        return (str) ->
            str.trim()
    else
        return (str) ->
            str.replace /^\s+|\s+$/g, ''
)()

class Filter

    __set: (data, express) ->
        @data    = data
        @express = express
        return @

    __execute: (method) ->
        assert typeof @[method] is 'function',
            "Filter: can't find a filter named '#{method}' from #{@express}"
        args = Array::slice.call arguments, 1
        args.unshift @data
        @data = @[method].apply @, args
        return @

    __get: ->
        return @data

    trim: (str) ->
        assert typeof str is 'string',
            "Filter.trim: #{str} is not a string, from #{@express}"
        return trim(str)

    escape: (str) ->
        assert typeof str is 'string',
            "Filter.escape: #{str} is not a string, from #{@express}"
        return str.replace /[<>& \r\n"']/gm, (s) ->
            return escapeChars[s]

    lower: (str) ->
        assert typeof str is 'string',
            "Filter.lower: #{str} is not a string, from #{@express}"
        return str.toLowerCase()

    upper: (str) ->
        assert typeof str is 'string',
            "Filter.upper: #{str} is not a string, from #{@express}"
        return str.toUpperCase()

    truncate: (str, length, addDot) ->
        assert typeof str is 'string',
            "Filter.truncate: #{str} is not a string, from #{@express}"
        assert not isNaN(length),
            "Filter.truncate: #{length} is not a number, from #{@express}"
        return "#{str.slice(0, length)}..." if addDot
        return "#{str.slice(0, length)}"

    addslashes: (str) ->
        assert typeof str is 'string',
            "Filter.addslashes: #{str} is not a string, from #{@express}"
        return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0')

    stripslashes: (str) ->
        assert typeof str is 'string',
            "Filter.stripslashes:#{str} is not a string, from #{@express}"
        return str.replace(/\\'/g, "'").replace(/\\"/g, '"')
                     .replace(/\\0/g, '\0').replace(/\\\\/g, '\\')

    capfirst: (str) ->
        assert typeof str is 'string',
            "Filter.capfirst: #{str} is not a string, from #{@express}"
        return "#{str[0].toUpperCase()}#{str.slice(1)}"

    length: (data) ->
        assert data.length isnt undefined,
            "Filter.length: #{data} has no length, from #{@express}"
        return data.length

    striptags: (str) ->
        assert typeof str is 'string',
            "Filter.striptags: #{str} is not a string, from #{@express}"
        return str.replace(/(<([^>]+)>)/ig, "")

    default: (data, val) ->
        return val if data is undefined or data is null
        return data

    reverse: (arr) ->
        assert isArray(arr),
            "Filter.reverse: #{arr} is not an array, from #{@express}"
        tmp = []
        each arr, (item) ->
            tmp.unshift item
        return tmp

    count: (obj) ->
        assert isObject(obj),
            "Filter.count: #{obj} is not an object, from #{@express}"
        count = 0
        each obj, ->
            count += 1
        return count

    debug: (data) ->
        console.log '[express]:', @express
        console.log '[data]:   ', data
        return data

# define as a Nodejs module
if typeof module isnt 'undefined'
    module.exports = HTMLTemplate

# define as a requirejs module
else if typeof define is 'function' and define.amd
    define 'HTMLTemplate', [], ->
        return HTMLTemplate

# define as a common javascript module
else
    this.HTMLTemplate = HTMLTemplate
