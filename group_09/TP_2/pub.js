const { MongoClient } = require('mongodb');
const stream = require('stream');
const EventEmitter = require('events');

var publisher = {
    client: '',
    uriFila: "mongodb+srv://usuario_padrao:password_123@cluster-0.nacoh.mongodb.net/filaDB?retryWrites=true&w=majority",
    uriCachorros: "mongodb+srv://usuario_padrao:password_123@cluster-0.nacoh.mongodb.net/cachorrosDB?retryWrites=true&w=majority",
    aguardando: false,
    usando: false,
    log: new Map(),
    posicao: -1,
    insertedID: -1,
    evento: new EventEmitter(), 
    nome: '',
    vetTempo: [0, 1000, 2000, 3000, 4000, 5000]
};

publisher.evento.on('acquire', ()=>{
    if (publisher.usando == false && publisher.aguardando == false){
        acquire()
    }
})

async function main() {
    var [nomePublisher] = process.argv.slice(2)
    publisher.nome = nomePublisher

    publisher.client = new MongoClient(publisher.uriFila);
    
    try{
        await publisher.client.connect();
        var lista = await publisher.client.db("filaDB").collection("fila").find({}).toArray();
    }catch (err){
        throw err;
    }

    await monitorListingsUsingEventEmitter()
    lista.forEach(i => {
        publisher.log.set(i._id.toString(), {processado: i.processado, nome: i.nome});
    })
    publisher.evento.emit('acquire')

}

main().catch(console.error);

async function monitorListingsUsingEventEmitter() {
    const collection = publisher.client.db("filaDB").collection("fila");
    const changeStream = collection.watch();

    changeStream.on('change', async (next) => {

        if (next.operationType == 'update'){
            nome_ = publisher.log.get(next.documentKey._id.toString()).nome
            publisher.log.set(next.documentKey._id.toString(), {processado: true, nome: nome_})
            if (publisher.posicao > 0){
                publisher.posicao -= 1;

                if (publisher.posicao == 0){
                    publisher.aguardando = false;
                    publisher.usando = true;

                    console.log("usando recurso X");
                    tempoEspera = publisher.vetTempo[Math.floor(Math.random()*publisher.vetTempo.length)];
                    await sleep(tempoEspera);
                    publisher.log.set(publisher.insertedID.toString(), {processado: true, nome: publisher.nome})
                    await publisher.client.db("filaDB").collection("fila").updateOne({"_id": publisher.insertedID}, {$set:{'processado':true}});
                    publisher.posicao -= 1;

                    publisher.aguardando = false
                    publisher.usando = false;

                    console.log("liberando recurso X");
                    console.log();

                    publisher.evento.emit('acquire');
                }
            }
            else{
                publisher.posicao -= 1;
            }
        }
        else if (next.operationType == 'insert'){
            publisher.log.set(next.fullDocument._id.toString(), {processado: next.fullDocument.processado, nome: next.fullDocument.nome});
        }
        else{}
    });

}

async function acquire(){

    insercao = await publisher.client.db("filaDB").collection("fila").insertOne({'processado':false, 'nome':publisher.nome});
    publisher.insertedID = insercao.insertedId;
    publisher.log.set(publisher.insertedID.toString(), {processado: false, nome: publisher.nome})

    count = 0
    for (let [x, y] of publisher.log){
        if (x == publisher.insertedID){
            break;
        }

        if (y.processado == false){
            count += 1
        }
    }
    console.log()
    console.log(publisher.log)
    console.log()

    publisher.posicao = count;

    if (count == 0){
        publisher.aguardando = false;
        publisher.usando = true;

        console.log("usando recurso X");
        tempoEspera = publisher.vetTempo[Math.floor(Math.random()*publisher.vetTempo.length)];
        await sleep(tempoEspera);
        publisher.log.set(publisher.insertedID.toString(), {processado: true, nome: publisher.nome})
        await publisher.client.db("filaDB").collection("fila").updateOne({"_id": publisher.insertedID}, {$set:{'processado':true}});
        publisher.posicao -= 1;

        publisher.aguardando = false;
        publisher.usando = false;

        console.log("liberando recurso X");
        console.log()

        publisher.evento.emit('acquire');
    }
    else{
        publisher.aguardando = true
        publisher.usando = false;
    }

}

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
}