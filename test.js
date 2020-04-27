te = require("telnet-engine")
console.debug(te)
rp = require("repeatable-promise")
en = new te.Engine("telehack.com", 23) //establishes the communication
//en.truc()
en.inDelimiter = /\r\n/ //.|\r\n/
en.outDelimiter = "\r\n"
//ls = en.listenString((s) => { console.debug(">", s) })
de = rp.Delay(5000)
de.then(() => {
   // en.sendString("eliza")
})
console.debug("et alors…")