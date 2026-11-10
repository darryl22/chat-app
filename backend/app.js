require("dotenv").config()
const express = require("express")
const { Server } = require("socket.io")
const { createServer } = require("http")
const app = express()
const httpServer = createServer(app)
const worker_threads = require('node:worker_threads');
const {GridFsStorage} = require('multer-gridfs-storage')
const port = process.env.PORT
const cors = require("cors")
const multer = require("multer")
const session = require("express-session")
const mongoStore = require("connect-mongodb-session")(session)
const {dbMethods} = require("./dbMethods")
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
app.use(express.urlencoded({extended: true}))
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
const gridStore = new GridFsStorage({
    url: "mongodb://localhost:27017/messages-app",
    file: (req, file) => {
        const date = new Date()
        let metadata = JSON.parse(req.body.dataValues)
        metadata["dateAddedInMs"] = date.getTime()
        metadata["mimetype"] = file.mimetype
        return {
            bucketName: "filesBucket",
            chunkSize: 1024 * 1024 * 10,
            filename: file.originalname,
            metadata: metadata
        }
    }
})
const upload = multer({storage: gridStore})

async function setIndexes() {
    try {
        await db.createIndex("messages", {dateAddedInMs: -1, _id: -1})
        await db.createIndex("users", {user: "text"})
        await db.createIndex("members", {latestMessageMs: -1})
        await db.createIndex("filesBucket.files", {"metadata.chatId": 1})
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
    // let updateUsers = await db.makeUpdateMany("messages", {}, [
    //     {
    //         $set: {
    //             messageType: "message",
    //             deleted: false,
    //         }
    //     }
    // ])
    // console.log(updateUsers)
    let [user, friends, chats, users] = await Promise.all([
        db.getOne("users", { _id: userId }, { projection: { password: 0 } }),
        db.getMany("friends", { userId: userId }),
        db.getManySorted("members", { userId: userId }, {latestMessageMs: -1}),
        db.getMany("users", { _id: { $not: { $eq: userId } } }, { password: 0 })
    ])
    response.json({ status: "SUCCESS", message: "User logged in", user: user, friends: friends, chats: chats, users: users })
})

app.post("/api/searchUsers", async (request, response) => {
    try{
        console.log(request.body.searchString)
        if (request.body.searchString === "") {
            return response.json({ status: "SUCCESS", message: "Search Results success", results: []})
        }
        let searchResult = await db.getMany("users", {
            // $text: {$search: request.body.searchString}
            // user: {$regex: request.body.searchString, $options: 'i'}
            userLower: {$regex: `^${request.body.searchString.toLowerCase()}`}
        }, { password: 0 })
        console.log(searchResult)
        return response.json({ status: "SUCCESS", message: "Search Results success", results: searchResult})
    } catch (error) {
        console.log(error)
        return response.json({ status: "ERROR", message: "An error occured in user search" })
    }
})

app.post("/api/addFriend", async (request, response) => {
    try {
        // await client.connect()
        // const dbSession = client.startSession()
        console.log(request.body)
        const date = new Date()
        let receiverId = ObjectId.createFromHexString(request.body.receiverId)
        let receiverName = request.body.receiverName
        let userId = ObjectId.createFromHexString(request.session.userId)
        if(request.session.userId === request.body.receiverId) {
            return response.json({ status: "ERROR", message: "invalid action" })
        }
        let existingFriend = await db.getOne("friends", { friendId: receiverId, userId : userId })

        if (existingFriend !== null) {
            return response.json({ status: "ERROR", message: "Friend already added" })
        }


        // let addFriend = await dbSession.withTransaction(async () => {
            
        // })

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
                friendNameLower: receiverName.toLowerCase(),
                dateCreated: date.toISOString(),
                dateCreatedInMs: date.getTime(),
                chatId: newChat.insertedId
            },
            {
                userId: receiverId,
                friendId: userId,
                friendName: request.session.user,
                friendNameLower: request.session.user.toLowerCase(),
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
        if (request.body.chatId === "" || request.body.chatId === "None") {
            return response.json({ status: "SUCCESS", message: "Messages retrieved", data: [], chatId: request.body.chatId, nextCursor: "end", cursorMs: 0 })
        }

        let pageLimit = 10
        let cursorMs = 0
        let currentCursor = request.body.chatCursor
        let members = []
        if (request.body.action === "changeChat") {
            members = await db.getMany("members", { chatId: ObjectId.createFromHexString(request.body.chatId) }, {userId: 1, _id: 0})
        }

        if (currentCursor) {
            let messages = []
            let nextCursor = "end"
            currentCursor = decodeCursor(request.body.chatCursor)
            // console.log("currentCursor", currentCursor)
            if (request.body.action === "jumpToTimestamp" && request.body.jumpToMs) {
                //5 min conversation time window to load older messages related to reply
                let conversationWindowMs = request.body.jumpToMs - (5 * 60 * 1000)
                messages = await db.getManySorted("messages", {
                    chatId: ObjectId.createFromHexString(request.body.chatId), 
                    $or: [
                        {
                            dateAddedInMs: {
                                $lt: currentCursor.dateAddedInMs,
                                $gte: request.body.jumpToMs
                            }
                        },
                        {
                            dateAddedInMs: currentCursor.dateAddedInMs,
                            _id: {
                                $lt: currentCursor._id
                            }
                        }
                    ]
                }, {dateAddedInMs: -1})
            }
            if (request.body.action === "loadMoreChats") {
                messages = await db.getManySorted("messages", {
                    chatId: ObjectId.createFromHexString(request.body.chatId),
                    $or: [
                        {
                            dateAddedInMs: {
                                $lt: currentCursor.dateAddedInMs
                            }
                        },
                        {
                            dateAddedInMs: currentCursor.dateAddedInMs,
                            _id: {
                                $lt: currentCursor._id
                            }
                        }
                    ]
                }, {dateAddedInMs: -1}, pageLimit)
            }
            if (messages.length === pageLimit || request.body.action === "jumpToTimestamp") {
                nextCursor = encodeCursor({
                    dateAddedInMs: messages[messages.length - 1].dateAddedInMs,
                    _id: messages[messages.length - 1]._id.toString()
                })
                cursorMs = messages[messages.length - 1].dateAddedInMs
            }
            return response.json({ status: "SUCCESS", message: "Messages retrieved", data: messages, chatId: request.body.chatId, nextCursor: nextCursor, cursorMs:  cursorMs})
        }

        let messages = await db.getManySorted("messages", { chatId: ObjectId.createFromHexString(request.body.chatId)}, {dateAddedInMs: -1}, pageLimit)
        // console.log(messages[0].dateAddedInMs, messages[messages.length - 1].dateAddedInMs)
        
        let nextCursor = "end"
        if (messages.length === pageLimit) {
            nextCursor = encodeCursor({
                dateAddedInMs: messages[messages.length - 1].dateAddedInMs,
                _id: messages[messages.length - 1]._id.toString()
            })
            cursorMs = messages[messages.length - 1].dateAddedInMs
        }
        response.json({ status: "SUCCESS", message: "Messages retrieved", data: messages, chatId: request.body.chatId, nextCursor: nextCursor,cursorMs: cursorMs, members: members })
    } catch (error) {
        console.log(error)
        response.json({ status: "ERROR", message: "Error getting messages" })
    }
})

app.post("/api/sendMessage", async (request, response) => {
    try{
        const date = new Date()
        // let conversation = ObjectId.createFromHexString(currentChat.conversation)
        if (request.body.message === "") {
            return response.json({ status: "ERROR", message: "Error sending message" })
        }

        let chatId = ObjectId.createFromHexString(request.body.chatId)

        let messageQuery = {
            chatId: chatId,
            message: request.body.message,
            messageType: "message",
            sender: ObjectId.createFromHexString(request.body.senderId),
            senderName: request.body.sender,
            dateAdded: date.toISOString(),
            dateAddedInMs: date.getTime(),
            deleted: false
        }

        if (request.body.messageType === "reply") {
            messageQuery["replyMessage"] = request.body.replyMessage
            messageQuery["replyId"] = ObjectId.createFromHexString(request.body.replyId)
            messageQuery["replyMessageMs"] = request.body.replyMessageMs
            messageQuery["messageType"] = "reply"
        }

        let addMessage = await db.addOne("messages", messageQuery)
        let updateLatestMessage = await db.makeUpdateMany("members", { chatId: chatId }, {
            $set: {
                latestMessage: request.body.message,
                latestMessageMs: date.getTime()
            }
        })
        let updateLatestMessageChat = await db.makeUpdate("chats", { _id: chatId }, {
            $set: {
                latestMessage: request.body.message,
                latestMessageMs: date.getTime()
            }
        })
        messageQuery["_id"] = addMessage.insertedId
        return response.json({ status: "SUCCESS", message: "Message added", sentMessage: messageQuery})
    } catch(error) {
        console.log(error)
    }
})

app.post("/api/deleteMessage", async (request, response) => {
    try{
        let messageId = ObjectId.createFromHexString(request.body.messageId)
        let deleteMessage = await db.deleteOne("message", {_id: messageId})
        return response.json({ status: "SUCCESS", message: "Message Deleted"})
    }catch(error) {
        console.log(error)
        return response.json({ status: "ERROR", message: "Error deleting message"})
    }
})

app.post("/api/sendAttachment", upload.array('files'), async (request, response) => {
    try {
        if(!request.files) {
            return response.json({ status: "ERROR", message: "Error adding attachment", sentMessage: {}})
        }
        // console.log(request.files)
        const date = new Date()
        let dataValues = JSON.parse(request.body.dataValues)
        let chatId = ObjectId.createFromHexString(dataValues.chatId)
        let sender = ObjectId.createFromHexString(dataValues.senderId)
        console.log(request.files)
        // let addFiles = []
        // let fileUpload = await db.uploadFileBuffer(request.files[0].buffer, request.files[0].originalname, {
        //     chatId: chatId,
        //     filename: request.files[0].originalname,
        //     mimetype: request.files[0].mimetype
        // })
        // console.log(fileUpload)
        let newMessages = []
        request.files.forEach((file) => {
            let messageQuery = {
                chatId: chatId,
                message: dataValues.caption,
                messageType: "file",
                sender: sender,
                senderName: dataValues.sender,
                dateAdded: date.toISOString(),
                dateAddedInMs: date.getTime(),
                deleted: false,
                fileName: file.originalname,
                fileId: file.id,
                fileSize: file.size,
                dateAddedInMs: file.metadata.dateAddedInMs
            }
            newMessages.push(messageQuery)
        })
        let fileMessages = await db.addMany("messages", newMessages)
        let updateLatestMessage = await db.makeUpdateMany("members", { chatId: chatId }, {
            $set: {
                latestMessage: "files",
                latestMessageMs: request.files[0].metadata.dateAddedInMs
            }
        })
        let updateLatestMessageChat = await db.makeUpdate("chats", { _id: chatId }, {
            $set: {
                latestMessage: "files",
                latestMessageMs: request.files[0].metadata.dateAddedInMs
            }
        })
        console.log(fileMessages)
        return response.json({ status: "SUCCESS", message: "Message added", sentMessage: newMessages})
    } catch(error) {
        console.log(error)
        return response.json({ status: "ERROR", message: "Error adding attachment", sentMessage: []})
    }
})

app.post("/api/getAttachment", async (request, response) => {
    try {
        let fileId = ObjectId.createFromHexString(request.body.fileId)
        let fileData = await db.getOne("filesBucket.files", {_id: fileId})
        if (fileData === null) {
            return response.status(404).json({ status: "ERROR", message: "File not available"})
        }
        await db.streamFileToUser(fileId, fileData.metadata.mimetype, response)
    } catch (error) {
        console.log(error)
        return response.json({ status: "ERROR", message: "Error adding attachment"})
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
            userLower: request.body.username.toLowerCase(),
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

    socket.on("message", async (message, membersList) => {
        try {
            console.log(message, membersList)
            io.to(membersList).emit("updatemessage", message)
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