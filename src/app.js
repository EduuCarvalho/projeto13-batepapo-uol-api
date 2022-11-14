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

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

try {
    await mongoClient.connect();
    db = mongoClient.db("batePapoUol");
} catch (err) {
    console.log("error mongodb", err);
}


async function validationParticipant(req){

    const validation = participantsSchema.validate(req.body);
    const isValid = !validation.error;

    const sameName = await db.collection("participants").findOne({name: req.body.name})

    if (!isValid) {
        return 422; 
       } else if (sameName){
        return 409;
       }
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
    const time = dayjs().format("HH:mm:ss");

    const validation = participantsSchema.validate(req.body,{ abortEarly:false});

    if (validation.error){
        const errors = validation.error.details.map((detail)=> detail.message);
        res.send(errors);
        return
    }

    const error = await validationParticipant(req);
    if (error) {
        return res.sendStatus(error)
    } 
    
    try {
        await db.collection("participants").insertOne({
            name,
            lastStatus: Date.now(),
        });
        await db.collection("message").insertOne({
            "from":name,
            "to":"todos",
            "text": "entrou na sala...",
            "type":"statys",
            time,
        })

        res.status(201).send("Participante postado");
    } catch (err) {
        res.status(422).send(err);
    }
});


app.get("/messages", async (req,res)=>{
    const limit = parseInt(req.query.limit);
   
    const user= req.headers.user;

    const filterMessage = await db.collection("message")
    .find({ $or: [{ "from":user}, {"to": user},{ "type": "message"}, { "type": "status"}]})
    .toArray();



    try{
       if (!limit){
        res.send(filterMessage)
        return
       }
        res.send(filterMessage .slice(-limit))
    } catch (err) {
    
        res.sendStatus(500).send(err);
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
        await db.collection('message').insertOne({
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


app.post("/status",async (req,res)=>{

    const nameUser = req.headers.user;

    try {
        const participant = await db.collection("participants").findOne({ "name":  nameUser})


        if (!participant){
            res.sendStatus(404)
            return
        }
         db.collection("participants").updateOne({name: nameUser}, { $set: {lastStatus:Date.now()}})
         .then(
            res.sendStatus(200)
         )
    } catch (err) {
        res.status(500).send(err);
    }


})

setInterval(updateParticipant,15000)


function updateParticipant (){

    const now = Date.now();

    db.collection("participants").find()
    .toArray()
    .then((p)=>{
        p.forEach (element => {
            const idleTime = now - element.lastStatus

            if (idleTime > 10000) {

                db.collection("participants").deleteOne({name:element.name})
                db.collection("message").insertOne({
                    from: element.name,
                    to: 'todos',
                    text : "sai da sala...",
                    type: "status",
                    time: dayjs().format("HH:mm:ss")
                })
            }
        })
    })
}

app.listen(5000, () => {
    console.log("Rodando porta 5k");
})