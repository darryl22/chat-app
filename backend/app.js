require("dotenv").config()
const express = require("express")
const { Server } = require("socket.io")
const { createServer } = require("http")
const app = express()
const httpServer = createServer(app)
const port = process.env.PORT
const cors = require("cors")
const session = require("express-session")
const mongoStore = require("connect-mongodb-session")(session)
const {dbMethods, client} = require("./dbMethods")
const db = new dbMethods()
const { ObjectId } = require("mongodb")

// inspect ngrok requests at http://localhost:4040/inspect/http
app.use(cors({
    origin: ["http://localhost:5173", "http://10.0.0.180:5173", process.env.FRONTEND_URL],
    credentials: true,
    allowedHeaders: ["ngrok-skip-browser-warning", "Content-Type"]
}))
const store = new mongoStore({
    uri: "mongodb://localhost:27017/messages-app",
    databaseName: "messages-app",
    collection: "sessions"
})
const { MongoClient } = require("mongodb")

app.use(express.json())
app.use(express.static('public'))
const sessionMiddleware = session({
    secret: process.env.SESSION_SECRET,
    // name: "sessioncookie",
    cookie: {
        secure: false,
        // maxAge: 86400000,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: 'lax',
        httpOnly: true
    },
    store: store,
    saveUninitialized: false,
    resave: false
})
// app.set('trust proxy', 1)
app.use(sessionMiddleware)

app.use((request, response, next) => {
    if (request.session.user) {
        response.locals.loggedInUser = request.session.user
    } else {
        response.locals.loggedInUser = null
    }  
    next()
})

async function setIndexes() {
    try {
        let messagesIndexExists = await db.checkIndex("messages", "dateAddedInMs_-1__id_-1")
        if (messagesIndexExists) {
            console.log("message index exists")
        } else {
            let messagesIndex = await db.createIndex("messages", {dateAddedInMs: -1, _id: -1})
            console.log(messagesIndex)
            console.log("message index set")
        }
    } catch(error) {
        console.log(error)
    }
}

function encodeCursor(payload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodeCursor(cursor) {
  const payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  return payload
}

app.get('/api/messagesData', async (request, response) => {
    if (!request.session.userId) {
        return response.json({ status: "ERROR", message: "No signed in user" })
    }
    let userId = ObjectId.createFromHexString(request.session.userId)
    let [user, friends, chats, users] = await Promise.all([
        db.getOne("users", { _id: userId }, { projection: { password: 0 } }),
        db.getMany("friends", { userId: userId }),
        db.getMany("members", { userId: userId }),
        db.getMany("users", { _id: { $not: { $eq: userId } } }, { password: 0 })
    ])
    response.json({ status: "SUCCESS", message: "User logged in", user: user, friends: friends, chats: chats, users: users })
})

app.post("/api/addFriend", async (request, response) => {
    try {
        await client.connect()
        const dbSession = client.startSession()
        console.log(request.body)
        const date = new Date()
        let receiverId = ObjectId.createFromHexString(request.body.receiverId)
        let receiverName = request.body.receiverName
        let userId = ObjectId.createFromHexString(request.session.userId)
        let existingFriend = await db.getOne("friends", { friendId: receiverId, userId : userId })

        if (existingFriend !== null) {
            return response.json({ status: "ERROR", message: "Friend already added" })
        }

        let addFriend = await dbSession.withTransaction(async () => {
            
        })

        let newChat = await db.addOne("chats", {
            dateCreated: date.toISOString().split("T")[0],
            dateCreatedInMs: date.getTime(),
            latestMessage: "",
            latestMessageMs: date.getTime(),
            type: "duo"
        })

        let res = await db.addMany("friends", [
            {
                userId: userId,
                friendId: receiverId,
                friendName: receiverName,
                dateCreated: date.toISOString(),
                dateCreatedInMs: date.getTime(),
                chatId: newChat.insertedId
            },
            {
                userId: receiverId,
                friendId: userId,
                friendName: request.session.user,
                dateCreated: date.toISOString(),
                dateCreatedInMs: date.getTime(),
                chatId: newChat.insertedId
            }
        ], { ordered: true })
        console.log(res)

        let members = await db.addMany("members", [
            {
                userId: userId,
                userName: request.session.user,
                chatId: newChat.insertedId,
                chatTitle: receiverName,
                latestMessage: "",
                latestMessageMs: date.getTime()
            },
            {
                userId: receiverId,
                userName: receiverName,
                chatId: newChat.insertedId,
                chatTitle: request.session.user,
                latestMessage: "",
                latestMessageMs: date.getTime()
            }
        ])
        console.log(members)
        response.json({ status: "SUCCESS", message: "New Friend" })
    } catch (error) {
        console.log(error)
        response.json({ status: "ERROR", message: "Error adding friend" })
    }
})

app.post("/api/getMessages", async (request, response) => {
    try {
        console.log(request.body)
        if (request.body.chatId === "" || request.body.chatId === "None") {
            return response.json({ status: "SUCCESS", message: "Messages retrieved", data: [], chatId: request.body.chatId, nextCursor: "end" })
        }

        let currentCursor = request.body.chatCursor
        if (currentCursor) {
            currentCursor = decodeCursor(request.body.chatCursor)
            console.log("currentCursor", currentCursor)
            let messages = await db.getManySorted("messages", { chatId: ObjectId.createFromHexString(request.body.chatId), $or: [
                {dateAddedInMs: {$lt: currentCursor.dateAddedInMs}},
                {dateAddedInMs: currentCursor._id, _id: {$lt: currentCursor._id}}
            ]}, {dateAddedInMs: -1}, 5)
            console.log(messages[0])
            let nextCursor = "end"
            if (messages.length === 5) {
                console.log(messages[messages.length - 1])
                nextCursor = encodeCursor({
                    dateAddedInMs: messages[messages.length - 1].dateAddedInMs,
                    _id: messages[messages.length - 1]._id.toString()
                })
            }
            return response.json({ status: "SUCCESS", message: "Messages retrieved", data: messages, chatId: request.body.chatId, nextCursor: nextCursor })
        }

        let messages = await db.getManySorted("messages", { chatId: ObjectId.createFromHexString(request.body.chatId)}, {dateAddedInMs: -1}, 5)
        
        let nextCursor = "end"
        if (messages.length === 5) {
            console.log(messages[messages.length - 1])
            nextCursor = encodeCursor({
                dateAddedInMs: messages[messages.length - 1].dateAddedInMs,
                _id: messages[messages.length - 1]._id.toString()
            })
        }
        response.json({ status: "SUCCESS", message: "Messages retrieved", data: messages, chatId: request.body.chatId, nextCursor: nextCursor })
    } catch (error) {
        console.log(error)
        response.json({ status: "ERROR", message: "Error getting messages" })
    }
})

app.post("/api/login", async (request, response) => {
    try {
        let body = request.body
        console.log(request.body)
        let res = await db.getOne("users", {
            user: request.body.username
        })
        console.log(res)
        if (!res) {
            return response.json({ status: "ERROR", message: "user not found" })
        }
        if (res.password !== request.body.password) {
            return response.json({ status: "ERROR", message: "Password missmatch" })
        }
        request.session.user = request.body.username
        request.session.userId = res._id.toString()
        response.json({ status: "SUCCESS", message: "User found", user: res })
    } catch (error) {
        console.log(error)
        response.json({ status: "ERROR", message: "Login test" })
    }
})

app.post("/api/signup", async (request, response) => {
    try {
        let body = request.body
        if (request.body.password !== request.body.confirmpassword) {
            return response.json({ status: "ERROR", message: "Password Missmatch" })
        }

        let existingUser = await db.getOne("users", { user: request.body.username })

        if (existingUser !== null) {
            return response.json({ status: "ERROR", message: "User already exists" })
        }

        let res = await db.addOne("users", {
            user: request.body.username,
            password: request.body.password
        })
        console.log(res)
        request.session.user = request.body.username
        response.json({ status: "SUCCESS", message: "Signup test" })
    } catch (error) {
        console.log(error)
        response.json({ status: "ERROR", message: "Signup test" })
    }
})

app.get("/api/logout", async (request, response) => {
    try {
        request.session.destroy()
        response.clearCookie()
        return response.json({ status: "SUCCESS", message: "Logged out" })
    } catch (error) {
        console.log(error)
        return response.json({ status: "ERROR", message: "Error logging out" })
    }
})

const io = new Server(httpServer, {
    cors: {
        origin: ["http://localhost:5173", "http://10.0.0.180:5173", process.env.FRONTEND_URL],
        credentials: true,
        allowedHeaders: ["ngrok-skip-browser-warning", "Content-Type"]
    },
    // cookie: true
})

io.engine.use(sessionMiddleware)
// io.use((socket, next) => {
//     console.log(socket.handshake)
// })
io.on("connection", (socket) => {
    socket.on("joinroom", async (userId) => {
        socket.join(`user:${userId}`)
        // console.log("room", socket.rooms)
    })

    socket.on("message", async (message, sender, chatId) => {
        try {
            // console.log(socket.rooms)
            const date = new Date()
            // let conversation = ObjectId.createFromHexString(currentChat.conversation)

            let messageQuery = {
                chatId: ObjectId.createFromHexString(chatId),
                message: message,
                sender: ObjectId.createFromHexString(sender.userId),
                senderName: sender.user,
                dateAdded: date.toISOString(),
                dateAddedInMs: date.getTime()
            }

            // get members to send notifications
            let members = await db.getMany("members", { chatId: ObjectId.createFromHexString(chatId) })
            console.log("members", members)
            let addMessage = await db.addOne("messages", messageQuery)
            let updateLatestMessage = await db.makeUpdateMany("members", { chatId: ObjectId.createFromHexString(chatId) }, {
                $set: {
                    latestMessage: message,
                    latestMessageMs: date.getTime()
                }
            })
            let updateLatestMessageChat = await db.makeUpdate("chats", { _id: ObjectId.createFromHexString(chatId) }, {
                $set: {
                    latestMessage: message,
                    latestMessageMs: date.getTime()
                }
            })
            console.log("addMessage", addMessage)
            console.log("updateLatestMessage", updateLatestMessage)
            console.log("updateLatestMessageChat", updateLatestMessageChat)
            for (let x = 0; x < members.length; x++) {
                console.log(members[x].userId.toString())
                io.to(`user:${members[x].userId.toString()}`).emit("updatemessage", addMessage.insertedId, messageQuery)
            }
        } catch (error) {
            console.log(error)
        }
        // io.emit("updatemessage", addMessage.insertedId, messageQuery)
    })
})

async function serverStart() {
    await setIndexes()
    httpServer.listen(port, () => {
        console.log(`Server started on port http://localhost:${port}`)
    })
}

serverStart()