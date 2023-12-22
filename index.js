const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// middlewares
app.use(
  cors({
    origin: [
      "https://tasker-job.web.app",
      "https://tasker-job.surge.sh",
      "http://tasker-job.surge.sh",
      "http://localhost:5173",
      "*",
    ],
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use(express.json());
app.use(cookieParser());

// custom middlewares
const verifyToken = (req, res, next) => {
  const token = req.cookies?.userToken;
  if (!token) {
    return res.status(401).send({ message: "Not Authorized" });
  }
  try {
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "Not Authorized" });
      }
      // console.log("decoded user", decoded);
      req.user = decoded;
      next();
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error verifying token" });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@taskercluster.knsmkqx.mongodb.net/?retryWrites=true&w=majority`;
// const localURI = "mongodb://127.0.0.1:27017";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    //   collections
    const usersCollection = client.db("tasker").collection("users");
    const todosCollection = client.db("tasker").collection("todos");

    //   generate token
    app.post("/jwt", async (req, res) => {
      const userInfo = req.body;
      try {
        const token = jwt.sign(userInfo, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "10hr",
        });
        // console.log({ userInfo, token });
        res
          .cookie("userToken", token, {
            httpOnly: true,
            sameSite: "none",
            secure: true,
          })
          .send({
            message: "Token generated Successfully.",
            userToken: token,
          });
      } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Token generating failed." });
      }
    });

    //   routes
    //   add new user to db
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //   get all user
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find({}).toArray();
      res.send(users);
    });

    //   add todo to database
    app.post("/todos", async (req, res) => {
      const todo = req.body;
      const result = await todosCollection.insertOne(todo);
      res.send(result);
    });

    app.patch("/todos/:id", async (req, res) => {
      const id = req.params.id;
      const todo = req.body;
      //   console.log({ id, todo });
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: todo,
      };
      const result = await todosCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    //   get all tasks
    app.get("/todos", async (req, res) => {
      const todos = await todosCollection.find({}).toArray();
      res.send(todos);
    });

    // delete a todo from db
    app.delete("/todos/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await todosCollection.deleteOne(filter);
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("<h1><center>Tasker backend is running!</center></h1>");
});

app.listen(port, () => {
  console.log(`Tasker backend listening on port ${port}`);
});
