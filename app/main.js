const net = require("net");

console.log("Logs from your program will appear here!");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const [requestLine, ...headers] = data.toString().split("\r\n");
        const [method, path] = requestLine.split(" ");

        if (path === "/") {
            socket.write("HTTP/1.1 200 OK\r\n\r\n");
        } else if(path.startsWith("/echo/")) {
            handleEchoRequest(path, socket);
        } else if(path === "/user-agent") {
            handleUserAgentRequest(headers, socket);
        } else if(path.startsWith("/files/")) {
            handleFileRequest(method, path, headers, socket);
        } else {
            socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        }
    socket.end(); // Close the socket after sending the response
  });

  socket.on("close", () => {
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