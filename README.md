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
	
	// it would append to document.body
	my_tpl.renderToDom(document.body, data_model);
	
	// it would replace the target dom
	my_tpl.renderAsDom(document.body.lastChild, data_model);
	
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
    <td>renderAsDom</td>
    <td>targetDom, [data_context]</td>
    <td>String|HTMLElement, JSON. It would replace the dom</td>
  </tr>
  <tr>
    <td>oncompiled</td>
    <td>handler, [data_context]</td>
    <td>handler, JSON. It would call renderToHtml and pass the html string as arg of handler</td>
  </tr>
</table>