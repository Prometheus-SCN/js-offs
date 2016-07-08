#Owner Free File System in Javascript
##Status: Rebooting
is a peer-to-peer distributed file system in which all shared files are represented by randomized multi-used data blocks. Instead of anonymizing the network, the data blocks are anonymized and therefore, only data garbage is ever exchanged and stored and no forwarding via intermediate nodes is required.

* every block in a tuple is replicated
* random block in tuples should come from the furthes reaches of the network
* random blocks should be weighted to decriptor blocks
* altruistically acquired blocks should be weighted in random choice
* descriptor block are the only blocks that identify unique files
* descriptor block are the only blocks that need to be secured
* 32 bit hash more efficient