const net = require("net");

console.log("Logs from your program will appear here!");

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString();
    console.log("Received request:", request);

    // Extract the request method and path
    const requestLines = request.split('\r\n');
    const requestLine = requestLines[0];
    const [method, path] = requestLine.split(' ');

    console.log("Method:", method); // Debug log
    console.log("Path:", path); // Debug log

    // Normalize the path (remove query parameters and trailing slashes)
    const normalizedPath = path.split('?')[0].replace(/\/$/, '');
    console.log("Normalized Path:", normalizedPath); // Debug log

    // Check if the request is for the "/not-found" path
    if (normalizedPath.toLowerCase() === "/not-found") {
      // Respond with HTTP 404 Not Found
      socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      console.log("Responded with 404 Not Found");
    } else {
      // Respond with HTTP 200 OK for all other requests
      socket.write("HTTP/1.1 200 OK\r\n\r\n");
      console.log("Responded with 200 OK");
    }
    socket.end(); // Close the socket after sending the response
  });

  socket.on("close", () => {
    socket.end();
  });
});

server.listen(4221, "localhost");