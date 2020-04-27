
# telnet-engine

THIS MODULE IS IN DEVELOPMENT AND NOT STABLE
COMPLETELY NEW VERSION UNDER TEST - DONT USE YET

This module provides a simple object to manage dialog with a telnet server over IP.  It is designed to send line commands or queries asynchronously to a server and treat the response asynchronously. The Engine establishes one socket channel with the server, which can be used asynchronously from different parts of the code. The Engine ensures that the link is up, queues and, if necessary, spaces the requests to ensure that the correct response is matched to the corresponding query. 

This guide is organized in three sections:

* **Basic utilization:**   Is a quick run meant to expose to the basics of the module
* **Advanced utilization:**   Covers the key concept 
* **Reference:**  Provides the details of each object and method.

# Basic utilization
The basic utilization of the package described here first is mostly for illustration purpose as it doesn't present much advantage over a simple websocket utility such as **net** on which in this packaged is built. 

## Opening the connection

The communication is established by the telnet-engine constructor, which takes two arguments the host address and the communication port:

  ```new Engine(host,port)```

| Parameters| Default|  |
| ------------- |----|----|----
|**host**| |A string reprenseting an URL or an IP address 
|**port** |23|An integer
| ***return value***| |a telnet-engine object

Every time the Engine uses the connection, it first checks it is still up, and if necessary, it attempts to reopen it. 

## Listening to a server

The method ```listenString(f) ``` indicates that every line reserved from the server should be treated by the callback function **f** .  The function **f** should be in the form   ```(s)=>{...} ``` where s is a string representing the line received from the server. The call to **f**  will be repeated asynchronously for every line of text received.

### Example 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  //establishes the communication
en.listenString((s)=>{console.debug("->",s)})     // every message from the server will be printed on debug
```
## Sending a command  to a server

The method  ```sendString(s) ```  sends a text string asynchronously once to the server.

### Example 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  //establishes the communication
en.listenString((s)=>{console.debug("->",s)})     //the function will applied to every string received
en.sendString("aCommand")            // send a commnand once
en.sendString("anotherCommand")            // send a commnand again
```
## Sending a command and processing a response

The method  ```request(s,f) ``` sends a command **s** and processes the response with the function **f** once time.
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  //establishes the communication
en.request("aCommand", (s)=>{console.debug("->",s)})     
```
The engine ensures that commands sent asynchronously are queued and that the response is matched with the corresponding commands. 

# Advanced utilization

The advanced features allow more control of the dialog with the telnet server:
- The use of an **UID** parameter when sending and receiving messages allows matching a response with its corresponding request.
- A **test** parameter can be used in a **send** or **request** call to detect the end of a multi-line responses.
- Several methods return Promise-like objects that can be used to manage errors and other events.
- Modifiable properties of the engine object can be set to fine-tune its behavior. 

## Matching a response with its corresponding request: 

Several approaches are available to ensure that incoming lines of text are matched with the correct outgoing request.

### Use of the request method

This is the most straightforward approach. As illustrated above, the request method sends a message to the server and then processes the response. This happens asynchronously, and a call to ```request()``` is thus not blocking. However, the limitation of this approach is that the sending and listening codes are in the same block.

### Use of an UID parameter

An **UID**  is an object, string, or number that tags an outgoing line of text so that the incoming response can be matched to it. This parameter is optional, and by default, it is undefined. When used, the matching is done with the operator **==** so if the **UID** is an object, the matching only occurs with a response that is tagged with the same instance; if the **UID** is a string or a number the match occurs if the values are equal. 

### Syntax

Note that some methods have a string form and an object form. In the object form,  messages are sent and received from the Engine as objects with attached properties. These forms are described in detail in a later section. 

Sending
```en.sendString(s, UID)``` or  ```en.send({text: s, UID: obj} )```
 
 Receiving 
   ```en.listenString(fs, UID)  ``` or ```en.listen(f, UID)  ``` 
 
| Properties| Default|  |
| ------------- |----|----|----
| **s**||String representing the message to be sent to the server
| **UID** |```undefined```|Object, string or number identifying the request to the server
| **f** |    |Function to be applied to the response object frm (see later)
| **fs**|    |Function to be applied to the response string 

Note that **sendString**  and **send** send a string to the server one time while **listenString**  and **listen** continue to listen to every line sent by the server and pass them to the callback function  **fs** or **f**. 

If **UID**   is ommitted in a call to **listenString** or **listen**, the function **f** or **fs** will be activated for every message received from the server, if it is omitted from  a **sendString** or **send**, the call will only be matched with **listenString** or **listen** with no  **UID**   parameter.


### Example 
 ```
 te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
en.listenString((s)=>{console.debug("A->",s)})
en.listenString((s)=>{console.debug("X->",s)}, "reqA")        
en.sendString("pool","reqA")            
en.sendString("pool","reqb")    
 ```
 
### Output
Assuming the server responds with an incrementing counter every time it receives the command **"pool"** the output will look like this:
 ```
 A-> 1
 X-> 1
 A-> 2
 ```
the   ```X-> 1``` response corresponds the send tagged with UID "reqA".
the   ```A-> 1```  and  ```A-> 2```   responses correspond both sending .

### Details

The **UID**  can be of any type, and the following constructs are all valid.

 ```
en.sendString("pool","reqA")            
en.sendString("pool",234)    
obj = {}
en.sendString("pool",obj)
 ```


## Accepting multi-line responses

 **listenString**, **listen**, and **request** can be set to expect and process a multi-line response from the server. In such a case, an additional **test** parameter is necessary to indicate how to detect the end of the response.  

### Syntax

**send** also has a string form and an object form. In the object form, messages are passed as objects with attached properties instead of as a text string. These forms are ll be described in detail in a later section. 

Sending
```en.sendString(s, obj, t)``` or  ```en.send({text: s, UID: obj, test: t} )```

```request(s,fs, t)` ``` 
 | Properties| Default|  |
| ------------- |----|----|----
| **s**||String representing the message to be sent to ther server
| **obj** |```undefined```|Object, string or number identifying the request to the server
| **t** | ```(s,f)=>{f()}```    |Test function in the form  ```(s,f)=>{...}``` 
| **fs**|    |Call back function in the form ```(s)=>{...}``` 
 

In almost all cases, the test function should be generated using one of the test function generators provided in the module.  The generators are functions returning functions, and they cover most of the normal use cases. Also, in general, a fresh instance of the test function should be a generator for each new call to **send**. The reason for this is that the test functions have a memory that is used to count lines or time, so a newly initialized instance should be generated with every not request.

If omitted, the default test function expects a single line response from the server.


### Example 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
en.listString("req203", (s)=>{console.debug(s)})
en.sendString("LIST", "req203", te.untilNumLines(10))
```
In this example the text line "LIST" is sent and tagged with the string "req203" for later matching of the response. The response is expected to contain 10 lines of text.  Each line is processed separately (in this case printed) by the call back function passed to  **listenString**. 


### Test functions generators

Test functions should be in the form```(s,f)=>{...}``` . They receive each line sent by the server in the parameter **s** and should call the function **f** if they detect the end of a multi-line response.  In practice, it is unlikely that such a function would be programmed manually; it should rather be generated automatically with a  test function generator.

Several test function generators are included in the package. 

 | Generator| Use 
| ------------- |----
|```te.untilString(s)```    |        The last line of the response contains the string s
|```te.untilRexEx(r)```    |        The last line of the response contains the regular expression r
|```te.untilNumLines(n)```|        The response contains n lines
|```te.untilMilli(t)```    |        The reponse is complete if no message has been received in the last t milliseconds. 
|```te.oneLine()```    |            The response contains one line (default)

The test function generators return the test function proper and should be called with every new call to ```sendString()``` or to```request()``` so as to generate an initialized test function. 

The folllowing example  shows what happend when the an instance of a test function is improperly re-used.   The function  **t**   will with reach the count of 3 the first time and won`t be reset to zero. The same problem would occur if a call to **sendString**  was in a loop.
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023) 
t = untilNumLines(3)
en.sendString("LIST", "reqA", t)
en.sendString("LIST", "reqB", t)
```

The correct approach is the following:
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023) 
en.sendString("LIST", "reqA", untilNumLines(3))
en.sendString("LIST", "reqB", untilNumLines(3))
```
The following illustrates the use of all the test generators. 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023) 
en.sendString("LIST", "reqA", te.untilString("done"))   //last line contains the string "done"
en.sendString("LIST", "reqB", te.untilRexEx(/^OK/)      //last line starts wiht "OK"
en.sendString("LIST", "reqC", te.untilNumLines(3))      //response contains 3 lines
en.sendString("LIST", "reqD", te.untilMilli(100))         //response is complete is terminal silent for 100 ms
en.sendString("LIST", "reqE", te.oneLine())        //response contains 3 lines
```
In rare cases a custom test functions or test function generators might be needed. A valid test functions takes two argument, a string and a function. The Engine calls the test function one time with each line received from the server and passes a call-back function. When the end of the message is detected the test function should call the call-back function. 

As an illustration here is the code of the line counter test function generator:

```
function untilNumLines(endingN) {
    var obj = {}                        // this is the memory object than needs to be regenerated for each new message sent
    return (s, f) => {                        // the generator return the test function
        if (typeof obj.counter == 'undefined') {        
            obj.counter = endingN;
        }
        else {
            obj.counter -= 1;
        }
        if (obj.counter <= 0) { f() }                // the last line is reached, the function f is called
    }
}
```
## Object form of ```send``` and ```listen```

The **send** and **listen** methods accept and receive text lines in the form of objects.  These methods allow a fine grain processing of the dialog with the server. Actually,  in the implementation, these are the base methods of the module and  **sendString**, **listenString**, and **request** are derived from them. 

### ```en.send(msg) ```

Message is an object in the form  ```{text: txt, UID: obj, test: t} ``` with:

 | Properties| Default|  |
| ------------- |----|----|----
| **text** ||String representing a line of text to be sent to ther server
| **UID** |```undefined```|Object, string or number identifying the request to the server
| **test** | ```(s,f)=>{f()}```    |Test function in the form  ```(s,f)=>{...}``` 

### ```en.listen(f) ```

Listen receives every line sent by the server as an object and passes it to the **f** callback function for processing.

The received object might have the following properties:

 | Properties|   |
| -----------------|----|
|  **text**  |String representing a line sent by the server.
| **UID**  |Object, string or number identifying the request to the server
|  **end** |**true** if the line of text in the last line of the response otherwise **undefined**
| **fail** | **true** if a time out occurred during the processing of a request otherwise **undefined**

If request times out, the Engine emits a response object with  **fail** set to **true** and the  **text** set to **undefined**.

### Example 

In this example every line sent by the server is printed if it is not empty,  the UID will also be printed is available as well as a text indicating when the line is the end of a response or a failure.
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
en.listen((obj)=>{
    if(obj.text) {console.debug("text:", obj.text)}
    if(obj.UID) {console.debug("UID:", obj.UID)}
    if(obj.end) {console.debug("ended")}
    if(obj.fail ) {console.debug("failed")}
})

en.send({text: "something"})   

```

## Postprocessing of response and error handling

The module includes several mechanisms to enable post-processing after reception of a multi-line response as well as handling of error when a request to the server times out.
### Using the object form  ```en.listen(f) ```
**End of response:** When a line is the only one or the last one of a response, the property  **end** of the object passed to the function **f** si set to **true** .

**Error:**   When a request to the server times out, an object with no  **text** property and a property  **fail** set to **true**  is passed to the function **f**.

#### Example 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  

prom = en.listen((obj)=>{
    if(obj.text) {console.debug("Line",obj.text)}        //print each line received
    if(obj.end)  {console.debug("response complete")}  //print this after the full response is received    
    if(obj.fail) {console.debug("failure!")}           //print this if an error occurs.
    })
    
//send the text "something" and expect response ending with a line starting with "OK"
msg = {text: "something", test:te.untilRexEx(/^OK/)}  
en.listen(msg)
```

### Using ```en.request(s,fs, test)```

The **request** method returns a Promise that resolves when the response is complete or is rejected in case of failure. The then and catch constructs can be used to handle these situations.

#### Example 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
prom = en.request("something",                       //send text "something"
    (s)=>{console.debug("Line",s)},                //print each line received
    te.untilRexEx(/^OK/)                //response ends with line stating with "OK"    
    )
    
prom.then(()=>{console.debug("response complete")}) //print this after the full response is received    
    .catch(()=>{console.debug("failure!")})          //print this if an error occurs. 
```


### Using ```en.fail(f,UID)```

The fail method of an engine object executes the **f** method every time a request to a server times out. If the optional **UID**  parameter is used, only failure requests tagged with the UID are be passed to **f** .

#### Example 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
UID = "abcdef"
en.listendString((s)=>{console.debug("Line",s)},UID)  //print every line with the UID  "abcdef" 
en.fail(()=>{console.debug("failure!")},UID)         //print if UID "abcdef" command times out
en.sendString("something",UID)                 //send text "something" with the UID  "abcdef"
```
## Stopping the treatement of incoming lines from the server

Once the methods  **listenString**, **listen**, and **fail** are executed, every line received from the server is passed to their callback function (at least those that carrying the correct UID).  This behavior can be canceled if needed. 

These functions return a Defer object, which is a Promise-like object defined in the npm module repeatable-promise.  This object can be disabled with the method **terminate**.

#### Example 

In this modified version of the preceeding example, the treatment of incoming lines and errors is disabled when the text "end" is received from the server.
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
UID = "abcdef"
df1 = en.fail(()=>{console.debug("failure!")},UID) 
df2 = en.listendString((s)=>{
    console.debug("Line",s)
    if(s == "end"){
        df1.terminate()
        df2.terminate()
        }
    }
    ,UID)  

 
en.sendString("something",UID)                 
```
## Closing the connection

The method  ```en.terminate() ```  close the communication, disables the engine objects, and terminates all listening activities.


## Advanced connection parameters.

Engine objects expose several modifiable properties.

### inDelimiter (RegEx)

This property defines the lien terminator for incoming messages from the server. It takes a RegEx or a String that can be converted into a RegEx. By default it is set to the value **/\r\n|\r|\n/** defining the end of line as **carriage return + newline** or **carriage return** or **newline** alone.  Please note that the delimiter is removed after being detected and not passed to the listeners as part of the line of text. 

### outDelimiter (String)

This property defines a line terminator that the Engine adds to every line of text sent to the server. This property should be a String. By default it is set to the value **'\n'** representing the **newline** character.  

### timeOut (integer)
This is the time in milliseconds that the Engine waits before raising a time out error when opening the connection or waiting for a response to a request. By default, it is set to **1500 ms**. 

### clearOut (integer)
This is the time in milliseconds the Engine waits after the last message received from the server before sending a line of text to the server. By default, it is set to **0 ms** and should rarely be changed. It may be used is specific circumstances to space requests and avoid that a trailing response from the server be interpreted as the response for a newer request. 

### Example 
```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
en.inDelimiter = /\r\n>|\r>|\n>/                 //include a leading '<' as part of the end of line marker for incoming message
en.outDelimiter = '\t'                  // set the engine for adding a tab ('\t') at the end of en.timeOut = 3000                   //set time out to 3 seconds
en.timeOut = 100 /                      // space outgoing messages by o.1 second
```

## Closing the connection

The method  ```en.terminate() ```  close the communication and terminates all listening activities and callbacks.

## Connection events

The telnet engine exposes several events thru methods that accept callback functions.

### ```en.onOpenConnectionConnecting(f)```
f is executed every time the engine attempts to open the connection
### ```en.onOpenConnectionSuccess(f)```        
f is executed every time the connection is successfully opened
### ```en.onOpenConnectionTimeOut(f)```        
f is executed if the connection is not established before time out. 
### ```en.onConnectionError(f)```            
f is executed if an some error occurs
### ```en.onConnectionEnd(f)```                
f is executed when the engine closes the connection
### ```en.onResponseTimeOut (f)```            
f is executed if a request to the server times out (same similat to ```fail(f)```)
### ```en.onReceive(f) ```
f is executed if when a line is received 

All of these methods return a Defer object, which is a Promise-like object defined in the npm module repeatable-promise.  These objects can be disabled with the method ```terminate()```.

```
te = require('telnet-engine')
en = new te.Engine("myserver.mydomain.com",20023)  
df = en.onOpenConnectionSuccess(()=>{console.debug("connection established")}) 
df.terminate()     //disables the call back established by the previous line.    
```


# Reference

## ```Engine(host,port)```
Engine constructor. 


| Parameters| Default|  |
| ------------- |-----|----|----
|**host**| |A string reprenseting an URL or an IP address 
|**port** |23|An integer
| ***return value***| |a telnet-engine object

Every time the Engine uses the connection, it first checks it is still up and, if necessary, attempts to reopen it. 

## ```Engine object properties```

| Property|Type|<span>&nbsp;&nbsp;&nbsp;Default&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>| Role |
| ------------- |--------------|----|----
|```en.inDelimiter ```|RegEx|  **/\r\n\|\r\|\n/**| Terminator for incoming text
|```en.outDelimiter```|String|  **'\n'** | Terminator for outgoing text
|```en.timeOut ```|Integer|  1500| Time in milliseconds that the Engine will wait before raising a time out error
|```en.clearOut ```|Integer|  0| Time in milliseconds the Engine will before sending a message after the last line of text received.  



## ```Engine events ```

The following methods establish a call back to function f every time the event occurs.

| Event|Type|
| ------------- |--------------|
|```en.onOpenConnectionConnecting(f)```|f is executed every time the engine attempts to open the connection|  
|```en.onOpenConnectionSuccess(f)```    |f is executed every time the connection is successfully opened| 
|```en.onOpenConnectionTimeOut(f)```    |f is executed if the connection is not established before time out. | 
| ```en.onConnectionError(f)```    |f is executed if some error occurs| 
|  ```en.onConnectionEnd(f)```        |f is executed when the engine closes the connection| 
|  ```en.onResponseTimeOut (f)```    |f is executed if a request to the server times out (same similar to ```fail(f)```)| 
| ```en.onReceive(f) ```    |f is executed when a line is received| 

with:
| Parameters|  |
| ------------- |-----|----|----
|**en**| Engine object 
|**f**| Function of the form: ```()=>{...}```
| ***return value***| Defer object from the npm module repeat-promise.

The call back can be disabled with the method ```df.terminate()``` of the returned Defer object.

## ```en.terminate()```

Closes the communication to the telnet server and disables all callbacks.


## ```en.fail(f,UID)```

Calls a callback function every time the wait for a response from the server times out.

| Parameters| Default| |
| ------------- |-----|----|----
|**en**| |Engine object 
|**f**| |Function of the form: ```()=>{...}```
|**UID**|**undefined** |Object, string or number identifying the request to the server (optional)
| ***return value***| |Defer object from the npm module repeat-promise.

If the **UID** parameter is used, only failures tagged with that specific **UID** trigger the callback.

The call back can be disabled with the method ```df.terminate()``` of the returned Defer object

## ```en.listen(f)```

Establishes a call back to **f** every time a line of text is received from the server.

| Parameters|  |
| ------------- |---- 
|**en**| Engine object 
| **f** |Function in the form```(obj)=>{...}```
| ***return value***| Defer object from the npm module repeat-promise


The object **obj** passed to the callback function **f** has some of following properties.


| Properties|    |
| ------------- |----
| **text**|String representing a response line from the server
| **UID**| Object, string or number identifying the request to the server
| **end**| **true** if the line is the last line of a response otherwise **undefined**
| **fail**|**true** a request timed out  otherwise **undefined**

The callback can be disabled with by calling the **df.terminate()** method of the Defer object return by **listen(f)**

The returned Defer  object is a Promise-like object that implements the **df.then(f)** method. **f** is called when the **df** object is terminated, which occurs if **df.terminate()** or if the Engine is terminated. 



## ```en.send(obj)```

Sends one line of text to the telnet server.

**obj** is expected to have the following properties:

| Properties | Default|  |
| ------------- |----|----|----
| **text**||String representing the line of text to be sent to the server
| **UID** |```undefined```|Object, string or number identifying the request to the server (optional)
| **test** |```te.oneLine()```    |Test function detecting the end of the response (usually created by a test function generator) 
| ***return value***| |```undefined```


## ```en.listenString(f, UID)  ``` 

Establishes a call back to **f** every time a line of text is received from the server.

| Parameters| Default|  |
| ------------- |----|----|----
|**en**| |Engine object 
| **f** ||Function in the form```(s)=>{...}```
| **UID** |```undefined```|Object, string or number identifying the request to the server (optional)
| ***return value***| |Defer object from the npm module repeat-promise


The received line of text is passed the callback function **f** as the string **s** 

The callback can be disabled with by calling the **terminate()** method of the Defer object return by **listenString(f)**

The returned Defer  object is a Promise-like object that implements the **df.then(f)** method. **f** is called when the **df** object is terminated, which occurs if **df.terminate()** or if the Engine is terminated. 

## ```en.sendString(s, UID, t)```

Sends one line of text to the telnet server.

| Parameters| Default|  |
| ------------- |----|----|----
| **s**||String representing the line of text to be sent to the server
| **UID** |```undefined```|Object, string or number identifying the request to the server (optional)
| **t** |```te.oneLine()```    |Test function detecting the end of the response (usually created by a test function generator) 
| ***return value***| |```undefined```


## ```en.request(s, f,t)```

The method  ```request(s,f) ``` sends a command **s** and processes the response with the function **f** one time.

| Parameters| Default|  |
| ------------- |----|----|----
|**en**| |Engine object 
| **f** ||Function in the form```(s)=>{...}```
| **t** |```te.oneLine()```    |Test function detecting the end of the response (usually created by a test function generator) 
| ***return value***| |A Promise object

The Engine ensures that commands sent asynchronously are queued and that the response is matched with the corresponding commands. 

The **request** method returns a Promise that resolves when the response is complete or is rejected in case of failure. The then and catch constructs can be used to handle these situations.


