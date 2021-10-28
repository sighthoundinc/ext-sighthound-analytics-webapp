# Example from: https://www.digitalocean.com/community/tutorials/how-to-use-rabbitmq-and-python-s-puka-to-deliver-messages-to-multiple-consumers
# I modified it somewhat.
# 
# To run: $ python3 serve_amqp.py

import puka
import datetime
import time
import random
import string
import json
import math
import uuid

# Create a 6 letter random license plate string, uppercased. Just for demo purposes.
def randomPlate(length):
    return ''.join(random.choice(string.ascii_uppercase) for i in range(length))

def randomLpID():
    # return 'lp-' + ''.join(random.choice(string.digits) for i in range(4))
    return uuid.uuid4()

def randomCarID():
    # return ''.join(random.choice(string.digits) for i in range(4))
    return uuid.uuid4()

def randomColor():
    return random.choice(["red", "orange", "yellow", "blue", "black", "white", "green", "magenta"])

def randomType():
    return random.choice(["bus", "car", "motorbike", "truck", "bicycle", "vehicle"])

# Declare and connect a producer
producer = puka.Client("amqp://localhost/") # need port :15674
connect_promise = producer.connect()
producer.wait(connect_promise)

# Create a fanout exchange - we need this to be able to broadcast
# to multiple 'clients' at once.
exchange_promise = producer.exchange_declare(exchange='alprdemo_exc', type='fanout', durable=True)
producer.wait(exchange_promise)

count = 0
interMsgTimeout = 0.0

# Send message data in a loop, once every 10 seconds.
while True:
    ts = math.trunc(time.time() * 1000)  # datetime.datetime.now()  #.strftime("%x")
    lpId = str(randomLpID())
    carId = str(randomCarID())
    personId = str(randomCarID())
    color = randomColor()
    vehType = randomType()
    frameId = "7fba8f8a-ea78-4f13-ae8d-f762265da347" if count % 2 else "12345678-94d3-4c21-ac5e-ce5572eb1118"
    count += 1

    message1 = {
        "apiVersion" : {
            "major": 1,
            "minor": 0
        },
        "analyticsTimestamp" : 1628896071683,
        "metaClasses" : {
            "vehicles" : {
                carId : {
                    "detectionScore" : 0.9999,
                    "bestDetectionTimestamp" : ts + 2000,
                    "firstFrameTimestamp" : ts,
                    "box" : {
                        "height" : 1025,
                        "width" : 1410,
                        "x" : 266,
                        "y" : 20
                    },
                    "updated" : True,
                    "attributes" : {
                        "vehicleType" : {
                            "detectionScore" : 0.978,
                            "attributeScore" : 0.978,
                            "updated" : True,
                            "value" : vehType
                        },
                        "color" : {
                            "detectionScore" : 0.9999,
                            "attributeScore" : 0.901,
                            "updated" : True,
                            "value" : color
                        }
                    },
                    "links" : [
                        {
                            "metaClass" : "licensePlates",
                            "id" : lpId
                        }
                    ]      
                }
            }
        },
        "sourceId" : "972d35ef-94d3-4c21-ac5e-ce5572eb1118",
        "frameId" : frameId
    }

    msgJson1 = json.dumps(message1) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson1) # exchange method
    producer.wait(message_promise)

    print ("\nSENT: %s" % msgJson1)
    time.sleep(.2)

    message2 = {
        "apiVersion" : {
            "major": 1,
            "minor": 0
        },
        "analyticsTimestamp" : 1628896071683,
        "metaClasses" : {
            "licensePlates" : {
                lpId : {
                    "detectionScore" : 0.9875,
                    "bestDetectionTimestamp" : ts + 6000,
                    "firstFrameTimestamp" : ts + 4000,
                    "box" : {
                        "height" : 100,
                        "width" : 360,
                        "x" : 790,
                        "y" : 440
                    },
                    "updated" : True,
                    "attributes" : {
                        "lpString" : {
                            "detectionScore" : 0.9875,
                            "attributeScore" : 0.0499,
                            "updated" : False,
                            "value" : randomPlate(6)
                        },
                        "lpRegion" : {
                            "detectionScore" : 0.9975,
                            "attributeScore" : 0.0582,
                            "updated" : False,
                            "value" : "Texas"
                        }
                    },
                    "links" : [
                        {
                            "metaClass" : "vehicles",
                            "id" : carId
                        }
                    ]
                }
            }
        },
        "sourceId" : "972d35ef-94d3-4c21-ac5e-ce5572eb1118",
        "frameId" : frameId
    }

    msgJson2 = json.dumps(message2) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson2) # exchange method
    producer.wait(message_promise)

    print ("\nSENT: %s" % msgJson2)
    time.sleep(.2)
    picId = "BlackAdder" if count % 2 else "george_harrison"

    message3 = {
        "apiVersion" : {
            "major": 1,
            "minor": 0
        },
        "analyticsTimestamp" : 1628896081683,
        "metaClasses" : {
            "people" : {
                personId : {
                    "detectionScore" : 0.9975,
                    "bestDetectionTimestamp" : ts + 6000,
                    "firstFrameTimestamp" : ts + 4000,
                    "box" : {
                        "height" : 360,
                        "width" : 360,
                        "x" : 0,
                        "y" : 0
                    },
                    "updated" : False,
                }
            }
        },
        "sourceId" : "972d35ef-94d3-4c21-ac5e-ce5572eb1118",
        "frameId" : picId
    }

    msgJson3 = json.dumps(message3) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson3) # exchange method
    producer.wait(message_promise)

    print ("\nSENT: %s" % msgJson3)
    time.sleep(interMsgTimeout)

    frameId = "7fba8f8a-ea78-4f13-ae8d-f762265da347"
    message4 = {"apiVersion": {"major": 1, "minor": 0}, 
    "sourceId": "stream2", "frameId": frameId, "analyticsTimestamp": 1634231914700, "metaClasses": 
    {"licensePlates": {"stream2-lp-40937": {"attributes": {"lpString": 
    {"value": "KKU3381", "attributeScore": 1, "detectionScore": 0.48, "updated": True}, "lpRegion": 
    {"value": "NewYork", "attributeScore": 0.72, "detectionScore": 0.48, "updated": True}}, 
    "firstFrameTimestamp": 1634231914700, "bestDetectionTimestamp": 1634231914700, "box": 
    {"height": 35, "width": 67, "x": 208, "y": 393}, "detectionScore": 0.48, "updated": False, 
    "links": [{"metaClass": "vehicles", "id": "stream2-car-186331"}]}}, "vehicles": 
    {"stream2-car-186331": {"attributes": {"vehicleType": {"value": "toyota tundra", "attributeScore": 0.83, 
    "detectionScore": 0.83, "updated": True}, "color": {"value": "green", "attributeScore": 1.0, 
    "detectionScore": 0.83, "updated": True}}, "firstFrameTimestamp": 1634231914700, 
    "bestDetectionTimestamp": 1634231914700, "box": {"height": 360, "width": 532, "x": 37, "y": 181}, 
    "detectionScore": 0.83, "updated": False, "links": [{"metaClass": "licensePlates", "id": "stream2-lp-40937"}]}}}}
    msgJson4 = json.dumps(message4) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson4) # exchange method
    producer.wait(message_promise)
    print ("\nSENT: %s" % msgJson4)
    time.sleep(interMsgTimeout)

    frameId = "12345678-94d3-4c21-ac5e-ce5572eb1118"
    message5 = {"apiVersion": {"major": 1, "minor": 0}, "sourceId": "stream4", "frameId": frameId, "analyticsTimestamp": 1634231915858, "metaClasses": {"licensePlates": {"stream4-lp-40974": {"attributes": {"lpString": {"value": "KKU3361", "attributeScore": 2, "detectionScore": 0.71, "updated": True}, "lpRegion": {"value": "NewYork", "attributeScore": 0.98, "detectionScore": 0.71, "updated": False}}, "firstFrameTimestamp": 1634231912496, "bestDetectionTimestamp": 1634231915857, "box": {"height": 36, "width": 67, "x": 246, "y": 364}, "detectionScore": 0.71, "updated": False, "links": [{"metaClass": "vehicles", "id": "stream4-car-187175"}]}}, "vehicles": {}}}
    msgJson5 = json.dumps(message5) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson5) # exchange method
    producer.wait(message_promise)
    print ("\nSENT: %s" % msgJson5)
    time.sleep(interMsgTimeout)

    frameId = "7fba8f8a-ea78-4f13-ae8d-f762265da347"
    message5 = {"apiVersion": {"major": 1, "minor": 0}, "sourceId": "stream1", "frameId": frameId, "analyticsTimestamp": 1634231916527, "metaClasses": {"licensePlates": {"stream1-lp-40790": {"attributes": {"lpString": {"value": "KKU3381", "attributeScore": 1, "detectionScore": 0.48, "updated": True}, "lpRegion": {"value": "NewYork", "attributeScore": 0.97, "detectionScore": 0.48, "updated": True}}, "firstFrameTimestamp": 1634231916527, "bestDetectionTimestamp": 1634231916527, "box": {"height": 35, "width": 67, "x": 208, "y": 393}, "detectionScore": 0.48, "updated": False, "links": [{"metaClass": "vehicles", "id": "stream1-car-185248"}]}}, "vehicles": {"stream1-car-185248": {"attributes": {"vehicleType": {"value": "toyota tundra", "attributeScore": 0.83, "detectionScore": 0.83, "updated": True}, "color": {"value": "green", "attributeScore": 1.0, "detectionScore": 0.83, "updated": True}}, "firstFrameTimestamp": 1634231916527, "bestDetectionTimestamp": 1634231916527, "box": {"height": 360, "width": 532, "x": 37, "y": 181}, "detectionScore": 0.83, "updated": False, "links": [{"metaClass": "licensePlates", "id": "stream1-lp-40790"}]}}}}
    msgJson5 = json.dumps(message5) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson5) # exchange method
    producer.wait(message_promise)
    print ("\nSENT: %s" % msgJson5)
    time.sleep(interMsgTimeout)

    frameId = "12345678-94d3-4c21-ac5e-ce5572eb1118"
    message5 = {"apiVersion": {"major": 1, "minor": 0}, "sourceId": "stream2", "frameId": frameId, "analyticsTimestamp": 1634231917808, "metaClasses": {"licensePlates": {"stream2-lp-40937": {"attributes": {"lpString": {"value": "KKU3361", "attributeScore": 2, "detectionScore": 0.71, "updated": True}, "lpRegion": {"value": "NewYork", "attributeScore": 0.92, "detectionScore": 0.71, "updated": False}}, "firstFrameTimestamp": 1634231914700, "bestDetectionTimestamp": 1634231917807, "box": {"height": 36, "width": 67, "x": 246, "y": 364}, "detectionScore": 0.71, "updated": False, "links": [{"metaClass": "vehicles", "id": "stream2-car-186331"}]}}, "vehicles": {}}}
    msgJson5 = json.dumps(message5) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson5) # exchange method
    producer.wait(message_promise)
    print ("\nSENT: %s" % msgJson5)
    time.sleep(interMsgTimeout)

    frameId = "7fba8f8a-ea78-4f13-ae8d-f762265da347"
    message5 = {"apiVersion": {"major": 1, "minor": 0}, "sourceId": "stream1", "frameId": frameId, "analyticsTimestamp": 1634231919158, "metaClasses": {"licensePlates": {"stream1-lp-40790": {"attributes": {"lpString": {"value": "KKU3361", "attributeScore": 2, "detectionScore": 0.71, "updated": True}, "lpRegion": {"value": "NewYork", "attributeScore": 0.98, "detectionScore": 0.71, "updated": False}}, "firstFrameTimestamp": 1634231916527, "bestDetectionTimestamp": 1634231919157, "box": {"height": 36, "width": 67, "x": 246, "y": 364}, "detectionScore": 0.71, "updated": False, "links": [{"metaClass": "vehicles", "id": "stream1-car-185248"}]}}, "vehicles": {}}}
    msgJson5 = json.dumps(message5) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson5) # exchange method
    producer.wait(message_promise)
    print ("\nSENT: %s" % msgJson5)
    time.sleep(interMsgTimeout)

    frameId = "12345678-94d3-4c21-ac5e-ce5572eb1118"
    message5 = {"apiVersion": {"major": 1, "minor": 0}, "sourceId": "stream2", "frameId": frameId, "analyticsTimestamp": 1634231919488, "metaClasses": {"licensePlates": {"stream2-lp-40937": {"attributes": {"lpString": {"value": "KKU3381", "attributeScore": 6, "detectionScore": 0.87, "updated": True}, "lpRegion": {"value": "NewYork", "attributeScore": 0.95, "detectionScore": 0.87, "updated": False}}, "firstFrameTimestamp": 1634231914700, "bestDetectionTimestamp": 1634231919488, "box": {"height": 44, "width": 89, "x": 162, "y": 466}, "detectionScore": 0.87, "updated": False, "links": [{"metaClass": "vehicles", "id": "stream2-car-186331"}]}}, "vehicles": {}}}
    msgJson5 = json.dumps(message5) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson5) # exchange method
    producer.wait(message_promise)
    print ("\nSENT: %s" % msgJson5)
    time.sleep(interMsgTimeout)

    frameId = "7fba8f8a-ea78-4f13-ae8d-f762265da347"
    message5 = {"apiVersion": {"major": 1, "minor": 0}, "sourceId": "stream4", "frameId": frameId, "analyticsTimestamp": 1634231919905, "metaClasses": {"licensePlates": {"stream4-lp-40974": {"attributes": {"lpString": {"value": "KKU3381", "attributeScore": 8, "detectionScore": 0.95, "updated": True}, "lpRegion": {"value": "NewYork", "attributeScore": 0.99, "detectionScore": 0.95, "updated": False}}, "firstFrameTimestamp": 1634231912496, "bestDetectionTimestamp": 1634231919904, "box": {"height": 49, "width": 92, "x": 99, "y": 465}, "detectionScore": 0.95, "updated": False, "links": [{"metaClass": "vehicles", "id": "stream4-car-187175"}]}}, "vehicles": {}}}
    msgJson5 = json.dumps(message5) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson5) # exchange method
    producer.wait(message_promise)
    print ("\nSENT: %s" % msgJson5)
    time.sleep(interMsgTimeout)

    frameId = "12345678-94d3-4c21-ac5e-ce5572eb1118"
    message5 = {"apiVersion": {"major": 1, "minor": 0}, "sourceId": "stream0", "frameId": frameId, "analyticsTimestamp": 1634231920229, "metaClasses": {"licensePlates": {"stream0-lp-40554": {"attributes": {"lpString": {"value": "KKU3381", "attributeScore": 1, "detectionScore": 0.49, "updated": True}, "lpRegion": {"value": "NewYork", "attributeScore": 0.21, "detectionScore": 0.49, "updated": True}}, "firstFrameTimestamp": 1634231920229, "bestDetectionTimestamp": 1634231920229, "box": {"height": 35, "width": 67, "x": 208, "y": 393}, "detectionScore": 0.49, "updated": False, "links": [{"metaClass": "vehicles", "id": "stream0-car-184397"}]}}, "vehicles": {"stream0-car-184397": {"attributes": {"vehicleType": {"value": "toyota tundra", "attributeScore": 0.83, "detectionScore": 0.83, "updated": True}, "color": {"value": "green", "attributeScore": 1.0, "detectionScore": 0.83, "updated": True}}, "firstFrameTimestamp": 1634231920229, "bestDetectionTimestamp": 1634231920229, "box": {"height": 360, "width": 532, "x": 37, "y": 181}, "detectionScore": 0.83, "updated": False, "links": [{"metaClass": "licensePlates", "id": "stream0-lp-40554"}]}}}}
    msgJson5 = json.dumps(message5) # convert to json
    message_promise = producer.basic_publish(exchange='alprdemo_exc', routing_key='', body=msgJson5) # exchange method
    producer.wait(message_promise)
    print ("\nSENT: %s" % msgJson5)
    time.sleep(interMsgTimeout)

    time.sleep(5)

producer.close()
