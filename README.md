# telnet-engine

This module provides a simple telnet-engine object to establish and manage an IP connection with a Telnet server.  It is meant to be used to established a back and forth command-response dialog with the server. The engine establishes one socket channel with the server, which can used asynchronously from different parts of the code. The engine ensures that the link is up, queues and if necessary spaces the requests and ensures that the correct response is match with the correspondind query. 

# Basic utilization
The basic use of the package described here is mostly for tutorial purpose as it doesn't present much advantage over a simple websocket utility such as **net** on which in this packaged is built. 

## Opening the connection

The communication is established by the telnet-engine constructor which takes two arguments the host address and the communication port:

  ```new Engine(host,port)```

**host** can be a URL or an IP address
**port** should be a positive integer and will default ot 23 if omitted 

Every time the engine uses the connection, it first verifies it is still up and if necessart it attempst to reopen it. 

## Listening to a server

The method ```listenString(f) ``` listens to all messages from the server and applies the function **f** to every received string.  The function **f** shoud be in the form   ```(s)=>{...} ``` where s is a string received from the server.

### Example 1
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  //establishes the communication
en.listenString((s)=>{console.debug("->",s)})     // every message from the server will be printed on debug
```
## Sending a command  to a server

The method  ```sendString(s) ```applied to an engine sends a text string asynchronously to the server.
```sendString(s) ```sends the string **s** only while ```listenString(f) ```is activated every time a response is received. 

### Example 2
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  //establishes the communication
en.listenString((s)=>{console.debug("->",s)})     //the function will applied to every string received
en.sendString("aCommand")			// send a commnand once
en.sendString("anotherCommand")			// send a commnand again
```
## Sending a command and processing a response

The method  ```request(s,f) ``` sends a command **s** and processes the response with the function **f**
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  //establishes the communication
en.request("aCommand", (s)=>{console.debug("->",s)})     
```
The engine ensures that commands sent asynchronously are queued and that the response is matched with the corresponding commans. 

# Advanced utilization

## Opening the connection

The communication is established by the telnet-engine constructor which takes two arguments the host address and the communication port:

  ```new Engine(host,port)```

**host** can be a URL or an IP address
**port** should be a positive integer and will default ot 23 if omitted 

A number of properties of the **Engine** can adjusted after it is created.

### inDelimiter (RegEx)

This property defines the end-of-line marker for messages received by from the server. It takes a RegEx or a String that can be converted into a RegEx . By default it is set to the value **/\r\n|\r|\n/** defining the end of line as **carriage return + new line** or **carriage return** or **newline** alone. 

### outDelimiter (String)

This property defines an end-of-line marker that the engine should add to every line command it sends. This property should be a String. By default it is set to the value **'\n'** representing the **newline** character.  

### timeOut (integer)
This is the time in milliseconds that the Engine will wait before raising a time out error when opening the connection or waiting for a response to a request. By default it is set to **1500 ms**. 


### clearOut (integer)
This is the time in milliseconds the Engine will before sending a command after the last message from the server or the last timeout waiting for a response. By default it is set to **0 ms** and should rarely be changed.

### Example 3
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  //establishes the communication
en.inDelimiter = /\r\n>|\r>|\n>/      		   //include a leading  '<' as part of the end of line marker for incoming message
en.outDelimiter = '\t'				  // set the engine for adding a tab ('\t') at the end of en.timeOut = 3000 				  //set time out to 3 seconds
en.timeOut = 100 /				 // space outgoing messages by o.1 second
```

## Closing the connection

The method  ```en.terminate() ```  close the communication and terminates all listening activities.

## Sending a command  to the server

The method  ```en.sendString(s,UID,test) ```applied to an engine sends a text string asynchronously to the server.

**s** is string representing the message to be sent.

**UID** is an object, a string or a number that can be used to match an incoming response to an out going request. By default it is undefined.  The matching is done with the operator **==** so if objects are used their will be match only is their are same instance, string and numbers will be match is they have the same value. 

**test** is a function to used by the engine determine when the end of multiline response is reached.  If omitted, the test assume a response is constituted of one single line.

In almost all cases the test function should be generated using the helper functions provided in the module.

### Example 3
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
en.sendString("LIST", "req203", te.untilNumLines(10))
```
in this example the test  "LIST" is sent and marked with string "req203" for later matching of the response. The response is expected to contain 10 lines of text. 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023) 
UID = {} 
en.sendString("LIST", UID, te.untilNumLines(10))
```
In this case an object is used as UID. 

### Test functions

Several test functions generator are included in the package. 

```te.untilString(s)```			The last line of the response contains the string s
```te.untilRexEx(r)```			The last line of the response contais the regular expression r
```te.untilNumLines(n)```		The response contains n lines
```te.untilMilli(t)```			The reponse if complete if no message has been received inthe last t milliseconds. 
```te.oneLine()```				The response contains one line (default)

It is important to note that these generators are not the test function themselves but they return a function object that is the test function, and that a new test function object needs to be generated with every call to ```sendString()```. The reason for this complexity is that the test functions have a memory that is used to count lines or time so they can only be used once (in truth this doesn;t mattefor ```te.untilString(s)``` and ```te.untilRexEx(r)`` , which generate memory-less functions that can thus be reused)

The folllowing example is incorrect because the **t** function object  will mix up the messages received from the two **sendString** calls and won`t be reset to zero after the first one. The same problem would occur if a call to **sendString**  was in a loop.
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023) 
t = te.untilMilli(100)
en.sendString("LIST", "reqA", t)
en.sendString("LIST", "reqB", t)
```

The correct approach is the following:
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023) 
en.sendString("LIST", "reqA", te.untilMilli(100))
en.sendString("LIST", "reqB", te.untilMilli(100))
```
The following illustrates the use of all the test generators. 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023) 
en.sendString("LIST", "reqA", te.untilString("done"))   //last line contains the string "done"
en.sendString("LIST", "reqB", te.untilRexEx(/^OK/)      //last line starts wiht "OK"
en.sendString("LIST", "reqC", te.untilNumLines(3))      //response contains 3 lines
en.sendString("LIST", "reqD", te.untilMilli(100))     	//response is complete is terminal silent for 100 ms
en.sendString("LIST", "reqE", te.oneLine())		//response contains 3 lines
```
In rare cases a vustom test functions or test function generators might be needed. A valid test functions takes two argument, a string and a function. The Engine calls the test function one time with each string it receives and passes a function. When it detects the end of the message has been reached the test function should call the function it received as an argument. 

As an illustration here is the code of the line counter test function generator:

```
function untilNumLines(endingN) {
    var obj = {}						// this is the memory object than needs to be regenerated for each new message sent
    return (s, f) => {						// the generator return the test function
        if (typeof obj.counter == 'undefined') {		
            obj.counter = endingN;
        }
        else {
            obj.counter -= 1;
        }
        if (obj.counter <= 0) { f() }				// the last line is reached, the function f is called
    }
}
```