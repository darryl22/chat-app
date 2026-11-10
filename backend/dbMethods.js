const {MongoClient, GridFSBucket} = require("mongodb")
const client = new MongoClient("mongodb://localhost:27017/messages-app")
const fs = require('node:fs')
const path = require('path')
const {Readable} = require('node:stream')
const { error } = require("node:console")
// const {GridFsStorage} = require('multer-gridfs-storage')

// const gridStore = new GridFsStorage({
//     url: "mongodb://localhost:27017/messages-app",
//     file: (req, file) => {
//         return {
//             bucketName: "filesBucket",
//             chunkSize: 1024 * 1024 * 10,
//             filename: file.originalname,
//             metadata: JSON.parse(req.body.dataValues)
//         }
//     }
// })

class dbMethods {
    async getOne(col, filter = {}, options = {}) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.findOne(filter, options)
            return res
        } catch(error) {
            console.log(error)
        }
    }

    async getMany(col, filter = {}, projection = {}) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.find(filter).project(projection).toArray()
            return res
        } catch(error) {
            console.log(error)
        }
    }

    async getManySorted(col, filter = {}, sort, limit = 0, projection = {}) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.find(filter).sort(sort).limit(limit).project(projection).toArray()
            return res
        } catch(error) {
            console.log(error)
        }
    }

    async addOne(col, filter) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.insertOne(filter)
            return res
        } catch(error) {
            console.log(error)
        }
    }

    async addMany(col, filter, options = {}) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.insertMany(filter, options)
            return res
        } catch(error) {
            console.log(error)
        }
    }

    async makeUpdate(col, filter, update, options = {}) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.updateOne(filter, update, options)
            return res
        } catch(error) {
            console.log(error)
        }
    } 

    async makeUpdateMany(col, filter, update, options = {}) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.updateMany(filter, update, options)
            return res
        } catch(error) {
            console.log(error)
        }
    }
    
    async deleteOne(col, filter, options = {}) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.deleteOne(filter, options)
            return res
        } catch(error) {
            console.log(error)
        }
    }

    async deleteMany(col, filter, options = {}) {
        try{
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.deleteMany(filter, options)
            return res
        } catch(error) {
            console.log(error)
        }
    }

    async performAggregate(col, filter) {
        try {
            const db = client.db("messages-app")
            const collection = db.collection(col)
            const res = await collection.aggregate(filter)
            return res
        } catch(error) {
            console.log(error)
        }
    }

    async getIndex(col) {
        const db = client.db("messages-app")
        const collection = db.collection(col)
        const index = await collection.indexes()
        return index
    }

    async createIndex(col, sort) {
        const db = client.db("messages-app")
        const collection = db.collection(col)
        const index = await collection.createIndex(sort)
        return index
    }

    async checkIndex(col, key) {
        const db = client.db("messages-app")
        const collection = db.collection(col)
        const index = await collection.indexExists(key)
        return index
    }

    async uploadFileBuffer(buffer, filename, metadata) {
        try {
            const db = client.db("messages-app")
            const bucket = new GridFSBucket(db)
            const uploadStream = bucket.openUploadStream(filename, {
                metadata: metadata,
                chunkSizeBytes: 10048576
            })

            Readable.from(buffer).pipe(uploadStream).on("finish", () => {
                console.log(uploadStream)
                return uploadStream
            }).on("error", (err) => {
                console.log(error)
                return error
            })
        } catch (error) {
            console.log(error)
            return error
        }
    }

    async streamFileToUser(fileId, fileType, response) {
        try {
            const db = client.db("messages-app")
            const bucket = new GridFSBucket(db, {bucketName: "filesBucket"})
            response.set({
                'Content-Type': fileType || 'application/octet-stream',
            })
            let fileResult = bucket.openDownloadStream(fileId).pipe(response).on("error", (err) => {
                console.log("streaming error", err)
                return fileResult
            }).on("finish", () => {
                return fileResult
            })
            // console.log(fileResult)
        } catch (error) {
            console.log(error)
            return error
        }
    }
}

module.exports = {dbMethods, client}