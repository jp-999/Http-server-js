const net = require("net");

console.log("Logs from your program will appear here!");

// Create a new HTTP server.
const server = net.createServer((socket) => {
    // This callback function is called when a new connection is established.
    
    // Listen for incoming data on the socket.
    socket.on("data", (data) => {
      // Convert the incoming data to a string.
      const [requestLine, ...headers] = data.toString().split("\r\n");
      
      // Split the request line into the HTTP method and the requested path.
      const [method, path] = requestLine.split(" ");
      
      // Handle different types of requests based on the path.
      if (path === "/") {
        // If the path is the root URL, send a 200 OK response.
        socket.write("HTTP/1.1 200 OK\r\n\r\n");
      } else if(path.startsWith("/echo/")) {
        // If the path starts with '/echo/', handle the echo request.
        handleEchoRequest(path, socket);
      } else if(path === "/user-agent") {
        // If the path is '/user-agent', handle the user agent request.
        handleUserAgentRequest(headers, socket);
      } else if(path.startsWith("/files/")) {
        // If the path starts with '/files/', handle the file request.
        handleFileRequest(method, path, headers, socket);
      } else {
        // If the path does not match any of the above, send a 404 Not Found response.
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      }
      
      // Close the socket after sending the response.
      socket.end();
    });
    
    // Listen for the 'close' event on the socket.
    socket.on("close", () => {
      // Close the socket when the 'close' event is emitted.
      socket.end();
    });
  });

server.listen(4221, "localhost");

function handleEchoRequest(path, socket) {
    const str = path.substring(6);
    writeResponse(socket, "text/plain", str);
}

function handleUserAgentRequest(headers, socket) {
    const userAgentLine = headers.find(x => x.startsWith("User-Agent:"));
    const str = userAgentLine.split(": ")[1];
    writeResponse(socket, "text/plain", str);
}

function handleFileRequest(method, path, headers, socket) {
    const filename = path.substring(7);
    if(method == "GET") {
        if(fs.existsSync(paths.join(args[1], filename))) {
            const fileContent = fs.readFileSync(paths.join(args[1], filename));
            writeResponse(socket, "application/octet-stream", fileContent);
        } else {
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }
    } else if(method === "POST") {
        const location = paths.join(args[1], filename)
        fs.writeFileSync(location, headers[headers.length - 1]);
        socket.write("HTTP/1.1 201 Created\r\n\r\n");
    }
}

function writeResponse(socket, contentType, content) {
    socket.write("HTTP/1.1 200 OK\r\n");
    socket.write(`Content-Type: ${contentType}\r\n`);
    socket.write(`Content-Length:${content.length}\r\n\r\n`);
    socket.write(content);
}