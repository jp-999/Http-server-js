// Import the 'net' module, which provides an API for creating TCP servers and clients
const net = require("net");

// Import the 'fs' module, which provides an API for interacting with the file system
const fs = require("fs");

// Import the 'zlib' module, which provides an API for compressing and decompressing data
const zlib = require("zlib");

// Define the port number that the server will listen on
const PORT = 4221;

// Define the directory path where files will be stored, retrieved from the command line arguments
const fileDir = process.argv[3];

// Add HTTP constants
const HTTP_STATUS = {
  OK: { code: 200, message: 'OK' },
  CREATED: { code: 201, message: 'Created' },
  BAD_REQUEST: { code: 400, message: 'Bad Request' },
  NOT_FOUND: { code: 404, message: 'Not Found' }
};

// Define a function to create an HTTP response
const createHttpResponse = ({
  // Optional message for the response (default: "OK")
  message = "OK",
  // Optional status code for the response (default: 200)
  statusCode = 200,
  // Optional body for the response (default: "")
  body = "",
  // Optional accept encoding for the response (default: "")
  acceptEncoding = "",
  // Optional content type for the response (default: "text/plain")
  contentType = "text/plain",
  // Optional user agent for the response (default: "")
  userAgent = "",
  // Optional flag to compress the body (default: false)
  compressBody = false,
}) => {
  // Define the HTTP version for the response
  const HTTP_VERSION = "HTTP/1.1";
  // Define the newline character for the response
  const NEW_LINE = "\r\n";

  // Initialize the response headers
  let response_headers = {
    // Initialize the headline for the response
    headLine: `${HTTP_VERSION} ${statusCode} ${message}${NEW_LINE}`,
    // Initialize the accept encoding header for the response
    acceptEncoding: "Accept-Encoding: " + acceptEncoding + NEW_LINE,
    // Initialize the content type header for the response
    contentType: "Content-Type: " + contentType + NEW_LINE,
    // Initialize the content length header for the response
    contentLength: "Content-Length: " + body.length + NEW_LINE,
  };

  // Update the headline if the message is not "OK" and the status code is not 200
  if (message !== "OK" && statusCode !== 200) {
    response_headers.headLine = `${HTTP_VERSION} ${statusCode} ${message}${NEW_LINE}`;
  }

  // Update the accept encoding header if it includes "gzip"
  if (acceptEncoding && acceptEncoding.includes("gzip")) {
    // Set the accept encoding to "gzip" and add a content encoding header
    response_headers.acceptEncoding = "Accept-Encoding: " + "gzip" + NEW_LINE;
    response_headers.contentEncoding = "Content-Encoding: " + "gzip" + NEW_LINE;
  }

  // Update the content type header if it is not "text/plain"
  if (contentType !== "text/plain") {
    response_headers.contentType = "Content-Type: " + contentType + NEW_LINE;
  }

  // Add the user agent header if it is not empty
  if (userAgent !== "") {
    response_headers.userAgent = "User -Agent: " + userAgent + NEW_LINE;
  }

  // Check if the body is not empty
  if (body !== "") {
    // Check if the content encoding is "gzip" and the compressBody flag is true
    if (
      response_headers.contentEncoding?.includes("gzip") &&
      compressBody === true
    ) {
      // Compress the body using zlib
      const compressed = zlib.gzipSync(body);

      // Update the content length header with the compressed length
      response_headers.contentLength =
        "Content-Length: " + compressed.length + NEW_LINE; // overwrite content length

      // Initialize the response string
      let response = "";

      // Add the response headers to the response string
      Object.values(response_headers).forEach((value) => {
        response += value;
      });

      // Add a newline character to the response string to indicate the end of headers
      response += NEW_LINE; // every header adds a new line so after all headers add a new line so it becomes two new lines meaning end of headers

      // Return the response string and the compressed body
      return [response, compressed];
    }
  }

  let response = "";
  Object.values(response_headers).forEach((value) => {
    response += value;
  });

  response += NEW_LINE; // every header adds a new line so after all headers add a new line so it becomes two new lines meaning end of headers

  response += body;

  return response;
};

// Extract request parsing into a function
const parseRequest = (data) => {
  const lines = data.toString().split('\r\n');
  const [method, path, version] = lines[0].split(' ');
  const body = lines[lines.length - 1];
  
  const request = { method, path, version, body };
  
  // Parse headers
  lines.forEach(header => {
    if (header.includes('User-Agent:')) {
      request.userAgent = header.split(': ')[1];
    }
    if (header.includes('Accept-Encoding:')) {
      request.acceptEncoding = header.split(': ')[1];
    }
  });
  
  return request;
};

// Organize route handlers
const routeHandlers = {
  '/': (request, socket) => {
    socket.write(createHttpResponse({}));
  },
  
  '/user-agent': (request, socket) => {
    if (!request.userAgent) {
      socket.write(createHttpResponse(HTTP_STATUS.BAD_REQUEST));
      return;
    }
    
    socket.write(createHttpResponse({
      ...HTTP_STATUS.OK,
      acceptEncoding: 'gzip',
      body: request.userAgent
    }));
  },
  
  '/echo': (request, socket) => {
    const content = request.path.slice(6); // Remove '/echo/'
    const useCompression = request.acceptEncoding?.includes('gzip');
    
    const [response, compressedBody] = createHttpResponse({
      ...HTTP_STATUS.OK,
      body: content,
      acceptEncoding: useCompression ? 'gzip' : '',
      compressBody: useCompression
    });
    
    socket.write(response);
    if (compressedBody) {
      socket.write(compressedBody);
    }
  },
  
  '/files': async (request, socket) => {
    const fileName = request.path.split('/')[2];
    const filePath = `${fileDir}/${fileName}`;
    
    if (request.method === 'GET') {
      if (!fs.existsSync(filePath)) {
        socket.write(createHttpResponse(HTTP_STATUS.NOT_FOUND));
        return;
      }
      
      const fileContent = fs.readFileSync(filePath);
      socket.write(createHttpResponse({
        ...HTTP_STATUS.OK,
        contentType: 'application/octet-stream',
        body: fileContent
      }));
    } else if (request.method === 'POST') {
      fs.writeFileSync(filePath, request.body);
      socket.write(createHttpResponse(HTTP_STATUS.CREATED));
    }
  }
};

const server = net.createServer((socket) => {
  socket.on('data', (data) => {
    const request = parseRequest(data);
    console.log(`${request.method} ${request.path}`);
    
    // Route handling
    if (request.path === '/') {
      routeHandlers['/'](request, socket);
    } else if (request.path === '/user-agent') {
      routeHandlers['/user-agent'](request, socket);
    } else if (request.path.startsWith('/echo/')) {
      routeHandlers['/echo'](request, socket);
    } else if (request.path.startsWith('/files/')) {
      routeHandlers['/files'](request, socket);
    } else {
      socket.write(createHttpResponse(HTTP_STATUS.NOT_FOUND));
    }
    
    socket.end();
  });

  socket.on('close', () => socket.end());
});
server.listen(PORT, "localhost"); // Start the server and listen on the specified port

