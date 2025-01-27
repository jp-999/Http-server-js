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

// Function to handle echo requests.
function handleEchoRequest(path, socket) {
    // Extract the string to be echoed from the path.
    const str = path.substring(6);
    
    // Send the echoed string as a response.
    writeResponse(socket, "text/plain", str);
  }

// Function to handle user agent requests.
function handleUserAgentRequest(headers, socket) {
    // Find the 'User -Agent' header in the request headers.
    const userAgentLine = headers.find(x => x.startsWith("User -Agent:"));
    
    // Extract the user agent string from the header.
    const str = userAgentLine.split(": ")[1];
    
    // Send the user agent string as a response.
    writeResponse(socket, "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: ${userAgent.length}\r\n\r\n${userAgent}", str);
  }

// Function to handle file requests.
function handleFileRequest(method, path, headers, socket) {
    // Extract the filename from the path.
    const filename = path.substring(7);
    
    // Handle GET requests.
    if(method == "GET") {
      // Check if the file exists.
      if(fs.existsSync(paths.join(args[1], filename))) {
        // Read the file content.
        const fileContent = fs.readFileSync(paths.join(args[1], filename));
        
        // Send the file content as a response.
        writeResponse(socket, "application/octet-stream", fileContent);
      } else {
        // Send a 404 Not Found response if the file does not exist.
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
      }
    } 
    // Handle POST requests.
    else if(method === "POST") {
      // Get the location of the file to be written.
      const location = paths.join(args[1], filename)
      
      // Write the file content.
      fs.writeFileSync(location, headers[headers.length - 1]);
      
      // Send a 201 Created response.
      socket.write("HTTP/1.1 201 Created\r\n\r\n");
    }
  }

// Function to write a response to the socket.
function writeResponse(socket, contentType, content) {
    // Send the HTTP status line.
    socket.write("HTTP/1.1 200 OK\r\n");
    
    // Send the 'Content-Type' header.
    socket.write(`Content-Type: ${contentType}\r\n`);

    // Send the 'Content-Length' header.
socket.write(`Content-Length:${content.length}\r\n\r\n`);
  
// Send the response content.
socket.write(content);
}