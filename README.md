Introduction
===

html_template is a front-end html template compiler write in JavaScript. It's easy and friendly to debug your template with data model, and you don't care about when you must load the template files, and you could write the template in several ways.

Quick Start
===
* **Prepare a template**

	`test.html`:

	*A simple template:*

	```
	<div>this is a simple template</div>	
	```
	
	*A template with model:*
	
	```
	{# args: users #}
	
	<ul>
	
	{% for user in users %}
	  <li>
	    <span>Name:   {{user.name}}   </span>
	    <span>Gender: {{user.gender}} </span>
	    <span>Age:    {{user.age}}    </span>
	  </li>
	{% endfor %}
	
	</ul>	
	```
	`{# args: arg1_name, arg2name, ... #}` to define arguments in template
	
	`{# this would be a comment #}` to write a comment in template
	
	`{% for [key], value in list %}` `{% endfor %}` to use a iterator
	
	`{{ data }}` as a data
	
	*A template with filters and condition:*
	
	```
	{# args: users, max_age #}
	
	<ul>
	
	{% for index, user in users | reverse %}
	
	  {% if index % 2 is 0 %}
	  <li>
	    <span>Name:   {{user.name | capfirst}}       </span>
	    <span>Gender: {{user.gender}}                </span>
	    <span>Age:    {{user.age | limitat: max_age}}</span>
	  </li>
	  {% endif %}
	  
	{% endfor %}
	
	</ul>	
	```
	`{{data | filter1 | filter2:filter2_arg1, filter2_arg2}}` to use filters and with filter function arguments  
	
* **Load template**
	
	Now you should create a `HTMLTemplate` instance and load the template file:
	
	```
	var my_tpl = new HTMLTemplate();
	my_tpl.loadTemplate('test.html');
	```
	
* **Render template**

	You could render to DOM tree and don't need to care about if the template file is loaded, it would render automatic when the file is load by AJAX:
	
	```
	var data_model = {
	  "max_age": 55,
	  "users": [
	    {
	      "name": "Fon",
	      "age": 25,
   	      "gender": "male"
	    },
	    {
	      "name": "Moo",
	      "age": 24,
   	      "gender": "female"
	    }
	  ]
	};
	
	// it would return the html string
	var html = my_tpl.renderToHtml(data_model)
	
	// it would append to document.body
	my_tpl.renderToDom(document.body, data_model);
	
	// it would replace the target dom
	my_tpl.renderAtDom(document.body.lastChild, data_model);
	
	// it would pass the html string as the first argument
	my_tpl.oncompiled(function (html) {
		// use the html string
	}, data_model)
	```
	
* **Write template in function**

	```
	function user_list_tpl () {
	/*<!--
	
	{# args: users #}
	
	{% for user in users %}
	...
	{% endfor %}
	
	-->*/
	}
	```

	The function start with `/*<!--` and end with `-->*/`
	
Template Syntax
===
* `for`
	
	```
	{% for key, val in object %}
	{% endfor %}
	
	{% for val in object %}
	{% endfor %}
	
	{% for index, item in array %}
	{% endfor %}
	
	{% for item in array %}
	{% endfor %}
	```
	
* `if, ifequal, ifnotequal, else`

	```
	{% if users.length %}
	{% else %}
	{% endif %}
	
	{% ifequal users.length 0 %}
	{% else %}
	{% endifequal %}
	
	{% ifnotequal user.length 0 %}
	{% else %}
	{% endifnotequal %}
	```
	
* `is, isnt, not, or, and, gt, lt, gte, lte`

	```
	is   : ===
	isnt : !==
	not  : !
	or   : ||
	and  : &&
	gt   : >
	lt   : <
	gte  : >=
	lte  : <=
	```


	
API
===
<table>
  <tr>
    <th>method</th>
    <th>param</th>    
    <th>description</th>
  </tr>
  <tr>
    <td>compileString</td>
    <td>template_string</td>
    <td>String</td>
  </tr>
  <tr>
    <td>compileFunction</td>
    <td>function_with_template</td>
    <td>Function</td>
  </tr>
  <tr>
    <td>loadTemplate</td>
    <td>template_file_path</td>
    <td>String. It would load by AJAX</td>
  </tr>
  <tr>
    <td>renderToHtml</td>
    <td>data_context</td>
    <td>JSON. Keys of the data_context would be a args name in template scope</td>
  </tr>
  <tr>
    <td>renderToDom</td>
    <td>targetDom, [data_context]</td>
    <td>String|HTMLElement, JSON. It would append to the dom</td>
  </tr>
  <tr>
    <td>renderAtDom</td>
    <td>targetDom, [data_context]</td>
    <td>String|HTMLElement, JSON. It would replace the dom</td>
  </tr>
  <tr>
    <td>oncompiled</td>
    <td>handler, [data_context]</td>
    <td>Function, JSON. It would call renderToHtml and pass the html string as arg of handler</td>
  </tr>
  <tr>
    <td>addFilter</td>
    <td>filter_name, method</td>
    <td>String, Function. It let you custom your filter method</td>
  </tr>
  <tr>
    <td>addFilters</td>
    <td>filters</td>
    <td>JSON. Key is filter_name and value is filter method</td>
  </tr>
  <tr>
    <td>debug</td>
    <td>null</td>
    <td>Log the compiled template function string</td>
  </tr>
</table>

Create Filter
===

```
var my_tpl = new HTMLTemplate();

my_tpl.addFilter('customfilter', function customFilter() {
    // your filter implements here
});
```

If the filter express is `{{ data | customfilter }}`, you can get `data` by using the first argument in the filter handler of customfilter, and you must return the value, just like this:

```
function customFilter(data) {
    if (data === true) {
        return 'This data is true';
    } else if (this.data === false){
        return 'This data is false';
    } else {
    	return 'This data is not a boolean value';
    }
}
```

Now, you could add args for the filter handler like this:

```
 {{ users | getUserBy: age, 'male' }}
```
`users` and `age` is variable, 'male' is a string. 

Use the args in handler like this:

```
function getUserBy(users, age, gender) {
    for (var i = 0, user; user = users[i]; i++) {
       if (user.age === age && user.gender === gender) {
           return user.name;       }
    }
}
```

Default filters
===

HTMLTemplate is supported some default common filters

`trim`
	
	{{ ' string ' | trim }}
	// => 'string'
	
`lower`

	{{ 'stRiNg' | lower}}
	// => 'string'
	
`upper`
	
	{{ 'string' | upper}}
	// => 'STRING'
	
`capfirst`

	{{ 'string' | capfirst }}
	// => 'String'
	
`escape`

	{{ '< &' | escape }}
	// => '&lt;&nbsp;&amp;'
	
`truncate`

	{{ 'this is a long string' | truncate: 6, true }}
	// => 'this i...'
	
	{{ 'this is a long string' | truncate: 8, false }}
	// => 'this is '

`addslashes`

	{{ 'My name is "Fon", and you?' | addslashes}}
	// => 'My name is \"Fon\", and you?'
	
`stripslashes`

	{{ '\\' | stripslashes }}
	// => '\'
	

`striptags`

	{{ '<div>Content text</div>' | striptags }}
	// => 'Context text'
	
`reverse`

	{{ [1,2,3,4] | reverse }}
	// => [4,3,2,1]
	
`length`

	{{ 'string' | length }}
	// => 6
	
	{{ [1,2,3,4,5] | length }}
	// => 5
	
`count`

	{{ {} | count }}
	// => 0
	
	{{ {name: 'Fon', gender: 'male'} | count }}
	// => 2
	
`default`

	{{ null | default:"Not a null value" }}
	// => "Not a null value"
	
	{{ undefined | default: "Not an undefined value"}}
	// => "Not an undefined value"
	
	{{ "" | default: "Cannot replace an empty string"}}
	// => ""
	
	{{ [] | default: "Cannot replace an empty array"}}
	// => []
	
`debug`

	{{ [1,2,3] | debug | reverse | debug }}
	// log: [express] {{ [1,2,3] | debug | reverse | debug }}
	// log: [data]      [1,2,3]	
	// log: [express] {{ [1,2,3] | debug | reverse | debug }}
	// log: [data]      [3,2,1]
	// => [3,2,1]