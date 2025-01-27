const net = require("net");
const fs = require("fs");
const zlib = require("zlib");

const PORT = 4221;
const fileDir = process.argv[3];
// You can use print statements as follows for debugging, they'll be visible when running tests.

const createHttpResponse = ({
  message = "OK",
  statusCode = 200,
  body = "",
  acceptEncoding = "",
  contentType = "text/plain",
  userAgent = "",
  compressBody = false,
}) => {
  const HTTP_VERSION = "HTTP/1.1";
  const NEW_LINE = "\r\n";

  let response_headers = {
    headLine: `${HTTP_VERSION} ${statusCode} ${message}${NEW_LINE}`,
    acceptEncoding: "Accept-Encoding: " + acceptEncoding + NEW_LINE,
    contentType: "Content-Type: " + contentType + NEW_LINE,
    contentLength: "Content-Length: " + body.length + NEW_LINE,
  };

  if (message !== "OK" && statusCode !== 200) {
    response_headers.headLine = `${HTTP_VERSION} ${statusCode} ${message}${NEW_LINE}`;
  }

  if (acceptEncoding && acceptEncoding.includes("gzip")) {
    response_headers.acceptEncoding = "Accept-Encoding: " + "gzip" + NEW_LINE;
    response_headers.contentEncoding = "Content-Encoding: " + "gzip" + NEW_LINE;
  }

  if (contentType !== "text/plain") {
    response_headers.contentType = "Content-Type: " + contentType + NEW_LINE;
  }

  if (userAgent !== "") {
    response_headers.userAgent = "User-Agent: " + userAgent + NEW_LINE;
  }

  if (body !== "") {
    if (
      response_headers.contentEncoding?.includes("gzip") &&
      compressBody === true
    ) {
      const compressed = zlib.gzipSync(body);

      response_headers.contentLength =
        "Content-Length: " + compressed.length + NEW_LINE; // overwrite content length

      let response = "";

      Object.values(response_headers).forEach((value) => {
        response += value;
      });

      response += NEW_LINE; // every header adds a new line so after all headers add a new line so it becomes two new lines meaning end of headers

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

// Uncomment this to pass the first stage
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

    // if path is "/" return "HTTP/1.1 200 OK\r\n\r\n"
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
