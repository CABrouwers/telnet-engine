

# telnet-engine

THIS MODULE IS STILL BEING TESTED.
THE REFERENCE SECTION OF THE DOCUMENTATION IS OBSOLETE

The goal of this module is to  provide a simple way to manage a dialog with a telnet server over IP.  It is meant to simplify sending command lines or queries to a server and treat the responses asynchronously. The Engine establishes one socket to the server, which can be used asynchronously from different parts of the code. The Engine ensures that the link is up, queues and, if necessary, spaces the requests and ensures that the correct response is matched to the corresponding query. 

This guide is organized in two sections:

* **Overview:**   Is a quick run through meant to expose to the operation of the module.
* **Reference:**  Provides a syntax and usage reference of each object and method.

# Basic utilization

## Opening the connection: the Engine object

The communication is established by the telnet-engine constructor, which takes two arguments the host address and the communication port:

  ```new Engine(host,port)```

| Parameters| Default|  |
| ------------- |----|----|----
|**host**| |A string representing an URL or an IP address 
|**port** |23|An integer
| ***return value***| |a telnet-engine object

Every time the **Engine** uses the connection, it checks first that it is up, and if necessary, attempts to reopen the socket. 

Several properties of the **Engine** are can be modilfied to custimze its behaviour, see the Reference section for details. 

## Sending a request and processing a response. 

The method ```requestString(...) ``` provides a way to send a one line of text to the server and process it response.
In its simplest form, it takes two arguments: a **string** and a call-back **function** that will be applied to every lined returned by the server in response to the request. 

### Example 
```
te = require(telnet-engine)
en = new te.Engine("rainmaker.wunderground.com",23) // create the engine
en.requestString("",(s)=>{console.debug(s)}) 	    // send "" and print returning line
en.requestString("",(s)=>{console.debug(s)})
en.requestString("",(s)=>{console.debug(s)})
en.terminate() 						// terminate the engine
```
### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
```
By default the socket is opened just before the first string is sent and by default the **sendString** expects one line of text in response. 

## Sending a request and processing a multiline response. 
 ```requestString(...) ```  accepts an addition parameter representing a test function to determine the end of the response from the server. The call-back function will be applied to each line received from the server. 
 In general the test function shoud be generated automatically using on of the generators available in the module.
 
### Example 
```
te = require(telnet-engine)
en = new te.Engine("rainmaker.wunderground.com",23)
var n = 1
en.requestString("",(s)=>{console.debug(n,">",s);n = n + 1},te.untilNumLines(6)) 
en.terminate()
```
### Output
```
1 > ------------------------------------------------------------------------------
2 > *               Welcome to THE WEATHER UNDERGROUND telnet service!            *
3 > ------------------------------------------------------------------------------
4 > *                                                                            *
5 > *   National Weather Service information provided by Alden Electronics, Inc. *
6 > *    and updated each minute as reports come in over our data feed.          *
```
## Test function generators

The following test function generators are provided by the module. They should cover most uses cases but custom ones can be built (see Reference section). The generators are functions that return a custom test function based on the input parameter.  It is that test function that needs to be passed to the request.

| Generator| Use 
| ------------- |----
|```te.untilString(s)```    |        The last line of the response contains the string s
|```te.untilRegEx(r)```    |        The last line of the response contains the regular expression r
|```untilPrompt(s)```    |          Until the prompt **s** appears in an unterminated response
|```te.untilNumLines(n)```|        The response contains n lines
|```te.untilMilli(t)```    |        The reponse is complete if no message has been received in the last t milliseconds. 
|```te.oneLine()```    |            The response contains one line (default)
|```te.noResponse()```    |            No response expected

if omitted ```te.oneLine()``` is the default.

### Example 
```
en = new te.Engine("rainmaker.wunderground.com",23)
en.requestString(null,(s)=>{console.debug(s)},te.untilPrompt("Press Return to continue:"))
en.requestString("",(s)=>{console.debug(s)},te.untilPrompt("-- "))
en.requestString("NYC",(s)=>{console.debug(s)},te.untilMilli(500))
en.terminate()
```
### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
------------------------------------------------------------------------------
*                                                                            *
*   National Weather Service information provided by Alden Electronics, Inc. *
*    and updated each minute as reports come in over our data feed.          *
*                                                                            *
*   **Note: If you cannot get past this opening screen, you must use a       *
*   different version of the "telnet" program--some of the ones for IBM      *
*   compatible PC's have a bug that prevents proper connection.              *
*                                                                            *
*                                                                            *
------------------------------------------------------------------------------
Press Return to continue:
Press Return for menu
or enter 3 letter forecast city code-- 
Weather Conditions at 09:51 PM EDT on 27 Apr 2020 for New York JFK, NY.
Temp(F)    Humidity(%)    Wind(mph)    Pressure(in)    Weather
========================================================================
  44          76%         NNW at 15       30.06      Mostly Cloudy
Forecast for New York, NY
1003 PM EDT Mon Apr 27 2020
.Tonight...Mostly cloudy with a chance of light rain late this
evening, then partly cloudy after midnight. Lows in the lower
40s. Northwest winds 5 to 10 mph. Chance of rain 30 percent. 
.Tuesday...Sunny. Not as cool with highs in the mid 60s.
Northwest winds 5 to 10 mph. 
.Tuesday night...Partly cloudy. Lows in the upper 40s. Southwest
winds around 5 mph, becoming southeast around 5 mph after
midnight. 
.Wednesday...Mostly cloudy. A slight chance of light rain in the
morning, then a chance of light rain in the afternoon. Highs in
the mid 50s. East winds 10 to 15 mph. Gusts up to 25 mph in the
afternoon. Chance of rain 30 percent. 
.Wednesday night...Cloudy. A chance of showers in the evening,
then showers after midnight. Lows around 50. Southeast winds
15 to 20 mph. Chance of rain 80 percent. 
```
## Requests as Promises

```requestString(...) ```  returns a **Promise** and executes asynchronously. Once the request is completed, that is once the end test is met, the **Promise** is fullfilled. If the request times out, the **Promise** is rejected. The status of the **Promise** can be captured by the **then/catch/finally*** construct.

### Example 
```
te = require("telnet-engine")
en = new te.Engine("rainmaker.wunderground.com",23)
en.requestString(null,(s)=>{console.debug(s)},te.untilPrompt("Press Return to continue:"))
	.then(()=>{console.debug("===== found the prompt")})
	.catch(()=>{console.debug("==== couldn't find the prompt")})
en.requestString("",(s)=>{console.debug(s)},te.untilPrompt("ThisIsNotTheCorrectPrompt"))
	.then(()=>{console.debug("==== found the prompt")})
	.then(()=>{en.requestString("NYC",(s)=>{console.debug(s)},te.untilMilli(500))})
	.catch(()=>{console.debug("==== couldn't find the prompt")})
	.finally(()=>{console.debug("==== finished")})
	en.terminate()
```

### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
* ------------------------------------------------------------------------------
...
*                                                                             *
------------------------------------------------------------------------------
Press Return to continue:
===== found the prompt
Press Return for menu
==== couldn't find the prompt
==== finished
```
## Timing of execution (part 1)

The Engine queues commands (see Reference for exceptions) and processes them sequentially in the order received. The Engine also waits until a request to the server is fullfiled before sending the next one. Code containing a succession of requests as in the previous example will execute without problem; even is the program includes multiple sequences in different parts of the program. Each sequence will be executed from end to end uninterrupted.

```requestString(...) ``` as well as the most of Engine methods return Promises and execute Asynchronously

## Conditional execution

There will be many situations in which the output of one **Request** will determine the content of the next one.
A useful feature in such cases is the fact that the text argument of a request can be replaced by a function that returns a string. The function will be calculated just before the **Engine** sends the line of the text to the server.

### Example 
```
te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
en.requestString(null,(s)=>{console.log(s)},te.untilPrompt("Press Return to continue:"))
en.requestString("",(s)=>{console.log(s)},te.untilPrompt("-- "))
var lineNumber
//f1 stores the number at the begining of the line for Canada
f1= (s)=>{console.log(s);if(s.includes("Canad")){lineNumber = /\d+/.exec(s)[0]}} 
lineNumber = 236    //this line has not effect (See explanation here under)
en.requestString("",f1,te.untilMilli(100))
//f2 returns the value stored
f2= ()=>{return lineNumber}
en.requestString(f2,console.log,te.untilMilli(100))
en.terminate()
```
It is important to keep in mind that this entire block of code will executed first and the **Request**s as well as f1 and f2 will be executed later. This is why the the line ```lineNumber = 236 ```has not effect, the value 236 is overwritten later when f1 is executed. 

### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
------------------------------------------------------------------------------
*                                                                            *
...
*                                                                            *
*                                      *
------------------------------------------------------------------------------
Press Return to continue:
Press Return for menu
or enter 3 letter forecast city code-- 
                 WEATHER UNDERGROUND MAIN MENU
                ******************************
                 1) U.S. forecasts and climate data
                 2) Canadian forecasts
                 3) Current weather observations
                 4) Ski conditions
                 5) Long-range forecasts
                 6) Latest earthquake reports
                 7) Severe weather
                 8) Hurricane advisories
                 9) Weather summary for the past month
                10) International data
                11) Marine forecasts and observations
                12) Ultraviolet light forecast
                 X) Exit program
                 C) Change scrolling to screen
                 H) Help and information for new users
                 ?) Answers to all your questions
                   Selection:
                          CANADIAN FORECASTS
        --------------------------------------------------------
       1) Southern Alberta             12) Southern Ontario
       2) Northern Alberta             13) Northern Ontario
       3) Coastal British Columbia     14) Northwest Ontario
       4) Interior British Columbia    15) Southern Saskatchewan
       5) Southern Manitoba            16) Northern Saskatchewan
       6) Northern Manitoba            17) Yukon
       7) Nova Scotia                  18) Western Quebec
       8) Prince Edward Island         19) Central Quebec
       9) New Brunswick                20) Northwest Territories
      10) Labrador                     21) Ottawa, SE Ontario
      11) Newfoundland
       M) Return to main menu
       X) Exit program
```

### Promise chaining

Promise chaining is an other way to manage conditional execution and it allows for much more complicated chains of requests and truly conditional execution. A  reminder, most **Engine** method return a **Promise** that is resolved once the request is fullfilled. If the content of a request determines what type of request must follow, promise chaining can be the solution. This approach allows to delay put a Request on the Engine execution queue until a previous request is fullfilled. 

### Example 
In this example, we ask for the weather report in NYC and then either the report for MIA or BOS depending on whether the temperature in NYC is an odd or even number.
```
te = require("./telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)
var temp
f1= (s)=>{console.log(s)
/temp will capture the first set of digit at the begining of a line
if(! temp) {
	temp = /(?:^\s*)(\d+)/.exec(s)
	temp = temp ? temp[1] : 0}
	}

en.requestString(null,(s)=>{console.log(s)},te.untilPrompt("Press Return to continue:"))
en.requestString("",(s)=>{console.log(s)},te.untilPrompt("-- "))
en.requestString("NYC",f1,te.untilPrompt("exit:"))  //capture the digit of the temperature
en.requestString("",console.log,te.untilPrompt("menu:"))
en.requestString("",console.log,te.untilMilli(100))
	.then(()=>{if(temp % 2 == 0){return en.requestString("MIA",console.log,te.untilMilli(100))}
		else {return en.requestString("BOS",console.log,te.untilMilli(100))}})
	.catch(()=>{console.log("Something went wrong")})
	.finally(()=>{en.terminate();console.log("The temperature in NYC is",temp,"F")}
```

### Output
```
------------------------------------------------------------------------------
*               Welcome to THE WEATHER UNDERGROUND telnet service!            *
------------------------------------------------------------------------------
*                                                                            *
...
*                                       *
------------------------------------------------------------------------------
Press Return to continue:
Press Return for menu
or enter 3 letter forecast city code-- 
Weather Conditions at 03:51 PM EDT on 30 Apr 2020 for New York JFK, NY.
Temp(F)    Humidity(%)    Wind(mph)    Pressure(in)    Weather
========================================================================
  57          87%         SE at 29       29.95      Overcast
Forecast for New York, NY
328 PM EDT Thu Apr 30 2020
...Wind Advisory in effect until 8 PM EDT this evening...
.Tonight...Rain. Rain may be heavy at times. Windy with lows in
the lower 50s. Southeast winds 20 to 30 mph. Gusts up to 45 mph,
...
then partly cloudy after midnight. Lows in the lower 50s.
Northwest winds 15 to 20 mph. Chance of rain 50 percent. 
.Saturday...Mostly sunny. Highs around 70. Northwest winds 15 to
20 mph. 
   Press Return to continue, M to return to menu, X to exit: .Saturday night...Partly cloudy. Lows in the mid 50s. Northwest
winds 5 to 10 mph. 
.Sunday...Partly sunny. Highs in the upper 60s. 
...
.Wednesday...Mostly sunny. Highs around 60. 
.Wednesday night...Mostly cloudy. Lows in the mid 40s. 
.Thursday...Mostly sunny. Highs in the lower 60s. 
  Press Return for menu:
 
                         CITY FORECAST MENU
                ---------------------------------------------------
                1) Print forecast for selected city
                2) Print climatic data for selected city
                3) Display 3-letter city codes for a selected state
                4) Display all 2-letter state codes
                M) Return to main menu
                X) Exit program
                ?) Help
                   Selection:Weather Conditions at 03:54 PM EDT on 30 Apr 2020 for Boston, MA.
Temp(F)    Humidity(%)    Wind(mph)    Pressure(in)    Weather
========================================================================
  48          80%         ESE at 20       30.22      Overcast
Forecast for Boston, MA
415 PM EDT Thu Apr 30 2020
.Tonight...Cloudy. A chance of showers after midnight. Patchy fog
after midnight. Near steady temperature in the upper 40s.
Southeast winds 10 to 15 mph with gusts up to 25 mph. Chance of
rain 50 percent. 
.Friday...Showers, mainly in the morning. Patchy fog in the
...
Highs in the mid 60s. Northwest winds 10 to 15 mph with gusts up
to 30 mph. 
The temperature in NYC is 57 F
```
### Watch out!

The order of execution is a little tricky and it is easy to make an error.  It is important to remember the rules:
- Engine methods place commands on the FIFO Engine queue .
- The commands are executed asynchrnously at a later time in the order they were placed in the queue.
- The "first level" of JS code is executed sequentually first.
- The code placed within a **then()**  is executed later.
- If a  **then()**  code includes a call to an Engine methods, the corresponding command will be placed at the end of the end of the execeution queue. 

Here are two easy errors
#### First easy error
```
en.requestString(null,(s)=>{console.log(s)},te.untilPrompt("Press Return to continue:"))
en.requestString("",(s)=>{console.log(s)},te.untilPrompt("-- "))
en.requestString("NYC",f1,te.untilPrompt("exit:"))  //capture the digit of the temperature
en.requestString("",console.log,te.untilPrompt("menu:"))
en.requestString("",console.log,te.untilMilli(100))
if(temp % 2 == 0){en.requestString("MIA",console.log,te.untilMilli(100))}
else  {en.requestString("BOS",console.log,te.untilMilli(100)}
en.terminate()
```
The "first level of code" is executed placing the immedidate requests in the queue at that time   the ```if(temp % 2 == 0)``` clause is alos executed but it is before any request is actually executed so the value of **temp** is indeterminate. the concludion is that **Any logical branching dependant on the result of a request needs to be inserted in a then() construct***

####  Second easy error

```
en.requestString("",console.log,te.untilMilli(100))
	.then(()=>{if(temp % 2 == 0){return en.requestString("MIA",console.log,te.untilMilli(100))}
		else {return en.requestString("BOS",console.log,te.untilMilli(100))}})
	.catch(()=>{console.log("Something went wrong")})
en.terminate()
```
When this code is executed, the ```en.requestString("",console.log,te.untilMilli(100))``` enters the request on the engine queue, then ```en.terminate()``` is put in the queue. It is only at a later time that ```then(...)``` is exceuted and the conditonal request is put on the queue (behind the ```en.terminate()``` ) . As  result, the engine will be terminated before the contingent request is executed. In general **once  a promise chain is started, all subsequent engine command need to be added to the chain***

## Proxies

The use of **Promise** chains can solve many complex situations, however it will lead to unpredicatable results if the same Engine is used asynchrioously in different parts of a program. In such a case, **then(...)** segments from different parts of the program might be interleaved resulting in commands from different parts being mixed in the queue with unpredictiable results. 

One possible solution is to open several simultaneous connections with several instances of **Engine**s or to use semaphores to lock and release access. 

The module has a built in mechanism to guarantee exclusive access to the Engine to one part of program, while queueing any request from another part. It is based on the use of **Proxies**. **Proxies** are "copies" of an existing engine. When a proxy is created, the queue of its parent Engine is frozen, the **Proxy** has its own queue which is active while any command to the parent is accepted but queued. When the  **Proxy** release the parent, all the queued command are executed in the order received. 
### Example 

The followinf example will query the server for the weather in **MIA** first and then **NYC** even though the requests for **NYC** are entered first. 
```
te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com",23)

en.requestString(null,console.log,te.untilPrompt("Press Return to continue:"))
en.requestString("",console.log,te.untilPrompt("-- "))
//the following line creates a proxy and freezes the queue of en
var px = en.proxy()
//the following commands are queued by en
en.requestString("NYC",console.log,te.untilPrompt("exit:"))
en.requestString("",console.log,te.untilPrompt("menu:"))
en.requestString("",console.log,te.untilMilli(100))
en.terminate()
//the following commands are queued by px and executed in order
px.requestString("MIA",console.log,te.untilPrompt("exit:"))
px.requestString("",console.log,te.untilPrompt("menu:"))
px.requestString("",console.log,te.untilMilli(100))px.release()
//this lines disables the proxy px and releases the queue of en
px.release()
```
### Details

The **proxy()** method creates the proxy immediatly but the queue of the proxy remains is not started until all previously queued command in the parent's queue are completed.  In practice, the code that starts the queue of the **Proxy** is places in the queue of the parent **Engine** and needs to makes its way to the from the queue before it is executed. In the mean time, commands are queue by the **Proxy**.

The **release()** method reactivates the queue of the parent but not until all previously queued command in the proxy's queue are completed. In practice the **release()** commands places the order to release the queue of its parent in its own queue.

Also, also a **Proxy** exposes the properties of its parent **Engine** but any change made to those properties made thru the proxy are reverted when the **Proxy** releases its parent. This feature can be usefull if a server has different programs or modes of operation using different line terminator, prompt or perhaps timing of response. 

It is allowed to create a **Proxy** of a **Proxy**

Creating  multiple  **Proxies** of a **Engine** is possible. When a second **Proxy** of an **Engine** is created, the queue of the second **Proxy** will remain inactive until the parent **Engine** queue is release by the first **Proxy** and all commands that were queued by the parent before the creation of the second **Proxy** are fufilled. This is just a consequence that the command to start the queue of a proxy is placed on the queue of its parent.

Once a **Proxy** releases its parent, it is disable and should not be uses anymore. 

The **proxy()** methods takes n optional a timeout parameter; when the timeout expires, the **Proxy** automatically releases its parent and becomes disabled.  All pending command in its queue are cancelled.  This is a safety mecanism in the unlikely yet possible event ofa hanged queue 


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
