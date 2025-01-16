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