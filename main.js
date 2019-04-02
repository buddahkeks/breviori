const express = require('express'),
      fs = require('fs'),
      path = require('path'),
      bodyParser = require('body-parser'),
      bcrypt = require('bcryptjs');

var app = express(),
    routes = {},
    port = 80,
    redirect_timeout = 150;
var admin = {
  uname: 'root',
  pwd: '$2a$10$QCfdFSThXe5ExGxWmsQMo.KHUU.wcYv/qeYLuR68geJJvB3EPxhPO',
};

app.use(bodyParser.urlencoded({extended: true}));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs/index.html'));
});

class UserAgent {
  constructor(name) {
    this.name = name;
    this.used = 0;
  }
}

class Port {
  constructor(n) {
    this.n = n;
    this.used = 0;
  }
}

class Family {
  constructor (t) {
    this.type = t;
    this.used = 0;
  }
}

class Client {
  constructor(ip) {
    this.ip = ip;
    this.families = [];
    this.ports = [];
    this.user_agents = [];

    this.visits = 0;
  }
  addUserAgent(ua) {
    if (!this.user_agents.some(x => x.name === ua))
      this.user_agents.push(new UserAgent(ua));
    this.user_agents.filter(x => x.name === ua)[0].used++;
  }
  addPort(p) {
    if (!this.ports.some(x => x.n === p))
      this.ports.push(new Port(p));
    this.ports.filter(x => x.n === p)[0].used++;
  }
  addFamily(fam) {
    if (!this.families.some(x => x.type === fam))
      this.families.push(new Family(fam));
    this.families.filter(x => x.type === fam)[0].used++;
  }
}

class Route {
  constructor(url) {
    this.clicks = 0;
    this.url = url;
    this.ips = [];
  }
  addIp(ip) {
    if (!this.ips.some(x => x.ip === ip))
      this.ips.push(new Client(ip));
    this.ips.filter(x => x.ip === ip)[0].visits++;
  }
  addClient(ip, fam, port, ua) {
    if (!this.ips.some(x => x.ip === ip))
      this.ips.push(new Client(ip, fam, port));

    let c = this.ips.filter(x => x.ip === ip)[0];
    c.visits++;
    c.addFamily(fam);
    c.addPort(port);
    c.addUserAgent(ua);
  }
}

function correctIp(ip) {
  if (ip.toLowerCase().startsWith('::ffff:'))
    return ip.substr(7);
  return ip;
}

app.get('/new', (req, res) => {
  let baseURL = 'http://' + req.host + '/';

  if (!req.query.url || req.query.url === "") {
    res.send('Missing URL ... ');
    return;
  }
  if (!req.query.url.includes('://'))
    req.query.url = '//' + req.query.url;

  if (Object.values(routes).map(r => r.url).includes(req.query.url)) {
    for (let k of Object.keys(routes)) {
      if (routes[k].url === req.query.url) {
        res.send(baseURL + k);
        return;
      }
    }
  }

  let genURL;
  do {
    genURL = Math.random().toString(36).substr(2);
  } while (Object.keys(routes).includes(genURL));

  routes[genURL] = new Route(req.query.url);
  res.send(baseURL + genURL);
});

app.post('/spy', (req, res) => {
  let pwd = req.body.pwd;
  if (!pwd || pwd === '') {
    res.redirect('/admin');
    return;
  }

  bcrypt.compare(pwd, admin.pwd, (err, eq) => {
    if (err) {
      console.log(err);
      return;
    }

    if (eq) {
      res.send(JSON.stringify(routes));
    } else {
      res.redirect('/admin');
    }
  });
});

app.get('/a/check', (req, res) => {
  let pwd = req.query.pwd;
  if (!pwd || pwd === '') {
    res.redirect('/admin');
    return;
  }
  bcrypt.compare(pwd, admin.pwd, (err, eq) => {
    if (err) {
      console.log(err);
      return;
    }

    res.send(eq);
  });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'docs/spy.html'));
});

app.get('/:path', (req, res) => {
  if (Object.keys(routes).includes(req.params.path)) {
    routes[req.params.path].clicks++;
    routes[req.params.path].addClient(
      correctIp(req.header('x-forwarded-for') || req.connection.remoteAddress), 
      req.connection.remoteFamily, 
      req.connection.remotePort,
      req.header('user-agent'),
    );

    fs.readFile(path.join(__dirname, 'docs/redirect.html'), (err, data) => {
      if (err) return;
      res.send(
        data.toString().replace('${target_url_here}', routes[req.params.path].url) 
        + `
        <script>
          window.setTimeout(() => {
            window.location = '${routes[req.params.path].url}';
          }, ${redirect_timeout});
        </script>`
      );
    });
  } else {
    res.sendFile(path.join(__dirname, 'docs/404.html'));
  }
});

app.listen(port, () => console.log(`[WEB-SERVER]: Listening on :${port} ... `));
