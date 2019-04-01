const express = require('express'),
      path = require('path');
var app = express(),
    routes = {},
    baseURL = 'http://localhost:5000/',
    port = 5000;

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/new', (req, res) => {
  if (!req.query.url.includes('://'))
    req.query.url = '//' + req.query.url;

  if (Object.values(routes).includes(req.query.url)) {
    for (let k of Object.keys(routes)) {
      if (routes[k] === req.query.url) {
        res.send(baseURL + k);
        return;
      }
    }
  }

  let genURL;
  do {
    genURL = Math.random().toString(36).substr(2);
  } while (Object.keys(routes).includes(genURL));

  routes[genURL] = req.query.url;
  res.send(baseURL + genURL);
});

app.get('/spy', (req, res) => {
  res.send(routes);
});

app.get('/:path', (req, res) => {
  if (Object.keys(routes).includes(req.params.path)) {
    res.redirect(routes[req.params.path]);
  } else {
    res.send('[404]: Not Found!');
  }
});

app.listen(port, () => console.log(`[WEB-SERVER]: Listening on :${port} ... `));
