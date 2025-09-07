const http = require("http");
const fs = require("fs").promises;
const path = require("path");
const url = require("url");

class FileServer {
  constructor(port) {
    this.port = port ?? 3000;
    this.server = null;
  }

  async handleRequest(req, res) {
    const parsedUrl = url.parse(req.url, true);
    const pathName = parsedUrl.pathname;
    const method = req.method;

    // CORS for FrontEnd
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (method === "GET" && pathName === "/") {
        const html = await fs.readFile("../FrontEnd/index.html", "utf-8");
        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(html);
      } else if (method === "GET" && pathName === "/style.css") {
        const css = await fs.readFile("../FrontEnd/style.css", "utf-8");
        res.writeHead(200, { "Content-Type": "text/css" });
        res.end(css);
      } else if (method === "GET" && pathName === "/index.js") {
        const js = await fs.readFile("../FrontEnd/index.js", "utf-8");
        res.writeHead(200, { "Content-Type": "application/javascript" });
        res.end(js);
      } else if (method === "GET" && pathName === "/files") {
        await this.listFiles(res);
      } else if (method === "GET" && pathName.startsWith("/files/")) {
        const fileName = pathName.substring(7);
        await this.readFile(res, fileName);
      } else if (method === "POST" && pathName === "/files") {
        await this.createFile(req, res);
      } else if (method === "DELETE" && pathName.startsWith("/files/")) {
        const fileName = pathName.substring(7);
        await this.deleteFile(res, fileName);
      } else {
        this.sendResponse(res, 404, { error: "Server Not Found" });
      }
    } catch (error) {
      console.log(error);
      this.sendResponse(res, 500, { error: "Internal Server Error" });
    }
  }

  async listFiles(res) {
    try {
      const files = await fs.readdir("../files");
      const textExtensions = [".txt", ".md", ".log", ".csv", ".json"];
      const textFiles = files.filter((file) =>
        textExtensions.includes(path.extname(file).toLowerCase())
      );
      this.sendResponse(res, 200, textFiles);
    } catch (error) {
      console.log(error);
      this.sendResponse(res, 500, { error: "Internal Server Error" });
    }
  }

  async readFile(res, fileName) {
    try {
      const data = await fs.readFile(path.join("../files", fileName), "utf-8");
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(data);
    } catch (error) {
      console.log(error);
      this.sendResponse(res, 404, { error: "File Not Found" });
    }
  }

  async createFile(req, res) {
    try {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk.toString();
      });
      req.on("end", async () => {
        try {
          const { fileName, content } = JSON.parse(body);

          // Check if file has a valid text extension, if not add .txt
          const textExtensions = [".txt", ".md", ".log", ".csv", ".json"];
          const hasValidExtension = textExtensions.some((ext) =>
            fileName.toLowerCase().endsWith(ext)
          );

          const finalFileName = hasValidExtension
            ? fileName
            : fileName + ".txt";

          await fs.writeFile(
            path.join("../files", finalFileName),
            content ?? "",
            "utf-8"
          );
          this.sendResponse(res, 201, { message: "File Created Successfully" });
        } catch (error) {
          console.log(error);
          this.sendResponse(res, 500, { error: "Error Creating File" });
        }
      });
    } catch (error) {
      console.log(error);
      this.sendResponse(res, 500, { error: "Error Processing Request" });
    }
  }

  async deleteFile(res, fileName) {
    try {
      await fs.unlink(path.join("../files", fileName));
      this.sendResponse(res, 200, { message: "File Deleted Successfully" });
    } catch (error) {
      this.sendResponse(res, 500, { error: "Error Deleting File" });
    }
  }

  sendResponse(res, statusCode, data) {
    res.writeHead(statusCode, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  }

  start() {
    this.server = http.createServer(this.handleRequest.bind(this));
    const port = process.env.PORT || this.port;
    this.server.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });
  }
}

const server = new FileServer(3000);

// For Vercel serverless functions
if (process.env.VERCEL) {
  module.exports = server.handleRequest.bind(server);
} else {
  server.start();
}
