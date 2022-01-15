//Importando Libs
import org.apache.spark._
import org.apache.spark.graphx._
import org.apache.spark.rdd.RDD
import org.apache.spark.graphx.GraphLoader

//Lendo arestas a partir de um csv ( csv => String )
val edges_1 = spark.sparkContext.textFile("../../../connections.csv")
//Separando as colunas pelo delimitador ',' ( String => Array[String] )
val edges_2 = edges_1.map(f=>f.split(','))
//Descartando Header ( Array[String] => Array[String] )
val edges_3 = edges_2.mapPartitionsWithIndex{ (idx, itr) => if (idx ==0) itr.drop(1) else itr }
//Representando arestas como Edge() e armazenando em um RDD (Array[String] => RDD[Edge[Long]] )
val edges : RDD[Edge[Long]] = edges_3.map( arr=> Edge(arr(0).toLong, arr(1).toLong, 0L) )

//Mesmo processo para os vertices
//... ( csv => String )
val vertices_1 = spark.sparkContext.textFile("../../../profiles.csv")
//... ( String => Array[String] )
val vertices_2 = vertices_1.map(f=>f.split(','))
//... ( Array[String] => Array[String] )
val vertices_3 = vertices_2.mapPartitionsWithIndex{ (idx, itr) => if (idx ==0) itr.drop(1) else itr }
//... (Array[String] => RDD[(VertexId, String)] )
val vertices: RDD[(VertexId, String)] = vertices_3.map( arr=> (arr(0).toLong, arr(1)) )


//Criando grafo
val graph = Graph(vertices, edges)

//Realizando pageRank
val ranks = graph.pageRank(0.0001).vertices
//Associando Ranks aos nomes de perfil
val ranksByName = vertices.join(ranks).map({ case (id, (username, rank)) => (rank, username) })
//Printando top 10 mais bem rankeados
ranksByName.top(10).foreach(println(_))
