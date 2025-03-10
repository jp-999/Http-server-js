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

      // Initialize an empty string to build the HTTP response
      let response = "";
      // Concatenate all header values from the response_headers object
      Object.values(response_headers).forEach((value) => {
        response += value;
      });

      // Add an extra newline to separate headers from body
      // Every header adds a new line, so after all headers add another new line
      // This creates two newlines total, indicating the end of headers section
      response += NEW_LINE;

      // Append the response body (if any)
      response += compressed;

      // Return the complete HTTP response string
      return response;
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

// Create a TCP server that handles incoming connections
const server = net.createServer((socket) => {
  // Handle socket close event
  socket.on("close", () => {
    socket.end();
  });

  // Handle incoming data from the client
  socket.on("data", (data) => {
    // Convert the received buffer data to a string
    const stringData = data.toString();
    // Log the raw HTTP request for debugging
    console.log(stringData);

    // Split the request into lines using CRLF as delimiter
    const arrayData = stringData.split("\r\n");

    // Get the request body (last element of the array)
    const body = arrayData[arrayData.length - 1];

    // Parse the first line of the request (e.g., "GET /path HTTP/1.1")
    const methodPathVersion = arrayData[0].split(" ");
    // Extract HTTP method (GET, POST, etc.)
    const method = methodPathVersion[0];
    // Extract request path
    const path = methodPathVersion[1];
    // Extract HTTP version
    const version = methodPathVersion[2];

    // Create a request object to store parsed information
    const request = {
      method: method,      // Store the HTTP method (GET, POST, etc.)
      path: path,         // Store the request path
      version: version,   // Store the HTTP version
    };

    if (request.path === "/") {
      const response = createHttpResponse({});
      socket.write(response);
    }

    arrayData.forEach((header) => {
      // Function to extract header values
      const extractHeaderValue = (header, key) => {
        const regex = new RegExp(`^${key}:\\s*(.+)$`);
        const match = header.match(regex);
        return match ? match[1] : null;
      };

      // Extract User-Agent, Accept-Encoding, Content-Type, and Content-Length values
      const userAgentValue = extractHeaderValue(header, "User-Agent");
      if (userAgentValue) {
        request.userAgent = userAgentValue;
      }

      const acceptEncodingValue = extractHeaderValue(header, "Accept-Encoding");
      if (acceptEncodingValue) {
        request.acceptEncoding = acceptEncodingValue;
      }

      const contentTypeValue = extractHeaderValue(header, "Content-Type");
      if (contentTypeValue) {
        request.contentType = contentTypeValue; // Store Content-Type if present
      } else {
        request.contentType = "text/plain"; // Default value
      }

      const contentLengthValue = extractHeaderValue(header, "Content-Length");
      if (contentLengthValue) {
        request.contentLength = parseInt(contentLengthValue, 10); // Store Content-Length if present
      } else {
        request.contentLength = 0; // Default value
      }

      // Log extracted headers for debugging
      console.log(`Extracted Header - User-Agent: ${request.userAgent}`);
      console.log(`Extracted Header - Accept-Encoding: ${request.acceptEncoding}`);
      console.log(`Extracted Header - Content-Type: ${request.contentType}`);
      console.log(`Extracted Header - Content-Length: ${request.contentLength}`);
    });

    if (request.path === "/user-agent") {
      // Define the accepted encoding type for the response
      const ACCEPTED_ENCODING = "gzip";
      // Retrieve the User-Agent string from the request
      const userAgent = request.userAgent;
      // Retrieve the Accept-Encoding header from the request
      const acceptEncoding = request.acceptEncoding;

      // Check if the User-Agent string is missing
      if (!userAgent) {
        // Create a response indicating a bad request (400)
        const response = createHttpResponse({
          message: "Bad Request",        // Set response status message to "Bad Request"
          statusCode: 400,               // Set HTTP status code to 400 (Bad Request)
        });
        // Send the error response to the client
        socket.write(response);
        // Close the socket connection
        socket.end();
        return; // Exit the function early
      }

      // Check if the client's Accept-Encoding header includes "gzip"
      if (acceptEncoding?.includes(ACCEPTED_ENCODING)) {
        // Create an HTTP response with gzip encoding
        const response = createHttpResponse({
          message: "OK",                  // Set response status message
          statusCode: 200,               // Set HTTP status code to 200 (OK)
          acceptEncoding: "gzip",        // Indicate gzip compression support
          body: userAgent,               // Set response body to the client's User-Agent string
        });
        socket.write(response);
      } else {
        // Create an HTTP response indicating success (200 OK)
        const response = createHttpResponse({
          message: "OK",                  // Set response status message to "OK"
          statusCode: 200,               // Set HTTP status code to 200 (OK)
          acceptEncoding: "gzip",        // Indicate gzip compression support
          body: userAgent,               // Set response body to the client's User-Agent string
        });
        // Send the response back to the client
        socket.write(response);
        // Close the socket connection
        socket.end();
      }
    }

    const ECHO_PART_LENGTH = 6; // Length of "/echo/" string
    // Extract the first 6 characters to check if it's an echo request
    request.echoPart = request.path.slice(0, ECHO_PART_LENGTH);
    // Get the remaining part of the path after "/echo/" which will be echoed back
    request.restPart = request.path.slice(ECHO_PART_LENGTH);

    if (request.echoPart === "/echo/") {
      // Check if the client accepts gzip compression
      const acceptsGzip = request.acceptEncoding?.includes("gzip");
      // Create HTTP response with the echo content
      const response = createHttpResponse({
        statusCode: 200,
        message: "OK",
        body: request.restPart,          // Use the extracted content as response body
        acceptEncoding: acceptsGzip ? "gzip" : "", // Set gzip encoding if client accepts it
        compressBody: acceptsGzip        // Compress the body if client accepts gzip
      });

      // Check if the response is an array (indicates compressed content)
      if (Array.isArray(response)) {
        // Destructure the array into headers and compressed body
        const [headers, compressedBody] = response;
        // Write the HTTP headers to the socket
        socket.write(headers);
        // Write the compressed body content to the socket
        socket.write(compressedBody);
      } else {
        // For non-compressed responses, write the entire response at once
        socket.write(response);
      }
      // Close the socket connection
      socket.end();
    } else if (request.method === "GET" && request.path.startsWith("/files")) {
      // Extract the filename from the third segment of the URL path (e.g., "/files/test.txt" -> "test.txt")
      const fileName = request.path.split("/")[2];
      // Construct the full file path by combining the directory path with the filename
      const filePath = `${fileDir}/${fileName}`;

      // Check if the file exists at the specified path
      if (!fs.existsSync(filePath)) {
        // If file doesn't exist, create a 404 Not Found response
        const response = createHttpResponse({
          message: "Not Found",
          statusCode: 404,
        });
        // Send the error response to the client
        socket.write(response);
        // Close the connection
        socket.end();
      } else {
        // If file exists, read its contents synchronously
        const fileContent = fs.readFileSync(filePath);
        // Send a 200 OK response with the file content
        // Include headers for content encoding, type, and length
        socket.write(
          `HTTP/1.1 200 OK\r\nContent-Encoding: ${request.acceptEncoding}\r\nContent-Type: application/octet-stream\r\nContent-Length: ${fileContent.length}\r\n\r\n${fileContent}\r\n`
        );
        // Close the connection
        socket.end();
      }
    } else if (request.method === "POST" && request.path.startsWith("/files")) {
      // Extract the filename from the third segment of the URL path (e.g., "/files/test.txt" -> "test.txt")
      const fileName = request.path.split("/")[2];
      // Construct the full file path by combining the directory path with the filename
      const filePath = `${fileDir}/${fileName}`;
      // Write the request body content to the file synchronously
      fs.writeFileSync(filePath, body);
      // Create an HTTP 201 Created response
      const response = createHttpResponse({
        message: "Created",
        statusCode: 201,
      });
      // Send the response back to the client
      socket.write(response);
    } else { // Handle cases that do not match any previous conditions
      const response = createHttpResponse({ // Create a response object for a "Not Found" error
        message: "Not Found", // Set the message to "Not Found"
        statusCode: 404, // Set the status code to 404
      });
      socket.write(response); // Send the response back to the client
    }
    socket.end(); // Close the socket connection
  });
});
server.listen(PORT, "localhost"); // Start the server and listen on the specified port

