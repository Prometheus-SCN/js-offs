
<div style="text-align:center; margin: 50%, 50%"><img src="/src/static/images/off-logo-lettered.svg" width="250" height="250"></div>
<hr>

# Owner Free File System in Javascript
## Status: Rebooting
is a peer-to-peer distributed file system in which all shared files are represented by randomized multi-used data blocks. Instead of anonymizing the network, the data blocks are anonymized and therefore, only data garbage is ever exchanged and stored.
## Purpose
The OFF System is the first P2P system designed to halt copyright infringement by facilitating legal activity. It protects each peers by removing the user's capability of breaking the law.  The unique feature of this system is, that it stores all of its internal data in a multi-use randomized block format. In other words: there is not a one to one mapping between a stored block and its use in a retrieved file. Each stored block is simultaneously used as a part of many different files. Individually, however, each block is nothing but arbitrary digital white noise data. This gives files stored redundancy, permanence, privacy, and freedom from censorship through a single simple mathematical means. This creates a universal public storage cloud with the same properties as national public radio or public broadcasting.
## Accessor's Rights First
Very much like a physical key, an off-system URL grants acccess to content to anyone with the URL. Privacy preservation is determined by one's ability to keep one's links private as access is irrevocable. There are many effective solutions for keeping short strings of text private and the off system reduces the total domain of data security down to managing control over short strings of text rather than large encrypted files. Therefore, abstractions can be written to interface with the off-system to receive, encrypt, and redistribute urls.
## v3
This can be considered a completely redeveloped version of the off-system and is not compatible with older versions. This version features the following:
* New URL format
* New REST API's for storing and accessing content
* Static Website Hosting
* New Altruistic network algorithm for optimizing block cache hits
* Content Representation Recycling

## Efficiency
Because OFF anonymizes the data blocks being exchanged instead of the network, no forwarding via intermediate nodes is required. Therefore, this method has a higher degree of efficiency than traditional, forwarding-based anonymous P2P systems. Furthermore, There have been many improvements in version 3 to optimize the way in which storage is used. Data is now split into three block size categories based on the size of the initial file. This allow for smaller data to not waste larger amounts of space than are needed and making the system more suitable for database storage as well as file storage. Additionally, the system trys to use the most popular blocks on the network first in the representation of new content. This creates an increased likelihood of a cache hit when downloading new files and lowering overall storage burden. This idea has been also extended to the new recycling feature that will attempt to use the blocks of a known representation in the representation of new content. This provides the ability to users to tie there related content together and in the case of serial files, potentially append existing representations.

## Network Diagram
<div style="text-align:center"><img src="http://offsystem.sourceforge.net/wp-content/support/OFF%20Nodes%20small.png"></div>

## Note:
 Block Cache's are not free space and the network will try to fill or empty themselves based upon network usage and the size limitations created by their installers.
## Predecessors
<a href="http://offsystem.sourceforge.net/">http://offsystem.sourceforge.net/</a>

<a href="https://en.wikipedia.org/wiki/OFFSystem">https://en.wikipedia.org/wiki/OFFSystem</a>

## License
<a href="http://www.gnu.org/licenses/gpl-3.0.txt">GPL V3</a>