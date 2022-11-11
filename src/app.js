import express from 'express';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import joi from 'joi';
import cors from 'cors';


const participantsSchema = joi.object({
    name:joi.string().required()
})

const messagesSchema = joi.object({
    to: joi.string().required(),
    text:joi.string().required(),
    type:joi.string().required(),
})


const app = express();

dotenv.config();
app.use(cors());
app.use(express.json());

const mongoClient = new MongoClient("mongodb://localhost:27017")
let db;

try {
    await mongoClient.connect();
    db = mongoClient.db("batePapoUol");
} catch (err) {
    console.log("error mongodb", err);
}

//TUdo certo com o get /participants
app.get("/participants", async (req,res)=>{

    try{
    const participants  = await db
    .collection("participants")
    .find()
    .toArray();
    res.send(participants)
    } catch (err){
        console.log(err);
        res.sendStatus(500);
    }
});

//TUdo certo com o post /participants
app.post("/participants", async (req, res) => {
    const {name}= req.body;

    const validation = participantsSchema.validate(req.body,{ abortEarly:false});

    if (validation.error){
        const errors = validation.error.details.map((detail)=> detail.message);
        res.send(errors);
        return
    }

    try {
        await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now(),
        });
        res.status(201).send("Participante postado");
    } catch (err) {
        res.status(422).send(err);
    }
});


app.get("/messages", async (req,res)=>{
    const limit = parseInt(req.query.limit);
    console.log(limit)
    const user= req.headers.user;


    try{
        const messages = await db
        .collection("message")
        .find()
        .toArray();
        res.send(messages.slice(-limit))
    } catch (err) {
        console.log(err);
        res.sendStatus(500);
    }
})



app.post("/messages", async (req,res)=>{
    const {to,text,type} = req.body;
    const from = req.headers.user;
    const time = dayjs().format('HH:mm:ss')
    const validation = messagesSchema.validate(req.body,{ avortEarly: false});

    if (validation.error){
        const errors=validation.error.details.map((detail)=>detail.message);
        res.send(errors);
        return;
    }
   const userVerify= await db.collection('participants').find({name:from}).toArray();
   console.log(userVerify)

    if (userVerify.length ===0 ){
        res.sendStatus(404);
        return;
    }

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