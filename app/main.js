const net = require("net");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this to pass the first stage
const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const request = data.toString();
    console.log("Received request:", request);

    // Extract the request path
    const requestPath = request.split(' ')[1];

    // Check if the request is for the "/not-found" path
    if (requestPath === "/not-found") {
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
