const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const ROOT = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.sql': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self)'
};

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    ...SECURITY_HEADERS
  });
  res.end(body);
}

const REDIRECTS = {
  '/student-admission-portal': '/admission',
  '/student-admission-portal.html': '/admission',
  '/admissions': '/admission',
  '/admissions.html': '/admission',
  '/admission.html': '/admission',
  '/student-portal': '/student',
  '/student-portal.html': '/student',
  '/students': '/student',
  '/students.html': '/student',
  '/student.html': '/student',
  '/parent-portal': '/parent',
  '/parent-portal.html': '/parent',
  '/parents': '/parent',
  '/parents.html': '/parent',
  '/parent.html': '/parent',
  '/teacher-portal': '/teacher',
  '/teacher-portal.html': '/teacher',
  '/teachers': '/teacher',
  '/teachers.html': '/teacher',
  '/teacher.html': '/teacher',
  '/dashboard.html': '/dashboard',
  '/faculty': '/teacher',
  '/faculty.html': '/teacher',
  '/login.html': '/login',
  '/admin.html': '/admin',
  '/index.html': '/'
};

const ROUTE_ALIASES = {
  '/': '/index.html',
  '/dashboard': '/dashboard.html',
  '/login': '/login.html',
  '/admin': '/admin.html',
  '/admission': '/admission.html',
  '/student': '/student.html',
  '/parent': '/parent.html',
  '/teacher': '/teacher.html'
};

const server = http.createServer((req, res) => {
  // Only allow read-only GET/HEAD requests.
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    send(res, 405, '405 Method Not Allowed');
    return;
  }

  const urlParts = req.url.split('?');
  let pathname = urlParts[0].split('#')[0];
  const query = urlParts[1] ? `?${urlParts[1]}` : '';

  // Reject null bytes outright.
  if (pathname.indexOf('\0') !== -1) {
    send(res, 400, '400 Bad Request');
    return;
  }

  // Normalize trailing slash (except root)
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.slice(0, -1);
  }

  const lowerPath = pathname.toLowerCase();

  // Canonical 301 redirects for legacy URLs and .html extensions to professional URLs
  if (REDIRECTS[lowerPath]) {
    res.writeHead(301, {
      'Location': `${REDIRECTS[lowerPath]}${query}`,
      ...SECURITY_HEADERS
    });
    res.end();
    return;
  }

  // Route clean URLs internally to the corresponding HTML file
  let reqUrl = ROUTE_ALIASES[lowerPath] || pathname;

  // Decode once, then resolve and confine to ROOT (prevents path traversal).
  let decoded;
  try {
    decoded = decodeURIComponent(reqUrl);
  } catch (e) {
    send(res, 400, '400 Bad Request');
    return;
  }

  const resolved = path.resolve(ROOT, '.' + path.posix.normalize('/' + decoded));
  if (resolved !== ROOT && !resolved.startsWith(ROOT + path.sep)) {
    send(res, 403, '403 Forbidden');
    return;
  }

  let filePath = resolved;

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback: allow extensionless routes to resolve to .html
      if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
        filePath += '.html';
      } else {
        send(res, 404, '404 Not Found');
        return;
      }
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        send(res, 500, '500 Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...SECURITY_HEADERS
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    });
  });
});

const os = require('os');

function getNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && !iface.address.startsWith('169.254.')) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

let currentPort = PORT;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[TPS ERP] Port ${currentPort} in use, trying port ${currentPort + 1}...`);
    currentPort++;
    server.listen(currentPort, '0.0.0.0');
  } else {
    console.error('SERVER ERROR:', err.message);
  }
});

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
});

server.listen(currentPort, '0.0.0.0', () => {
  const ip = getNetworkIp();
  console.log(`\n=============================================`);
  console.log(`  THAIBA PUBLIC SCHOOL ERP — Server Online`);
  console.log(`  Local URL:   http://localhost:${currentPort}/`);
  console.log(`  Wi-Fi URL:   http://${ip}:${currentPort}/`);
  console.log(`=============================================\n`);
});
