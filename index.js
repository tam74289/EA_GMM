const express = require("express");
const cors = require('cors');
const cpus = require("os").cpus();
const cluster = require("cluster");

const GetNonceAW = require("./model/getNonce");

const port = process.env.PORT || 3030;
const app = express();

const nodeType = cluster.isMaster ? "Master" : "Worker";

app.use(express.json());
app.use(cors());

if (cluster.isMaster) {
  for (let i = 0; i < cpus.length * 2; i++) {
    cluster.fork();
  }
  cluster.on("exit", (worker, code, signal) => {
    console.log("Worker #" + worker.process.pid, "exited");
    cluster.fork();
  });
} else {
  // index page
  app.get("/", (req, res) => {

     //  sets the header of the response to the user and the type of response that you would be sending back
     res.setHeader('Content-Type', 'text/html');
     res.write("<html>"); 
     res.write("<head>"); 
     res.write(`<title>decode nonce alien worlds : ${process.pid}</title>`); 
     res.write("</head>"); 
     res.write("<body>"); 
     res.write(`<h1>decode nonce alien worlds</h1>`); 
     res.write("</body>"); 
     res.write("<html>"); 
     res.end(); 
  });

  app.post("/mine", GetNonceAW, (req, res) => {
    res.status(200).send(req.nonce);
  });
  // server listening
  app.listen(port, () => {
    console.log(`[${nodeType} : ${process.pid}] running on port ${port}`);
  });
}
