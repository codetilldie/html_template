var data = {
    matchlist: [
      {
        starttime: '2014-04-08 23:09:00',
        status: '4',
        home: 'AC',
        away: 'DE'
      },
      {
        starttime: '2014-04-08 23:09:00',
        status: '2',
        home: 'HR',
        away: 'WO'
      }
    ],
    date: '周2'
}

tpl = new HTMLTemplate()
tpl.addFilter('getDate', function (status) {
    this.data = status + '|' + this.data
})
tpl.loadTemplate('t.html')
tpl.renderToDom('content', data)
