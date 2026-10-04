const {MongoClient} = require("mongodb")
const client = new MongoClient("mongodb://localhost:27017/messages-app")

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
}

module.exports = {dbMethods, client}