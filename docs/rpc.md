#rpc.js
 ```
 rpc.js
 ```
 This holds the network protocol for the Off System and many of the procedures are identical to those found in Kademlia.
 Procedures have three parts. The first is the external class function calls by which a procedure is invoked and forms
 the initial request to the netowrk. The Second is the response handler which forms the response to requests received over the network.
 The third is the request handler this handles responses received from the network and return the final results to the
 invoker through a callback.

 ### handlers
 Handlers are formed and defined in the class constructor of the RPC Object. There is one generic handler for responding
 to network events. This peels back the outer layer of the protbuf message and forwards it on to the correct handler for
 the type of procedure it is. It also maintains the routing table buckets when messages are received.

 ###invocation functions
 These are methods on the RPC Object itself. They create request objects on the initiating node and set up their automatic
 timeout responses when network requests fail. These request objects contain the tracking variables needed to forward the request
 through each stage of the rpc.

 ### message
 ```protobuf
 message RPC {
   required RPCType type =1;
   required Peer from = 2;
   required Direction comType = 3;
   required bytes id = 4;
   optional bytes payload= 5;
   optional Status status = 6;
 }
 ```

 ##Procedures
 There are seven procedures involved in the rpc for the off system.
 ```protobuf
    enum RPCType {
        Ping = 1;
        Find_Node = 2;
        Find_Value= 3;
        Store= 4;
        Random = 5;
        Promotion = 6;
        Ping_Value = 7;
    }
 ```

### ping
Pings are the means by which connection to the network is tested and maintained. This predominately used to maintain the
quality of the routing table buckets.

### find_node
Find nodes is the means by which the routing table bucket is filed. When a node comes online it connects to bootstrap nodes
and gathers the closest nodes to their nodeids until it is filled .

### find_value
Find value is the means by which the network searches for contents. It gathers the nodes that are closest in hamming distance
to a value's key and tries to travel down network topology by ever decreasing distance to find the value with that key.

### store
When new values are created by a node it will attempt to store those values at the node closest in hamming distance to the
key of that value and will attempt to travel down network topology by ever decreasing distance to find a node that will succesfully
accept and store that new value.

### random
This is the first rpc call that diverges from the kademlia style of dht rpc. The random is a call exclusive to off system's functionality
that allows a node automatically and atruistically gather content from other nodes. This helps nodes gather content to optomize usage
of space as a whole on the network and increase the speed of lookups for values on the dht. Furthermore, it means that when a node
is storing content the likelihood of it having enough blocks stored on the node to create a full representation of a file is increased.
A list of held blocks is sent to be excluded is sent with each request to other nodes to avoid redundant responses. Responding nodes
return values that are the most popular they have available

### promotion
This is the second divergent rpc call. Promotion is the means by which blocks determine which values are the most popular on the network
and help reduce the amount of network searches are needed to recover the full representations of a file. The node's block cache has a means of recording
how popular a certain block is at being used on it. When a value reaches a certain threshold of hits it is promoted to a higher rank making it more
likely to be selected for the representation of a newly stored file. When new ranks of popularity are created by the use of a block
they a propagated through out the network. This causes nodes to search for this new popular content and draw it into the storage.
This increases the likelihood of a cache hit when retrieving representation at all nodes.

### ping_value
Ping value is primarily a method to judge the current state of a value's storage on the network. Nodes use this as a method of determining
whether its safe to delete a value from their block cache.

