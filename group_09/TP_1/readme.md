# Como configurar as máquinas passo a passo

## Config servers

O config server foi criado utilizando replica set para evitar erros caso uma máquina fique fora do ar. Para isso, foram criados 3 containers utilizando docker na mesma VM do google cloud. Os três containers foram conectados entre si para funcionarem com replica set.

Para subir os containers basta digitar o comando abaixo modificando apenas o diretório do arquivo `.yaml` caso necessário.
```
docker-compose -f config-server/docker-compose.yaml up -d
```

Para iniciar o replica set é necessário se conectar com algum dos containers.
```
mongo mongodb://<ip da máquina do config server>:<porta do container 1>
```

Feito isso é necessário linkar as 3 máquinas em um replica set.
```
rs.initiate(
  {
    _id: "cfgrs",
    configsvr: true,
    members: [
      { _id : 0, host : "<ip da máquina do config server>:<porta do container 1>" },
      { _id : 1, host : "<ip da máquina do config server>:<porta do container 2>" },
      { _id : 2, host : "<ip da máquina do config server>:<porta do container 3>" }
    ]
  }
)
```

Para verificar se o replica set foi configurado corretamente digite:
```
rs.status()
```

## Shard 1
Para permitir o escalonamento horizontal do banco ele foi configurado utilizando shard. Ele também foi criado utilizando replica set para evitar problemas caso uma das máquinas fique fora do ar do mesmo modo que o config server.

Para subir os containers basta digitar o comando abaixo modificando apenas o diretório do arquivo `.yaml` caso necessário.
```
docker-compose -f shard/docker-compose.yaml up -d
```

Para iniciar o replica set é necessário se conectar com algum dos containers.
```
mongo mongodb://<ip da máquina>:<porta do container 1>
```

Feito isso é necessário linkar as 3 máquinas em um replica set.
```
rs.initiate(
  {
    _id: "shard1rs",
    members: [
      { _id : 0, host : "<ip da máquina do shard 1>:<porta do container 1>" },
      { _id : 1, host : "<ip da máquina do shard 1>:<porta do container 2>" },
      { _id : 2, host : "<ip da máquina do shard 1>:<porta do container 3>" }
    ]
  }
)
```

Para verificar se o replica set foi configurado corretamente digite:
```
rs.status()
```

O sharding será configurado posteriormente quando todos os shards estiverem configurados e em execução.

## Mongos Router
O mongos também foi criado utilizando container para permitir sua portabilidade.

Para subir o container basta digitar o comando abaixo modificando apenas o diretório do arquivo `.yaml` caso necessário.
```
docker-compose -f mongos/docker-compose.yaml up -d
```

## Adicionando um shard ao cluster
Agora deve-se configurar o cluster. Primeiramente é necessário se conectar com o mongos.
```
mongo mongodb://<ip da máquina do mongos>:<porta do container do mongos>
```

Agora deve-se adicionar o shard criado anteriormente ao cluster.
```
mongos> sh.addShard("<nome do replica set do shard 1>/<ip da maquina do shard 1>:<porta do containe 1>,<ip da maquina do shard 1>:<porta do containe 2>,<ip da maquina do shard 1>:<porta do containe 3>")
```

Para verificar o status do shard e verificar se ele foi adicionado ao cluster digite:
```
mongos> sh.status()
```

## Shard 2
Agora para configurar o segundo shard deve-se seguir os mesmos passos da configuração do primeiro shard.

Para subir os containers basta digitar o comando abaixo modificando apenas o diretório do arquivo `.yaml` caso necessário.
```
docker-compose -f shard/docker-compose.yaml up -d
```

Para iniciar o replica set é necessário se conectar com algum dos containers.
```
mongo mongodb://<ip da máquina do shard 2>:<porta do container 1>
```

Feito isso é necessário linkar as 3 máquinas em um replica set.
```
rs.initiate(
  {
    _id: "shard2rs",
    members: [
      { _id : 0, host : "<ip da máquina do shard 2>:<porta do container 1>" },
      { _id : 1, host : "<ip da máquina do shard 2>:<porta do container 2>" },
      { _id : 2, host : "<ip da máquina do shard 2>:<porta do container 3>" }
    ]
  }
)
```

Para verificar se o replica set foi configurado corretamente digite:
```
rs.status()
```

## Adicionando o segundo shard ao cluster
Agora deve-se configurar o cluster. Primeiramente é necessário se conectar com o mongos.
```
mongo mongodb://<ip da máquina do mongos>:<porta do container do mongos>
```

Agora deve-se adicionar o shard criado anteriormente ao cluster.
```
mongos> sh.addShard("<nome do replica set do shard 2>/<ip da maquina do shard 2>:<porta do containe 1>,<ip da maquina do shard 2>:<porta do containe 2>,<ip da maquina do shard 2>:<porta do containe 3>")
```

Para verificar o status do shard e verificar se ele foi adicionado ao cluster digite:
```
mongos> sh.status()
```

## Habilitando shard em um banco de dados e em uma coleção
Após tudo isso o cluster já está funcionando, porém é necessário permitir que um banco de dados esteja disponível para sharding e logo após aplicar o sharding em uma coleção. Para isso, siga os seguintes passos:


Conectar com o mongos:
```
mongo mongodb://<ip da máquina do mongos>:<porta do container do mongos>
```

Permitir o sharding em um banco de dados MongoDB:
```
mongos> sh.enableSharding("<nome do banco de dados>") 
```

Permitir o sharding em uma coleção MongoDB: nessa etapa é necessário escolher qual será a hash key desse banco. Para melhor entendimento, é recomendado ler a [documentação](https://docs.mongodb.com/manual/core/sharding-shard-key/). Para esse trabalho o campo `_id` foi escolhido para ser a shard key utilizando um hash.
```
mongos> sh.shardCollection("<nome do banco de dados>.<nome da coleção>", {"_id": "hashed"}) 
```

Para verificar o sharding habilitado digite:
```
mongos> sh.getShardDistribution()
```

## Executando o notify e a aplicação
Com tudo configurado e rodando na nuvem basta executar os códigos presentes no diretório `/aplicacao`. Para isso execute o seguinte comando em alguma outra máquina que faça parte da rede interna dos seus outros clusters:
```
node notify.js
```

Em outro terminal execute o comando abaixo:
```
node app.js
```

Com isso o terminal que está executando o arquivo `aplicacao/app.js` irá fazer infinitamente operações no banco de dados do MongoDB, enquanto isso o terminal que está executando o arquivo `aplicacao/notify.js` ficará recebendo as atualziações do banco.