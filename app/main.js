// Import the 'net' module to create a TCP server
const net = require("net");

// Import the 'fs' module to interact with the file system
const fs = require("fs");

// Import the 'zlib' module to compress data
const zlib = require("zlib");

// Define the port number for the server to listen on
const PORT = 4221;

// Define the directory path for files
const fileDir = process.argv[3];

// Function to create an HTTP response
const createHttpResponse = ({
  // Default message for the response
  message = "OK",
  // Default status code for the response
  statusCode = 200,
  // Default body for the response
  body = "",
  // Default accept encoding for the response
  acceptEncoding = "",
  // Default content type for the response
  contentType = "text/plain",
  // Default user agent for the response
  userAgent = "",
  // Flag to compress the body
  compressBody = false,
}) => {
  // Define the HTTP version
  const HTTP_VERSION = "HTTP/1.1";
  // Define the new line character
  const NEW_LINE = "\r\n";

  // Initialize the response headers
  let response_headers = {
    // Initialize the headline with the HTTP version, status code, and message
    headLine: `${HTTP_VERSION} ${statusCode} ${message}${NEW_LINE}`,
    // Initialize the accept encoding header
    acceptEncoding: "Accept-Encoding: " + acceptEncoding + NEW_LINE,
    // Initialize the content type header
    contentType: "Content-Type: " + contentType + NEW_LINE,
    // Initialize the content length header
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

  // Update the user agent header if it is not empty
  if (userAgent !== "") {
    response_headers.userAgent = "User -Agent: " + userAgent + NEW_LINE;
  }

  // Compress the body if the accept encoding includes "gzip" and the compress body flag is true
  if (body !== "") {
    if (
      response_headers.contentEncoding?.includes("gzip") &&
      compressBody === true
    ) {
      // Compress the body using gzip
      const compressed = zlib.gzipSync(body);

      // Update the content length header with the compressed length
      response_headers.contentLength =
        "Content-Length: " + compressed.length + NEW_LINE;

      // Initialize the response string
      let response = "";

      // Append each header to the response string
      Object.values(response_headers).forEach((value) => {
        response += value;
      });

      // Append a new line to indicate the end of headers
      response += NEW_LINE;

      // Return the response string and the compressed body
      return [response, compressed];
    }
  }

  // Initialize the response string
  let response = "";

  // Append each header to the response string
  Object.values(response_headers).forEach((value) => {
    response += value;
  });

  // Append a new line to indicate the end of headers
  response += NEW_LINE;

  // Append the body to the response string
  response += body;

  // Return the response string
  return response;
};

// Create a TCP server
const server = net.createServer((socket) => {
  // Handle the close event
  socket.on("close", () => {
    // End the socket
    socket.end();
  });

  // Handle the data event
  socket.on("data", (data) => {
    // Convert the data to a string
    const stringData = data.toString();
    // Log the string data
    console.log(stringData);

    // Split the string data into an array of lines
    const arrayData = stringData.split("\r\n");

    // Get the body from the last line
    const body = arrayData[arrayData.length - 1];

    // Split the first line into method, path, and version
    const methodPathVersion = arrayData[0].split(" ");
    const method = methodPathVersion[0];
    const path = methodPathVersion[1];
    const version = methodPathVersion[2];

    // Initialize the request object
    const request = {
      method: method,
      path: path,
      version: version,
    };

    // Handle the root path
    if (request.path === "/") {
      // Create an HTTP response
      const response = createHttpResponse({});
      // Write the response to the socket
      socket.write(response);
    }

    // Parse the headers
    arrayData.map((header) => {
      // Handle the user agent header
      if (header.includes("User -Agent:")) {
        // Split the header into key and value
        let splited = header.split(": ");
        // Update the request object with the user agent
        request.userAgent = splited[1];
      }
      // Handle the accept encoding header
      if (header.includes("Accept-Encoding:")) {
        // Split the header into key and value
        let splited = header.split(": ");
        // Update the request object with the accept encoding
        request.acceptEncoding = splited[1];
      }
    });

    // Handle the user agent path
    if (request.path === "/user-agent") {
      // Define the accepted encoding
      const ACCEPTED_ENCODING = "gzip";
      // Get the user agent and accept encoding from the request
      const userAgent = request.userAgent;
      const acceptEncoding = request.acceptEncoding;

      // Handle the case where the user agent is not provided
      if (!userAgent) {
        // Create an HTTP response with a bad request status code
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

      // Handle the case where the accept encoding includes the accepted encoding
      if (acceptEncoding?.includes(ACCEPTED_ENCODING)) {
        // Create an HTTP response with the user agent and accepted encoding
        const response = createHttpResponse({
          message: "OK",
          statusCode: 200,
          acceptEncoding: "gzip",
          body: userAgent,
        });
        // Write the response to the socket
        socket.write(response);
      } else {
        // Create an HTTP response with the user agent and accepted encoding
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

    // Handle the echo path
    const ECHO_PART_LENGTH = 6; // "/echo/"
    request.echoPart = request.path.slice(0, ECHO_PART_LENGTH);
    request.restPart = request.path.slice(ECHO_PART_LENGTH);

    if (request.echoPart === "/echo/") {
      // Initialize the response and compressed body
      let response;
      let compressedBody;
      // Handle the case where the accept encoding includes the accepted encoding
      if (request.acceptEncoding?.includes("gzip")) {
        // Create an HTTP response with the echo path and accepted encoding
        [response, compressedBody] = createHttpResponse({
          message: "OK",
          statusCode: 200,
          body: request.restPart,
          acceptEncoding: request.acceptEncoding,
          compressBody: true,
        });
      } else {
        // Create an HTTP response with the echo path
        response = createHttpResponse({
          message: "OK",
          statusCode: 200,
          body: request.restPart,
          acceptEncoding: request.acceptEncoding,
        });
      }
      // Write the response to the socket
      socket.write(response);
      // Handle the case where the compressed body is not null
      if (compressedBody) {
        // Write the compressed body to the socket
        socket.write(compressedBody);
        // End the socket
        socket.end();
      }
    } else if (request.method === "GET" && request.path.startsWith("/files")) {
      // Get the file name from the path
      const fileName = request.path.split("/")[2];
      // Get the file path
      const filePath = `${fileDir}/${fileName}`;

      // Handle the case where the file does not exist
      if (!fs.existsSync(filePath)) {
        // Create an HTTP response with a not found status code
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
      // Get the file name from the path
      const fileName = request.path.split("/")[2];
      // Get the file path
      const filePath = `${fileDir}/${fileName}`;
      // Write the body to the file
      fs.writeFileSync(filePath, body);
      // Create an HTTP response with a created status code
      const response = createHttpResponse({
        message: "Created",
        statusCode: 201,
      });
      // Write the response to the socket
      socket.write(response);
    } else {
      // Create an HTTP response with a not found status code
      const response = createHttpResponse({
        message: "Not Found",
        statusCode: 404,
      });
      // Write the response to the socket
      socket.write(response);
    }
    // End the socket
    socket.end();
  });
});

// Listen on the specified port and host
server.listen(PORT, "localhost");