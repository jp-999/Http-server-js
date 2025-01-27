// Import the 'net' module for creating a TCP server
const net = require("net");
// Import the 'fs' module for interacting with the file system
const fs = require("fs");
// Import the 'zlib' module for compression
const zlib = require("zlib");

// Define the port number for the server
const PORT = 4221;
// Define the directory path for files
const fileDir = process.argv[3];
// Note: You can use print statements as follows for debugging, they'll be visible when running tests.

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

  // Compress the body if the accept encoding includes "gzip" and the compressBody flag is true
  if (body !== "") {
    if (
      response_headers.contentEncoding?.includes("gzip") &&
      compressBody === true
    ) {
      // Compress the body using zlib
      const compressed = zlib.gzipSync(body);

      // Update the content length header with the compressed length
      response_headers.contentLength =
        "Content-Length: " + compressed.length + NEW_LINE;

      // Initialize the response string
      let response = "";

      // Add the response headers to the response string
      Object.values(response_headers).forEach((value) => {
        response += value;
      });

      // Add a newline character to the response string to indicate the end of headers
      response += NEW_LINE;

      // Return the response string and the compressed body
      return [response, compressed];
    }
  }

  // Initialize the response string
  let response = "";

  // Add the response headers to the response string
  Object.values(response_headers).forEach((value) => {
    response += value;
  });

  // Add a newline character to the response string to indicate the end of headers
  response += NEW_LINE;

  // Add the body to the response string
  response += body;

  // Return the response string
  return response;
};

// Create a TCP server
const server = net.createServer((socket) => {
  // Handle the close event for the socket
  socket.on("close", () => {
    // End the socket
    socket.end();
  });

  // Handle the data event for the socket
  socket.on("data", (data) => {
    // Convert the data to a string
    const stringData = data.toString();
    // Log the string data
    console.log(stringData);

    // Split the string data into an array of lines
    const arrayData = stringData.split("\r\n");

    // Get the body of the request
    const body = arrayData[arrayData.length - 1];

    // Split the first line of the request into an array of method, path, and version
    const methodPathVersion = arrayData[0].split(" ");
    // Get the method of the request
    const method = methodPathVersion[0];
    // Get the path of the request
    const path = methodPathVersion[1];
    // Get the version of the request
    const version = methodPathVersion[2];

    // Initialize the request object
    const request = {
      // Set the method of the request
      method: method,
      // Set the path of the request
      path: path,
      // Set the version of the request
      version: version,
    };

    // Handle the request for the root path
    if (request.path === "/") {
      // Create an HTTP response for the request
      const response = createHttpResponse({});
      // Write the response to the socket
      socket.write(response);
    }

    // Iterate over the lines of the request
    arrayData.map((header) => {
      // Check if the header includes the user agent
      if (header.includes("User -Agent:")) {
        // Split the header into an array of key and value
        let splited = header.split(": ");
        // Set the user agent of the request
        request.userAgent = splited[1];
      }
      // Check if the header includes the accept encoding
      if (header.includes("Accept-Encoding:")) {
        // Split the header into an array of key and value
        let splited = header.split(": ");
        // Set the accept encoding of the request
        request.acceptEncoding = splited[1];
      }
    });

    // Handle the request for the user agent path
    if (request.path === "/user-agent") {
      // Define the accepted encoding
      const ACCEPTED_ENCODING = "gzip";
      // Get the user agent of the request
      const userAgent = request.userAgent;
      // Get the accept encoding of the request
      const acceptEncoding = request.acceptEncoding;

      // Check if the user agent is not empty
      if (!userAgent) {
        // Create an HTTP response for the request with a bad request status code
        const response = createHttpResponse({
          message: "Bad Request",
          statusCode: 400,
        });
        // Write the response to the socket
        socket.write(response);
        // End the socket
        socket.end();
        return;
      }

      // Check if the accept encoding includes the accepted encoding
      if (acceptEncoding?.includes(ACCEPTED_ENCODING)) {
        // Create an HTTP response for the request with the user agent and accepted encoding
        const response = createHttpResponse({
          message: "OK",
          statusCode: 200,
          acceptEncoding: "gzip",
          body: userAgent,
        });
        // Write the response to the socket
        socket.write(response);
      } else {
        // Create an HTTP response for the request with the user agent and accepted encoding
        const response = createHttpResponse({
          message: "OK",
          statusCode: 200,
          acceptEncoding: "gzip",
          body: userAgent,
        });
        // Write the response to the socket
        socket.write(response);
        // End the socket
        socket.end();
      }
    }

    // Define the echo part length
    const ECHO_PART_LENGTH = 6; // "/echo/"
    // Get the echo part of the request path
    request.echoPart = request.path.slice(0, ECHO_PART_LENGTH);
    // Get the rest part of the request path
    request.restPart = request.path.slice(ECHO_PART_LENGTH);

    // Handle the request for the echo path
    if (request.echoPart === "/echo/") {
      // Initialize the response and compressed body
      let response;
      let compressedBody;
      // Check if the accept encoding includes the accepted encoding
      if (request.acceptEncoding?.includes("gzip")) {
        // Create an HTTP response for the request with the rest part and accepted encoding
        [response, compressedBody] = createHttpResponse({
          message: "OK",
          statusCode: 200,
          body: request.restPart,
          acceptEncoding: request.acceptEncoding,
          compressBody: true,
        });
      } else {
        // Create an HTTP response for the request with the rest part and accepted encoding
        response = createHttpResponse({
          message: "OK",
          statusCode: 200,
          body: request.restPart,
          acceptEncoding: request.acceptEncoding,
        });
      }
      // Write the response to the socket
      socket.write(response);
      // Check if the compressed body is not empty
      if (compressedBody) {
        // Write the compressed body to the socket
        socket.write(compressedBody);
        // End the socket
        socket.end();
      }
    } else if (request.method === "GET" && request.path.startsWith("/files")) {
      // Get the file name from the request path
      const fileName = request.path.split("/")[2];
      // Get the file path
      const filePath = `${fileDir}/${fileName}`;

      // Check if the file exists
      if (!fs.existsSync(filePath)) {
        // Create an HTTP response for the request with a not found status code
        const response = createHttpResponse({
          message: "Not Found",
          statusCode: 404,
        });
        // Write the response to the socket
        socket.write(response);
        // End the socket
        socket.end();
      } else {
        // Read the file content
        const fileContent = fs.readFileSync(filePath);
        // Write the file content to the socket
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Encoding: ${request.acceptEncoding}\r\nContent-Type: application/octet-stream\r\nContent-Length: ${fileContent.length}\r\n\r\n${fileContent}\r\n`
        );
        // End the socket
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