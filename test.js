var te = require("telnet-engine")
var en = new te.Engine("rainmaker.wunderground.com", 23)
en.requestString(null, te.untilPrompt("Press Return to continue:"))        //nothing one with the response
en.requestString("", te.untilPrompt("-- "), console.log)                 //prints every line
en.requestString("NYC", te.untilMilli(500), (s) => { console.log(s.slice(0, 10)) })    //prints 10 characters of every line
en.terminate()