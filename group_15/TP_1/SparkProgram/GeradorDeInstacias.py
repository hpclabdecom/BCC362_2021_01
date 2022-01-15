import sys
import networkx as nx
import matplotlib.pyplot as plt
import names
import csv 


n = 7000
p = 0.80
m = int( (n*n - n)/2 * p )
print(n)
print(m)
G = nx.gnm_random_graph(n, m)


print(G.nodes)
print(len(G.edges))
print(G.edges)


#Writing nodes
header = ["id", "name"]
with open('../../../home/vinicius/Teste/profiles.csv', 'w') as nodesF:
    writer = csv.writer(nodesF)

    writer.writerow(header)
    for node in G.node:
        row = [ node, names.get_first_name() ]
        writer.writerow(row)
        #print(f"{node}({names.get_first_name()})")

#Writing nodes
header = ["profile1", "profile2"]
with open('../../../home/vinicius/Teste/connections.csv', 'w') as connectionsF:
    writer = csv.writer(connectionsF)

    writer.writerow(header)
    for edge in G.edges:
        row = [ edge[0], edge[1] ]
        writer.writerow(row)
        #print(f"{edge[0]} -> {edge[1]}")

print(f"|nodes| = {len(G.nodes)}")
print(f"|edges| = {len(G.edges)}")