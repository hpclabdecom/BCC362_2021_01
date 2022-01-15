from kafka import KafkaConsumer, TopicPartition
from time import sleep
from BankAccount import BankAccount
import sys


#Consumer
id_consumer = sys.argv[1]
topic = sys.argv[2]
server_IP =  sys.argv[3]
server_Port = sys.argv[4]
servers = [ server_IP+":"+server_Port ]
partition = sys.argv[5]

print("id_consumer:", id_consumer)
print("topic:", topic)
print("server_IP:", server_IP)
print("server_Port:", server_Port)
print("servers:", servers)
print("partition:", partition)


consumer = KafkaConsumer(bootstrap_servers=servers)
consumer.assign([TopicPartition(topic, partition)])

msg = next(consumer)
print(msg)

while True:
    msg = next(consumer)
    print(msg.value.decode())


# # obtain the last offset value
# consumer.assign(tp_content)
# consumer.seek_to_end(tp_content[0])
# lastOffset = consumer.position(tp_content[0])
# consumer.seek_to_beginning(tp_content[0])
# sleep(1)

# for message in consumer:
#     print("___")
#     print("Offset:", message.offset)
#     print("Value:", message.value)
#     if message.offset == lastOffset - 1:
#         break

# # obtain the last offset value
# consumer.seek_to_end(tp_control)
# lastOffset = consumer.position(tp_control[1])
# consumer.seek_to_beginning(tp_control[1])
# requests = []  
# for message in consumer:
#     print("Offset:", message.offset)
#     print("Value:", message.value)
#     requests.append(message.value.decode().split(":"))

#     if message.offset == lastOffset - 1:
#         break


# print(requests)
