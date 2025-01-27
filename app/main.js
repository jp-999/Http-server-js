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

const server = net.createServer((socket) => {
  socket.on("close", () => {
    socket.end();
  });

  socket.on("data", (data) => {
    const stringData = data.toString();
    console.log(stringData);

    const arrayData = stringData.split("\r\n");

    const body = arrayData[arrayData.length - 1];

    const methodPathVersion = arrayData[0].split(" ");
    const method = methodPathVersion[0];
    const path = methodPathVersion[1];
    const version = methodPathVersion[2];

    const request = {
      method: method,
      path: path,
      version: version,
    };

    if (request.path === "/") {
      const response = createHttpResponse({});
      socket.write(response);
    }

    arrayData.map((header) => {
      if (header.includes("User-Agent:")) {
        let splited = header.split(": ");
        request.userAgent = splited[1];
      }
      if (header.includes("Accept-Encoding:")) {
        let splited = header.split(": ");
        request.acceptEncoding = splited[1];
      }
    });

    if (request.path === "/user-agent") {
      const ACCEPTED_ENCODING = "gzip";
      const userAgent = request.userAgent;
      const acceptEncoding = request.acceptEncoding;

      if (!userAgent) {
        const response = createHttpResponse({
          message: "Bad Request",
          statusCode: 400,
        });
        socket.write(response);
        socket.end();
        return;
      }

      if (acceptEncoding?.includes(ACCEPTED_ENCODING)) {
        const response = createHttpResponse({
          message: "OK",
          statusCode: 200,
          acceptEncoding: "gzip",
          body: userAgent,
        });
        socket.write(response);
      } else {
        const response = createHttpResponse({
          message: "OK",
          statusCode: 200,
          acceptEncoding: "gzip",
          body: userAgent,
        });
        socket.write(response);
        socket.end();
      }
    }

    const ECHO_PART_LENGTH = 6; // "/echo/"
    request.echoPart = request.path.slice(0, ECHO_PART_LENGTH);
    request.restPart = request.path.slice(ECHO_PART_LENGTH);

    if (request.echoPart === "/echo/") {
      let response;
      let compressedBody;
      if (request.acceptEncoding?.includes("gzip")) {
        [response, compressedBody] = createHttpResponse({
          message: "OK",
          statusCode: 200,
          body: request.restPart,
          acceptEncoding: request.acceptEncoding,
          compressBody: true,
        });
      } else {
        response = createHttpResponse({
          message: "OK",
          statusCode: 200,
          body: request.restPart,
          acceptEncoding: request.acceptEncoding,
        });
      }
      socket.write(response);
      if (compressedBody) {
        socket.write(compressedBody);
        socket.end();
      }
    } else if (request.method === "GET" && request.path.startsWith("/files")) {
      const fileName = request.path.split("/")[2];
      const filePath = `${fileDir}/${fileName}`;

      if (!fs.existsSync(filePath)) {
        const response = createHttpResponse({
          message: "Not Found",
          statusCode: 404,
        });
        socket.write(response);
        socket.end();
      } else {
        const fileContent = fs.readFileSync(filePath);
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Encoding: ${request.acceptEncoding}\r\nContent-Type: application/octet-stream\r\nContent-Length: ${fileContent.length}\r\n\r\n${fileContent}\r\n`
        );
        socket.end();
      }
    } else if (request.method === "POST" && request.path.startsWith("/files")) {
      const fileName = request.path.split("/")[2];
      const filePath = `${fileDir}/${fileName}`;
      fs.writeFileSync(filePath, body);
      const response = createHttpResponse({
        message: "Created",
        statusCode: 201,
      });
      socket.write(response);
    } else {
      const response = createHttpResponse({
        message: "Not Found",
        statusCode: 404,
      });
      socket.write(response);
    }
    socket.end();
  });
});
server.listen(PORT, "localhost");