#!/bin/bash

sudo apt-get -y install default-jdk git wget python3-pip
sudo pip3 install kafka-python python-dateutil
sudo wget https://dlcdn.apache.org/kafka/3.0.0/kafka_2.13-3.0.0.tgz
#sudo git clone https://github.com/ViniciusSamy/SD
sudo tar -zxvf kafka_2.13-3.0.0.tgz
sudo rm kafka_2.13-3.0.0.tgz

