import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';



const app = express();

dotenv.config();
app.use(express.json());

const mongoClient = new MongoClient("mongodb://localhost:27017")
let db;

try {
    await mongoClient.connect();
    db = mongoClient.db("batePapoUol");
} catch (err) {
    console.log("error mongodb", err);
}


app.get("/participants", async (req,res)=>{

    try{
    const participants  = await db.collection("participants").find().toArray();
    res.send(participants)
    } catch (err){
        console.log(err);
        res.sendStatus(500);
    }
});


app.post("/participants", async (req, res) => {
    const name = req.body;

    try {
        await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now(),
        });
        res.status(201).send("Participante postado");
    } catch (err) {
        res.status(500).send(err);
    }
});


app.get("/messages", async (req,res)=>{
    const limit = parseInt(req.query.limit);
    const user= req.headers.user;

    try{
        const messages = await db.collection("message").find().toArray();
        res.send(messages)
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
})



app.post("/messages", async (req,res)=>{
    const {to, text, type} = req.body;
    const from = req.headers.user;
    const time = dayjs().format('HH:MM:SS')

    try{
        await db.collection('message').insert({
            from,
            to,
            text,
            type,
            time,
        })
        res.status(201).send("Mensagem enviada com sucesso");
    } catch (err){
        res.status(422).send(err);
    }
    

})


app.listen(5000, () => {
    console.log("Rodando porta 5 mil");
})